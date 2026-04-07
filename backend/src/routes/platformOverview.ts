import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET /api/platform-overview/:platform
router.get("/:platform", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = req.params.platform.toUpperCase() as any;
    const companyId = req.query.companyId as string | undefined;

    // Today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const driverWhere: any = { tenantId, platform, status: "ACTIVE" };
    if (companyId) driverWhere.companyId = companyId;

    // Fetch drivers with today's data in parallel
    const [drivers, todayOrders, todayCash, todayAttendance, todayViolations, recentAlerts] = await Promise.all([
      // All active drivers for this platform
      prisma.driver.findMany({
        where: driverWhere,
        select: {
          id: true, name: true, phone: true, utr: true, batchNumber: true, zone: true, status: true,
          companyId: true, company: { select: { name: true } },
          aiScores: {
            orderBy: { date: "desc" },
            take: 1,
            select: { compositeScore: true, trend: true, date: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      // Today's orders
      prisma.orderLog.findMany({
        where: { tenantId, platform, date: { gte: todayStart, lt: todayEnd }, ...(companyId ? { driver: { companyId } } : {}) },
        select: { driverId: true, orderCount: true, cashCollected: true, tips: true, totalAmount: true },
      }),
      // Today's cash records
      prisma.cashRecord.findMany({
        where: { tenantId, date: { gte: todayStart, lt: todayEnd }, ...(companyId ? { driver: { companyId, platform } } : { driver: { platform } }) },
        select: { driverId: true, salesAmount: true, collectionAmount: true, status: true, pendingDues: true },
      }),
      // Today's attendance
      prisma.attendanceRecord.findMany({
        where: { tenantId, date: { gte: todayStart, lt: todayEnd }, ...(companyId ? { driver: { companyId, platform } } : { driver: { platform } }) },
        select: { driverId: true, status: true, lateMinutes: true },
      }),
      // Today's violations (Talabat compliance events)
      platform === "TALABAT"
        ? prisma.talabatComplianceEvent.findMany({
            where: { tenantId, createdAt: { gte: todayStart, lt: todayEnd }, ...(companyId ? { driver: { companyId } } : {}) },
            select: { id: true, driverId: true, type: true, description: true, resolved: true, driver: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      // Recent alerts
      prisma.alert.findMany({
        where: { tenantId, status: "ACTIVE", ...(companyId ? { driver: { companyId, platform } } : { driver: { platform } }) },
        select: { id: true, type: true, severity: true, title: true, message: true, driverId: true, driver: { select: { name: true } }, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Build per-driver order/cash maps
    const ordersByDriver = new Map<string, { orders: number; cash: number; tips: number }>();
    for (const o of todayOrders) {
      const existing = ordersByDriver.get(o.driverId) || { orders: 0, cash: 0, tips: 0 };
      existing.orders += o.orderCount;
      existing.cash += Number(o.cashCollected || 0);
      existing.tips += Number(o.tips || 0);
      ordersByDriver.set(o.driverId, existing);
    }

    const cashByDriver = new Map<string, { sales: number; collected: number; pending: number }>();
    for (const c of todayCash) {
      const existing = cashByDriver.get(c.driverId) || { sales: 0, collected: 0, pending: 0 };
      existing.sales += Number(c.salesAmount);
      existing.collected += Number(c.collectionAmount);
      existing.pending += Number(c.pendingDues);
      cashByDriver.set(c.driverId, existing);
    }

    const attendanceByDriver = new Map<string, string>();
    for (const a of todayAttendance) {
      attendanceByDriver.set(a.driverId, a.status);
    }

    // Build driver rows with all data
    const driverRows = drivers.map((d) => {
      const orderData = ordersByDriver.get(d.id) || { orders: 0, cash: 0, tips: 0 };
      const cashData = cashByDriver.get(d.id) || { sales: 0, collected: 0, pending: 0 };
      const attendance = attendanceByDriver.get(d.id) || null;
      const latestScore = d.aiScores[0] || null;

      return {
        id: d.id,
        name: d.name,
        phone: d.phone,
        utr: d.utr,
        batchNumber: d.batchNumber,
        zone: d.zone,
        company: d.company.name,
        companyId: d.companyId,
        darbGrade: latestScore?.compositeScore || null,
        gradeTrend: latestScore?.trend || null,
        todayOrders: orderData.orders,
        todayCash: orderData.cash,
        todayTips: orderData.tips,
        cashCollected: cashData.collected,
        cashPending: cashData.pending,
        cashSales: cashData.sales,
        attendance,
      };
    });

    // Sort by Darb grade descending (ranking)
    driverRows.sort((a, b) => (b.darbGrade || 0) - (a.darbGrade || 0));

    // Assign ranks
    driverRows.forEach((d, i) => (d as any).rank = i + 1);

    // Summary stats
    const totalOrders = driverRows.reduce((sum, d) => sum + d.todayOrders, 0);
    const totalCashCollected = driverRows.reduce((sum, d) => sum + d.cashCollected, 0);
    const totalCashPending = driverRows.reduce((sum, d) => sum + d.cashPending, 0);
    const totalCashSales = driverRows.reduce((sum, d) => sum + d.cashSales, 0);
    const presentCount = driverRows.filter((d) => d.attendance === "PRESENT").length;
    const lateCount = driverRows.filter((d) => d.attendance === "LATE").length;
    const absentCount = driverRows.filter((d) => d.attendance === "ABSENT").length;
    const activeViolations = (todayViolations as any[]).filter((v) => !v.resolved).length;

    res.json({
      drivers: driverRows,
      summary: {
        totalDrivers: drivers.length,
        totalOrders,
        totalCashCollected: Math.round(totalCashCollected * 1000) / 1000,
        totalCashPending: Math.round(totalCashPending * 1000) / 1000,
        totalCashSales: Math.round(totalCashSales * 1000) / 1000,
        presentCount,
        lateCount,
        absentCount,
        activeViolations,
      },
      violations: todayViolations,
      alerts: recentAlerts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
