import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { sendXlsx } from "../utils/xlsxExport";
import { validateBody, createDriverSchema } from "../utils/validate";
import { rbac } from "../middleware/rbac";
import { resolveDriverDateRange, batchLoadDriverStats, resolveTalabatStatus } from "../services/driverService";

const router = Router();
router.use(authMiddleware, tenantScope);

const MUTATORS = ["ADMIN", "OPS_MANAGER", "SUPERVISOR"];
const DESTRUCTIVE = ["ADMIN", "OPS_MANAGER"];

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     tags: [Drivers]
 *     summary: List all drivers with today's performance data
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [TALABAT, KEETA, DELIVEROO, AMERICANA] }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated driver list with performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Driver' }
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { platform, status, companyId, zone, batchNumber, search } = req.query;

    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (status) {
      const vals = (status as string).split(",").filter(Boolean);
      where.status = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (companyId) {
      const ids = (companyId as string).split(",").filter(Boolean);
      where.companyId = ids.length === 1 ? ids[0] : { in: ids };
    }
    if (zone) {
      const vals = (zone as string).split(",").filter(Boolean);
      where.zone = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (batchNumber) {
      const vals = (batchNumber as string).split(",").filter(Boolean);
      where.batchNumber = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { platformDriverId: { contains: search as string, mode: "insensitive" } },

        { phone: { contains: search as string } },
      ];
    }

    const dateRange = await resolveDriverDateRange(tenantId, req.query.date as string | undefined);

    const [data, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true, platform: true } },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    // Batch-load performance stats for all drivers in one pass (4 queries total, not 4*N)
    const driverIds = data.map((d) => d.id);
    const statsMap = await batchLoadDriverStats(tenantId, driverIds, dateRange);

    const enriched = data.map((d) => {
      const stats = statsMap.get(d.id);
      const talabatStatus = resolveTalabatStatus(d.status, d.platform, stats?.talabatStatus);
      return {
        ...d,
        dailyOrders: stats?.dailyOrders ?? 0,
        totalSales: stats?.totalSales ?? null,
        cashCollected: stats?.cashCollected ?? null,
        cashDeposited: stats?.cashDeposited ?? null,
        uti: stats?.uti ?? 0,
        workingHours: stats?.workingHours ?? null,
        talabatStatus,
      };
    });

    res.json(paginatedResponse(enriched, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, companyId } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (companyId) {
      const ids = (companyId as string).split(",").filter(Boolean);
      where.companyId = ids.length === 1 ? ids[0] : { in: ids };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const sessionWhere: any = { tenantId, date: { gte: startOfToday, lte: endOfToday } };
    if (platform) sessionWhere.driver = { platform };
    if (companyId) {
      const ids = (companyId as string).split(",").filter(Boolean);
      sessionWhere.driver = { ...sessionWhere.driver, companyId: ids.length === 1 ? ids[0] : { in: ids } };
    }

    const [total, active, inactive, suspended, drivers, todaySessions] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "SUSPENDED" } }),
      prisma.driver.findMany({
        where,
        select: {
          healthCertStatus: true, workPermitStatus: true, foodHandlingCertStatus: true,
          vehicleRegStatus: true, vehicleInsuranceStatus: true, drivingLicenseStatus: true, civilIdStatus: true,
        },
      }),
      prisma.talabatSession.findMany({
        where: sessionWhere,
        select: { deliveries: true, actualHours: true },
      }),
    ]);

    let docsExpiring = 0;
    let docsMissing = 0;
    const docFields = ["healthCertStatus", "workPermitStatus", "foodHandlingCertStatus", "vehicleRegStatus", "vehicleInsuranceStatus", "drivingLicenseStatus", "civilIdStatus"] as const;
    const expiringDrivers = new Set<number>();
    const missingDrivers = new Set<number>();
    drivers.forEach((d, idx) => {
      for (const f of docFields) {
        const s = (d as any)[f];
        if (s === "EXPIRING" || s === "EXPIRED") expiringDrivers.add(idx);
        if (!s || s === "MISSING") missingDrivers.add(idx);
      }
    });
    docsExpiring = expiringDrivers.size;
    docsMissing = missingDrivers.size;

    // Calculate today's orders and avg UTR
    let totalOrdersToday = 0;
    let totalHoursToday = 0;
    for (const s of todaySessions) {
      totalOrdersToday += s.deliveries || 0;
      totalHoursToday += Number(s.actualHours || 0);
    }
    const avgUtrToday = totalHoursToday > 0
      ? Math.round((totalOrdersToday / totalHoursToday) * 10) / 10
      : 0;

    res.json({ total, active, inactive, suspended, docsExpiring, docsMissing, avgUtrToday, totalOrdersToday });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, status, companyId } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const drivers = await prisma.driver.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    });

    const rows = drivers.map((d) => ({
      Name: d.name,
      Platform: d.platform,
      "Platform ID": d.platformDriverId || "",
      Status: d.status,
      Phone: d.phone || "",
      Zone: d.zone || "",
      "Vehicle Type": d.vehicleType || "",
      Company: d.company?.name || "",
      "Hire Date": d.hireDate ? new Date(d.hireDate).toLocaleDateString() : "",
    }));

    sendXlsx(res, rows, "Drivers", "drivers-report.xlsx");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const driverId = req.params.id;

    // Verify driver belongs to tenant
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId },
    });
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sessionsThisMonth, sessionStats, pendingCash, violationEvents, keetaMetrics, keetaSessionCount] = await Promise.all([
      // Sessions this month
      prisma.talabatSession.count({
        where: { driverId, tenantId, date: { gte: startOfMonth } },
      }),
      // Avg deliveries per day (from sessions this month)
      prisma.talabatSession.aggregate({
        where: { driverId, tenantId, date: { gte: startOfMonth } },
        _sum: { deliveries: true },
        _count: { id: true },
      }),
      // Pending dues from cash records
      prisma.cashRecord.aggregate({
        where: { driverId, tenantId, status: "PENDING" },
        _sum: { pendingDues: true },
      }),
      // Violation events count (unresolved)
      prisma.talabatViolationEvent.count({
        where: { driverId, tenantId, resolved: false },
      }),
      // Keeta rates + deliveries this month
      prisma.keetaDailyMetrics.findMany({
        where: { driverId, tenantId, date: { gte: startOfMonth } },
        select: { onTimeRate: true, completionRate: true, deliveredTasks: true, validDay: true },
      }),
      prisma.keetaDailyMetrics.count({
        where: { driverId, tenantId, date: { gte: startOfMonth }, validDay: true },
      }),
    ]);

    const isKeeta = driver.platform === "KEETA";
    let avgDeliveriesPerDay: number;
    let sessionsCount: number;
    if (isKeeta) {
      sessionsCount = keetaSessionCount;
      const totalK = keetaMetrics.reduce((a, m) => a + (m.deliveredTasks || 0), 0);
      avgDeliveriesPerDay = keetaSessionCount > 0 ? totalK / keetaSessionCount : 0;
    } else {
      sessionsCount = sessionsThisMonth;
      const totalDeliveries = sessionStats._sum.deliveries || 0;
      const divisor = sessionStats._count.id || 1;
      avgDeliveriesPerDay = totalDeliveries / divisor;
    }
    const pendingDuesKd = Number(pendingCash._sum.pendingDues || 0);

    const onTimeVals = keetaMetrics.map(m => m.onTimeRate != null ? Number(m.onTimeRate) : null).filter((v): v is number => v != null);
    const completionVals = keetaMetrics.map(m => m.completionRate != null ? Number(m.completionRate) : null).filter((v): v is number => v != null);
    const onTimeRate = onTimeVals.length > 0 ? onTimeVals.reduce((a, b) => a + b, 0) / onTimeVals.length : null;
    const completionRate = completionVals.length > 0 ? completionVals.reduce((a, b) => a + b, 0) / completionVals.length : null;

    res.json({
      sessionsThisMonth: sessionsCount,
      avgDeliveriesPerDay,
      pendingDuesKd,
      violationEvents,
      onTimeRate,
      completionRate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * R3 · Driver 360 aggregator.
 * GET /api/drivers/:id/profile?platform=TALABAT|KEETA
 *
 * Composes the tabs Driver 360 needs in a single round-trip:
 *   { overview, attendance, orders, performance, cash, violations, assets, documents }
 */
router.get("/:id/profile", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const driver = await prisma.driver.findFirst({
      where: { id, tenantId },
      include: {
        company: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } },
        device: { select: { id: true, imei: true, model: true, lastSeen: true, isOnline: true } },
        assignedVehicle: { select: { id: true, plateNumber: true, vehicleType: true, status: true } },
      },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      todayOrders,
      weekOrders,
      recentAttendance,
      recentLeaves,
      pendingCash,
      cashMonth,
      recentViolations,
      activeRestrictions,
      talabatMetrics,
      keetaMetrics,
      activeSession,
    ] = await Promise.all([
      prisma.orderLog.aggregate({
        where: { tenantId, driverId: id, date: { gte: todayStart } },
        _sum: { orderCount: true, cashCollected: true, tips: true },
      }),
      prisma.orderLog.aggregate({
        where: { tenantId, driverId: id, date: { gte: weekStart } },
        _sum: { orderCount: true, cashCollected: true, tips: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { tenantId, driverId: id, date: { gte: monthStart } },
        select: { id: true, date: true, status: true, lateMinutes: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.leaveRequest.findMany({
        where: { tenantId, driverId: id },
        select: { id: true, startDate: true, endDate: true, status: true, reason: true },
        orderBy: { startDate: "desc" },
        take: 10,
      }),
      prisma.cashRecord.aggregate({
        where: { tenantId, driverId: id, status: "PENDING" },
        _sum: { pendingDues: true },
      }),
      prisma.cashRecord.findMany({
        where: { tenantId, driverId: id, date: { gte: monthStart } },
        select: { id: true, date: true, salesAmount: true, collectionAmount: true, pendingDues: true, status: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.violation.findMany({
        where: { tenantId, driverId: id },
        select: { id: true, violationType: true, violationStatus: true, appealStatus: true, violationTime: true, details: true },
        orderBy: { violationTime: "desc" },
        take: 20,
      }),
      prisma.driverRestriction.findMany({
        where: { tenantId, driverId: id, OR: [{ endDate: null }, { endDate: { gte: now } }] },
        select: { id: true, type: true, startDate: true, endDate: true, reason: true },
      }),
      driver.platform === "TALABAT"
        ? prisma.talabatDailyMetrics.findMany({
            where: { tenantId, driverId: id, shiftDate: { gte: weekStart } },
            orderBy: { shiftDate: "desc" },
          })
        : Promise.resolve([]),
      driver.platform === "KEETA"
        ? prisma.keetaDailyMetrics.findMany({
            where: { tenantId, driverId: id, date: { gte: weekStart } },
            orderBy: { date: "desc" },
          })
        : Promise.resolve([]),
      prisma.courierOnlineSession.findFirst({
        where: { tenantId, driverId: id, isOnline: true },
        select: { id: true, startTime: true, lastGpsAt: true, area: true },
      }),
    ]);

    // Overview tab
    const utrThisWeek =
      driver.platform === "TALABAT" && talabatMetrics.length > 0
        ? (talabatMetrics.reduce((s, m) => s + (m.utr ?? 0), 0) / talabatMetrics.length)
        : driver.platform === "KEETA" && keetaMetrics.length > 0
          ? keetaMetrics.reduce((s, m) => s + Number(m.completionRate ?? 0), 0) / keetaMetrics.length
          : null;

    const overview = {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        zone: driver.zone,
        batchNumber: driver.batchNumber,
        platform: driver.platform,
        status: driver.status,
        vehicleType: driver.vehicleType,
        company: driver.company?.name ?? null,
        supervisor: driver.supervisor?.name ?? null,
        performanceTier: (driver as any).performanceTier ?? null,
        photoUrl: driver.photoUrl,
      },
      todayOrders: todayOrders._sum.orderCount ?? 0,
      todayCash: Number(todayOrders._sum.cashCollected ?? 0),
      todayTips: Number(todayOrders._sum.tips ?? 0),
      weekOrders: weekOrders._sum.orderCount ?? 0,
      weekCash: Number(weekOrders._sum.cashCollected ?? 0),
      utrThisWeek: utrThisWeek != null ? Math.round(utrThisWeek * 100) / 100 : null,
      activeSession,
    };

    // Documents — pull expiry fields off driver
    const documents = {
      healthCert: { expiry: driver.healthCertExpiry, status: driver.healthCertStatus },
      workPermit: { expiry: driver.workPermitExpiry, status: driver.workPermitStatus },
      foodHandling: { expiry: driver.foodHandlingCertExpiry, status: driver.foodHandlingCertStatus },
      vehicleReg: { expiry: driver.vehicleRegExpiry, status: driver.vehicleRegStatus },
      vehicleInsurance: { expiry: driver.vehicleInsuranceExpiry, status: driver.vehicleInsuranceStatus },
      drivingLicense: { expiry: driver.drivingLicenseExpiry, status: driver.drivingLicenseStatus },
      civilId: { expiry: driver.civilIdExpiry, status: driver.civilIdStatus },
    };

    res.json({
      overview,
      attendance: {
        records: recentAttendance,
        leaves: recentLeaves,
      },
      orders: {
        todayCount: todayOrders._sum.orderCount ?? 0,
        weekCount: weekOrders._sum.orderCount ?? 0,
      },
      performance: {
        talabatMetrics,
        keetaMetrics,
      },
      cash: {
        pendingDues: Number(pendingCash._sum.pendingDues ?? 0),
        records: cashMonth,
      },
      violations: {
        items: recentViolations,
        activeRestrictions,
      },
      assets: {
        device: driver.device,
        vehicle: driver.assignedVehicle,
      },
      documents,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        company: true,
        inventory: true,
        supervisor: { select: { id: true, name: true } },
        assignedVehicle: true,
      },
    });
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json(driver);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", rbac(...MUTATORS), validateBody(createDriverSchema.passthrough()), async (req: Request, res: Response) => {
  try {
    const { inventory, ...driverData } = req.body;

    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.driver.create({
        data: { ...driverData, tenantId: req.user!.tenantId },
      });

      if (inventory && Array.isArray(inventory) && inventory.length > 0) {
        await tx.driverInventory.createMany({
          data: inventory.map((item: { itemType: string; issued: boolean; quantity: number }) => ({
            driverId: created.id,
            itemType: item.itemType as any,
            issued: item.issued,
            quantity: item.quantity || 0,
            issuedDate: item.issued ? new Date() : null,
          })),
        });
      }

      return tx.driver.findUnique({
        where: { id: created.id },
        include: { inventory: true },
      });
    });

    res.status(201).json(driver);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", rbac(...MUTATORS), async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (driver.count === 0) { res.status(404).json({ error: "Driver not found" }); return; }
    const updated = await prisma.driver.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", rbac(...DESTRUCTIVE), async (req: Request, res: Response) => {
  try {
    await prisma.driver.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Driver deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
