import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { upload } from "../utils/upload";
import { parseKeetaXlsx } from "../services/keetaXlsxParser";
import fs from "fs";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── Metrics ─────────────────────────────────────────────────────────────────

// GET /metrics — List KeetaDailyMetrics with filters, paginated
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo, driverId, validDay } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (validDay !== undefined) where.validDay = validDay === "true";
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        const d = new Date(dateFrom as string);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - 1); // include UTC-offset dates
        where.date.gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo as string);
        d.setHours(23, 59, 59, 999);
        where.date.lte = d;
      }
    }

    const [data, total] = await Promise.all([
      prisma.keetaDailyMetrics.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.keetaDailyMetrics.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /metrics/summary — Aggregate stats for a date range
router.get("/metrics/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo } = req.query;

    const startDate = dateFrom ? new Date(dateFrom as string) : new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 1); // include UTC-offset dates
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { tenantId, date: { gte: startDate, lte: endDate } };

    const [
      distinctDrivers,
      validDayCount,
      invalidDayCount,
      aggregates,
    ] = await Promise.all([
      prisma.keetaDailyMetrics.findMany({
        where: dateFilter,
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.keetaDailyMetrics.count({ where: { ...dateFilter, validDay: true } }),
      prisma.keetaDailyMetrics.count({ where: { ...dateFilter, validDay: false } }),
      prisma.keetaDailyMetrics.aggregate({
        where: dateFilter,
        _avg: { onTimeRate: true, avgDeliveryMinutes: true },
        _sum: { deliveredTasks: true, acceptedTasks: true },
      }),
    ]);

    res.json({
      totalDrivers: distinctDrivers.length,
      validDayCount,
      invalidDayCount,
      avgOnTimeRate: aggregates._avg.onTimeRate || 0,
      avgDeliveryMinutes: aggregates._avg.avgDeliveryMinutes || 0,
      totalDeliveredTasks: aggregates._sum.deliveredTasks || 0,
      totalAcceptedTasks: aggregates._sum.acceptedTasks || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /metrics/:id — Single record with driver
router.get("/metrics/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.keetaDailyMetrics.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true },
    });
    if (!record) { res.status(404).json({ error: "Metrics record not found" }); return; }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /metrics — Create
router.post("/metrics", async (req: Request, res: Response) => {
  try {
    const record = await prisma.keetaDailyMetrics.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /metrics/:id — Update
router.put("/metrics/:id", async (req: Request, res: Response) => {
  try {
    const result = await prisma.keetaDailyMetrics.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (result.count === 0) { res.status(404).json({ error: "Metrics record not found" }); return; }
    const updated = await prisma.keetaDailyMetrics.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Driver Summary ──────────────────────────────────────────────────────────

// GET /drivers/summary — Keeta driver stats
router.get("/drivers/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Active drivers: distinct drivers with metrics in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [activeDrivers, totalDrivers, recentMetrics, validDayCount] = await Promise.all([
      prisma.keetaDailyMetrics.findMany({
        where: { tenantId, date: { gte: sevenDaysAgo } },
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.driver.count({
        where: { tenantId, platform: "KEETA" },
      }),
      prisma.keetaDailyMetrics.aggregate({
        where: { tenantId, date: { gte: sevenDaysAgo } },
        _sum: { deliveredTasks: true },
        _count: { id: true },
      }),
      prisma.keetaDailyMetrics.count({
        where: { tenantId, date: { gte: sevenDaysAgo }, validDay: true },
      }),
    ]);

    const activeDriverCount = activeDrivers.length;
    const totalRecords = recentMetrics._count.id || 0;
    const avgDeliveriesPerDay = activeDriverCount > 0
      ? Math.round(((recentMetrics._sum.deliveredTasks || 0) / activeDriverCount / 7) * 10) / 10
      : 0;
    const avgValidDayRate = totalRecords > 0
      ? Math.round((validDayCount / totalRecords) * 1000) / 10
      : 0;

    res.json({
      activeDriverCount,
      totalDrivers,
      avgDeliveriesPerDay,
      avgValidDayRate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Import ──────────────────────────────────────────────────────────────────

// POST /import — Parse uploaded Keeta XLSX and upsert metrics
router.post("/import", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const tenantId = req.user!.tenantId;

    const buffer = fs.readFileSync(req.file.path);
    const rows = parseKeetaXlsx(buffer);

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (!row.courierPlatformId) {
          errors.push(`Row missing Courier ID: ${row.firstName} ${row.lastName}`);
          continue;
        }

        const driver = await prisma.driver.findFirst({
          where: {
            tenantId,
            platformDriverId: row.courierPlatformId,
            platform: "KEETA",
          },
        });

        if (!driver) {
          errors.push(`Driver not found: ${row.courierPlatformId} (${row.firstName} ${row.lastName})`);
          continue;
        }

        await prisma.keetaDailyMetrics.upsert({
          where: {
            tenantId_driverId_date: {
              tenantId,
              driverId: driver.id,
              date: row.date,
            },
          },
          create: {
            tenantId,
            driverId: driver.id,
            date: row.date,
            courierPlatformId: row.courierPlatformId,
            supervisorName: row.supervisorName,
            vehicleType: row.vehicleType,
            onShift: row.onShift,
            validDay: row.validDay,
            onlineTime: row.onlineTime,
            validOnlineTime: row.validOnlineTime,
            peakOnlineMinutes: row.peakOnlineMinutes,
            acceptedTasks: row.acceptedTasks,
            restaurantArrivals: row.restaurantArrivals,
            deliveredTasks: row.deliveredTasks,
            largeOrdersCompleted: row.largeOrdersCompleted,
            cancelledTasks: row.cancelledTasks,
            rejectedTasks: row.rejectedTasks,
            rejectedByCourier: row.rejectedByCourier,
            rejectedAuto: row.rejectedAuto,
            cancellationRate: row.cancellationRate,
            completionRate: row.completionRate,
            onTimeRate: row.onTimeRate,
            largeOrderOnTimeRate: row.largeOrderOnTimeRate,
            avgDeliveryMinutes: row.avgDeliveryMinutes,
            over55minProportion: row.over55minProportion,
            overdueOrders: row.overdueOrders,
            severelyOverdue: row.severelyOverdue,
            source: "XLSX_IMPORT",
          },
          update: {
            courierPlatformId: row.courierPlatformId,
            supervisorName: row.supervisorName,
            vehicleType: row.vehicleType,
            onShift: row.onShift,
            validDay: row.validDay,
            onlineTime: row.onlineTime,
            validOnlineTime: row.validOnlineTime,
            peakOnlineMinutes: row.peakOnlineMinutes,
            acceptedTasks: row.acceptedTasks,
            restaurantArrivals: row.restaurantArrivals,
            deliveredTasks: row.deliveredTasks,
            largeOrdersCompleted: row.largeOrdersCompleted,
            cancelledTasks: row.cancelledTasks,
            rejectedTasks: row.rejectedTasks,
            rejectedByCourier: row.rejectedByCourier,
            rejectedAuto: row.rejectedAuto,
            cancellationRate: row.cancellationRate,
            completionRate: row.completionRate,
            onTimeRate: row.onTimeRate,
            largeOrderOnTimeRate: row.largeOrderOnTimeRate,
            avgDeliveryMinutes: row.avgDeliveryMinutes,
            over55minProportion: row.over55minProportion,
            overdueOrders: row.overdueOrders,
            severelyOverdue: row.severelyOverdue,
            source: "XLSX_IMPORT",
          },
        });

        imported++;
      } catch (rowErr: any) {
        errors.push(`Error processing ${row.courierPlatformId}: ${rowErr.message}`);
      }
    }

    res.json({ imported, total: rows.length, errors });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
