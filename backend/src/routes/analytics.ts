import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── Fleet Overview ─────────────────────────────────────────────────────────

router.get("/fleet-overview", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel queries
    const [
      totalDrivers,
      activeDrivers,
      driversByPlatform,
      ordersTodayByPlatform,
      ordersWeekByPlatform,
      cashLedgers,
      activeAlerts,
      criticalAlerts,
    ] = await Promise.all([
      // Total drivers
      prisma.driver.count({ where: { tenantId } }),

      // Active drivers (status ACTIVE)
      prisma.driver.count({ where: { tenantId, status: "ACTIVE" } }),

      // Drivers grouped by platform
      prisma.driver.groupBy({
        by: ["platform"],
        where: { tenantId, status: "ACTIVE" },
        _count: { id: true },
      }),

      // Orders today by platform
      prisma.orderLog.groupBy({
        by: ["platform"],
        where: { tenantId, date: { gte: startOfToday, lte: endOfToday } },
        _sum: { orderCount: true },
      }),

      // Orders this week by platform
      prisma.orderLog.groupBy({
        by: ["platform"],
        where: { tenantId, date: { gte: sevenDaysAgo, lte: endOfToday } },
        _sum: { orderCount: true },
      }),

      // Cash pending — current month ledgers
      prisma.pendingDuesLedger.aggregate({
        where: { tenantId, month: { gte: currentMonth }, status: "OPEN" },
        _sum: { closingBalance: true },
        _count: { id: true },
      }),

      // Active alerts
      prisma.alert.count({ where: { tenantId, status: "ACTIVE" } }),

      // Critical alerts
      prisma.alert.count({ where: { tenantId, status: "ACTIVE", severity: "CRITICAL" } }),
    ]);

    // Build platform breakdown
    const platforms: Array<"KEETA" | "TALABAT" | "DELIVEROO" | "AMERICANA"> = [
      "KEETA", "TALABAT", "DELIVEROO", "AMERICANA",
    ];

    const driverMap: Record<string, number> = {};
    for (const g of driversByPlatform) {
      driverMap[g.platform] = g._count.id;
    }
    const ordersTodayMap: Record<string, number> = {};
    for (const g of ordersTodayByPlatform) {
      ordersTodayMap[g.platform] = g._sum.orderCount || 0;
    }
    const ordersWeekMap: Record<string, number> = {};
    for (const g of ordersWeekByPlatform) {
      ordersWeekMap[g.platform] = g._sum.orderCount || 0;
    }

    const platformBreakdown = platforms.map((p) => {
      const drivers = driverMap[p] || 0;
      const ordersToday = ordersTodayMap[p] || 0;
      const ordersWeek = ordersWeekMap[p] || 0;
      return {
        platform: p,
        drivers,
        ordersToday,
        ordersWeek,
        avgOrdersPerDriver: drivers > 0 ? Math.round((ordersToday / drivers) * 10) / 10 : 0,
        activeRate: drivers > 0 ? 1 : 0, // all counted drivers are ACTIVE
      };
    });

    const totalOrdersToday = platformBreakdown.reduce((s, p) => s + p.ordersToday, 0);
    const totalOrdersThisWeek = platformBreakdown.reduce((s, p) => s + p.ordersWeek, 0);

    // Compliance score: percentage of drivers without active alerts
    const driversWithAlerts = await prisma.alert.groupBy({
      by: ["driverId"],
      where: { tenantId, status: "ACTIVE", driverId: { not: null } },
    });
    const complianceScore = activeDrivers > 0
      ? Math.round(((activeDrivers - driversWithAlerts.length) / activeDrivers) * 100)
      : 100;

    res.json({
      totalDrivers,
      activeDrivers,
      totalOrdersToday,
      totalOrdersThisWeek,
      platformBreakdown,
      cashPending: {
        total: Number(cashLedgers._sum.closingBalance || 0),
        overdue: cashLedgers._count.id,
      },
      complianceScore,
      alerts: {
        active: activeAlerts,
        critical: criticalAlerts,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Platform Comparison ────────────────────────────────────────────────────

router.get("/platform-comparison", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const platforms: Array<"KEETA" | "TALABAT" | "DELIVEROO" | "AMERICANA"> = [
      "KEETA", "TALABAT", "DELIVEROO", "AMERICANA",
    ];

    const comparison = await Promise.all(
      platforms.map(async (platform) => {
        const [
          driverCount,
          orderAgg,
          attendanceRecords,
          shiftAgg,
        ] = await Promise.all([
          // Active driver count for this platform
          prisma.driver.count({
            where: { tenantId, platform, status: "ACTIVE" },
          }),

          // Order aggregates for last 7 days
          prisma.orderLog.aggregate({
            where: {
              tenantId,
              platform,
              date: { gte: sevenDaysAgo },
            },
            _sum: { orderCount: true, totalAmount: true },
            _count: { id: true },
          }),

          // Attendance in last 7 days
          prisma.attendanceRecord.findMany({
            where: {
              tenantId,
              date: { gte: sevenDaysAgo },
              driver: { platform },
            },
            select: { status: true },
          }),

          // Shift hours last 7 days
          prisma.shift.aggregate({
            where: {
              tenantId,
              platform,
              date: { gte: sevenDaysAgo },
              status: "COMPLETED",
            },
            _avg: { actualHoursMinutes: true },
            _count: { id: true },
          }),
        ]);

        const totalOrders = orderAgg._sum.orderCount || 0;
        const totalRevenue = Number(orderAgg._sum.totalAmount || 0);
        const orderLogCount = orderAgg._count.id || 0;

        const ordersPerDriverPerDay = driverCount > 0
          ? Math.round((totalOrders / (driverCount * 7)) * 10) / 10
          : 0;

        const revenuePerOrder = totalOrders > 0
          ? Math.round((totalRevenue / totalOrders) * 100) / 100
          : 0;

        // Attendance rate
        const totalAttendance = attendanceRecords.length;
        const presentCount = attendanceRecords.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length;
        const attendanceRate = totalAttendance > 0
          ? Math.round((presentCount / totalAttendance) * 100)
          : 0;

        // Average shift hours (stored in minutes)
        const avgShiftHours = shiftAgg._avg.actualHoursMinutes
          ? Math.round((Number(shiftAgg._avg.actualHoursMinutes) / 60) * 10) / 10
          : 0;

        // Compliance rate: drivers without active alerts / total drivers
        const platformDriverIds = (await prisma.driver.findMany({
          where: { tenantId, platform, status: "ACTIVE" },
          select: { id: true },
        })).map((d) => d.id);

        const driversWithAlerts = await prisma.alert.groupBy({
          by: ["driverId"],
          where: {
            tenantId,
            status: "ACTIVE",
            driverId: { in: platformDriverIds },
          },
        });
        const complianceRate = driverCount > 0
          ? Math.round(((driverCount - driversWithAlerts.length) / driverCount) * 100)
          : 100;

        return {
          platform,
          drivers: driverCount,
          ordersPerDriverPerDay,
          revenuePerOrder,
          complianceRate,
          attendanceRate,
          avgShiftHours,
        };
      })
    );

    res.json(comparison);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Top Performers ─────────────────────────────────────────────────────────

router.get("/top-performers", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get the most recent AI score per driver, ordered by composite score desc, top 10
    const scores = await prisma.aiScore.findMany({
      where: { tenantId },
      orderBy: [{ date: "desc" }, { compositeScore: "desc" }],
      distinct: ["driverId"],
      take: 10,
      include: {
        driver: { select: { id: true, name: true, platform: true } },
      },
    });

    // Sort by compositeScore descending after distinct
    scores.sort((a, b) => b.compositeScore - a.compositeScore);

    const topPerformers = scores.slice(0, 10).map((s, i) => ({
      rank: i + 1,
      driverId: s.driverId,
      name: s.driver.name,
      platform: s.driver.platform,
      compositeScore: s.compositeScore,
      attendanceScore: s.attendanceScore,
      deliveryScore: s.deliveryScore,
      financialScore: s.financialScore,
      trend: s.trend,
      date: s.date,
    }));

    res.json(topPerformers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Driver Scores (paginated) ──────────────────────────────────────────────

router.get("/driver-scores", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { skip, limit, page } = getPagination(req);
    const { platform } = req.query;

    // Build driver filter
    const driverWhere: any = { tenantId };
    if (platform) driverWhere.platform = platform;

    // Get all driver IDs matching the filter
    const drivers = await prisma.driver.findMany({
      where: driverWhere,
      select: { id: true },
    });
    const driverIds = drivers.map((d) => d.id);

    // Most recent AI score per driver
    const scores = await prisma.aiScore.findMany({
      where: { tenantId, driverId: { in: driverIds } },
      orderBy: { date: "desc" },
      distinct: ["driverId"],
      include: {
        driver: { select: { id: true, name: true, platform: true, status: true } },
      },
    });

    // Sort by compositeScore desc and paginate
    scores.sort((a, b) => b.compositeScore - a.compositeScore);
    const total = scores.length;
    const paginated = scores.slice(skip, skip + limit);

    res.json(paginatedResponse(paginated, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
