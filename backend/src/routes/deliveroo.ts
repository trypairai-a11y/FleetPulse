import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { sendXlsx } from "../utils/xlsxExport";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── Drivers Summary ────────────────────────────────────────────────────────

router.get("/drivers/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { companyId } = req.query;
    const where: any = { tenantId, platform: "DELIVEROO" };
    if (companyId) where.companyId = companyId;

    const [total, active, inactive, suspended] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "SUSPENDED" } }),
    ]);

    res.json({ total, active, inactive, suspended });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders + Cash Summary ──────────────────────────────────────────────────

router.get("/orders/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo } = req.query;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const start = dateFrom ? new Date(dateFrom as string) : sevenDaysAgo;
    const end = dateTo ? new Date(dateTo as string) : now;

    const [orderAgg, cashAgg, orderCount] = await Promise.all([
      prisma.orderLog.aggregate({
        where: { tenantId, platform: "DELIVEROO", date: { gte: start, lte: end } },
        _sum: { orderCount: true, totalAmount: true },
      }),
      prisma.cashRecord.aggregate({
        where: { tenantId, date: { gte: start, lte: end }, driver: { platform: "DELIVEROO" } },
        _sum: { salesAmount: true, collectionAmount: true, pendingDues: true },
      }),
      prisma.orderLog.count({
        where: { tenantId, platform: "DELIVEROO", date: { gte: start, lte: end } },
      }),
    ]);

    res.json({
      totalOrders: orderAgg._sum.orderCount || 0,
      totalRevenue: Number(orderAgg._sum.totalAmount || 0),
      totalCashCollected: Number(cashAgg._sum?.collectionAmount || 0),
      totalCashDeposited: Number(cashAgg._sum?.salesAmount || 0),
      pendingCash: Number(cashAgg._sum?.pendingDues || 0),
      recordCount: orderCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders List ────────────────────────────────────────────────────────────

router.get("/orders", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo, driverId } = req.query;
    const where: any = { tenantId, platform: "DELIVEROO" };
    if (driverId) where.driverId = driverId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.orderLog.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.orderLog.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cash Records ───────────────────────────────────────────────────────────

router.get("/cash", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo, driverId } = req.query;
    const where: any = { tenantId, driver: { platform: "DELIVEROO" as const } };
    if (driverId) where.driverId = driverId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.cashRecord.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.cashRecord.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Shifts Summary ─────────────────────────────────────────────────────────

router.get("/shifts/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [total, completed, missed, inProgress] = await Promise.all([
      prisma.shift.count({ where: { tenantId, platform: "DELIVEROO", date: { gte: startOfDay, lte: endOfDay } } }),
      prisma.shift.count({ where: { tenantId, platform: "DELIVEROO", date: { gte: startOfDay, lte: endOfDay }, status: "COMPLETED" } }),
      prisma.shift.count({ where: { tenantId, platform: "DELIVEROO", date: { gte: startOfDay, lte: endOfDay }, status: "MISSED" } }),
      prisma.shift.count({ where: { tenantId, platform: "DELIVEROO", date: { gte: startOfDay, lte: endOfDay }, status: "IN_PROGRESS" } }),
    ]);

    res.json({ total, completed, missed, inProgress, booked: total - completed - missed - inProgress });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Performance Dashboard ──────────────────────────────────────────────────

router.get("/performance", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      activeDrivers,
      totalOrders,
      avgShift,
      attendanceRecords,
    ] = await Promise.all([
      prisma.driver.count({ where: { tenantId, platform: "DELIVEROO", status: "ACTIVE" } }),
      prisma.orderLog.aggregate({
        where: { tenantId, platform: "DELIVEROO", date: { gte: sevenDaysAgo } },
        _sum: { orderCount: true },
      }),
      prisma.shift.aggregate({
        where: { tenantId, platform: "DELIVEROO", date: { gte: sevenDaysAgo }, status: "COMPLETED" },
        _avg: { actualHoursMinutes: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { tenantId, date: { gte: sevenDaysAgo }, driver: { platform: "DELIVEROO" } },
        select: { status: true },
      }),
    ]);

    const presentCount = attendanceRecords.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const attendanceRate = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0;

    res.json({
      activeDrivers,
      totalOrdersWeek: totalOrders._sum.orderCount || 0,
      avgOrdersPerDriverPerDay: activeDrivers > 0
        ? Math.round(((totalOrders._sum.orderCount || 0) / (activeDrivers * 7)) * 10) / 10
        : 0,
      avgShiftHours: avgShift._avg.actualHoursMinutes
        ? Math.round((Number(avgShift._avg.actualHoursMinutes) / 60) * 10) / 10
        : 0,
      attendanceRate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Export ─────────────────────────────────────────────────────────────────

router.get("/export/orders", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo } = req.query;
    const where: any = { tenantId, platform: "DELIVEROO" };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const orders = await prisma.orderLog.findMany({
      where,
      take: 5000,
      orderBy: { date: "desc" },
      include: { driver: { select: { name: true, platformDriverId: true } } },
    });

    const rows = orders.map((o) => ({
      Date: new Date(o.date).toLocaleDateString(),
      "Driver Name": o.driver.name,
      "Driver ID": o.driver.platformDriverId || "",
      "Order Count": o.orderCount,
      "Total Amount": Number(o.totalAmount),
    }));

    sendXlsx(res, rows, "Deliveroo Orders", "deliveroo-orders.xlsx");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
