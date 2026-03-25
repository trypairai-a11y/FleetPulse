import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── Sessions ───────────────────────────────────────────────────────────────

// GET /sessions — List with filters, paginated
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo, zone, driverId, status } = req.query;
    const where: any = { tenantId };
    if (zone) where.zone = zone;
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
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
      prisma.talabatSession.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.talabatSession.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sessions/summary — Aggregate stats for a given date
router.get("/sessions/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setDate(startOfDay.getDate() - 1); // include UTC-offset dates
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateFilter = { tenantId, date: { gte: startOfDay, lte: endOfDay } };

    const [sessions, aggregates, faceFailCount, zoneBreakdown, statusBreakdown] = await Promise.all([
      prisma.talabatSession.count({ where: dateFilter }),
      prisma.talabatSession.aggregate({
        where: dateFilter,
        _sum: { plannedHours: true, actualHours: true },
        _avg: { gpsCompliance: true },
      }),
      prisma.talabatSession.count({ where: { ...dateFilter, faceVerified: false } }),
      prisma.talabatSession.groupBy({
        by: ["zone"],
        where: dateFilter,
        _count: { id: true },
      }),
      prisma.talabatSession.groupBy({
        by: ["status"],
        where: dateFilter,
        _count: { id: true },
      }),
    ]);

    res.json({
      totalSessions: sessions,
      plannedHoursSum: aggregates._sum.plannedHours || 0,
      actualHoursSum: aggregates._sum.actualHours || 0,
      faceFailCount,
      avgGpsCompliance: aggregates._avg.gpsCompliance || 0,
      zoneBreakdown: zoneBreakdown.map((z) => ({ zone: z.zone, count: z._count.id })),
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count.id })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sessions/daily-overview — All sessions grouped by driver for a date
router.get("/sessions/daily-overview", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setDate(startOfDay.getDate() - 1);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await prisma.talabatSession.findMany({
      where: { tenantId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { plannedStart: "asc" },
      include: { driver: { select: { id: true, name: true, platform: true } } },
    });

    // Group by driver
    const grouped: Record<string, { driver: any; sessions: any[]; gapMinutes: number }> = {};
    for (const session of sessions) {
      const dId = session.driverId;
      if (!grouped[dId]) {
        grouped[dId] = { driver: session.driver, sessions: [], gapMinutes: 0 };
      }
      grouped[dId].sessions.push(session);
    }

    // Gap analysis: time between actualEnd of one session and actualStart of next
    for (const dId of Object.keys(grouped)) {
      const driverSessions = grouped[dId].sessions;
      let totalGap = 0;
      for (let i = 1; i < driverSessions.length; i++) {
        const prevEnd = driverSessions[i - 1].actualEnd;
        const currStart = driverSessions[i].actualStart;
        if (prevEnd && currStart) {
          const gap = (new Date(currStart).getTime() - new Date(prevEnd).getTime()) / 60000;
          if (gap > 0) totalGap += gap;
        }
      }
      grouped[dId].gapMinutes = Math.round(totalGap);
    }

    res.json(Object.values(grouped));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sessions/:id — Single session with driver + complianceEvents
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await prisma.talabatSession.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true, complianceEvents: true },
    });
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sessions — Create session
router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const session = await prisma.talabatSession.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /sessions/:id — Update session
router.put("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await prisma.talabatSession.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (session.count === 0) { res.status(404).json({ error: "Session not found" }); return; }
    const updated = await prisma.talabatSession.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Compliance ─────────────────────────────────────────────────────────────

// GET /compliance — List events with filters, paginated
router.get("/compliance", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { type, driverId, dateFrom, dateTo, resolved } = req.query;
    const where: any = { tenantId };
    if (type) where.type = type;
    if (driverId) where.driverId = driverId;
    if (resolved !== undefined) where.resolved = resolved === "true";
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.talabatComplianceEvent.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true } },
          session: { select: { id: true, sessionCode: true, zone: true, date: true } },
        },
      }),
      prisma.talabatComplianceEvent.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /compliance/summary — Counts by type, severity, unresolved
router.get("/compliance/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const [byType, bySeverity, unresolvedCount] = await Promise.all([
      prisma.talabatComplianceEvent.groupBy({
        by: ["type"],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.talabatComplianceEvent.groupBy({
        by: ["severity"],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.talabatComplianceEvent.count({ where: { tenantId, resolved: false } }),
    ]);

    res.json({
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count.id })),
      unresolvedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /compliance — Create event
router.post("/compliance", async (req: Request, res: Response) => {
  try {
    const event = await prisma.talabatComplianceEvent.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /compliance/:id/resolve — Mark resolved
router.put("/compliance/:id/resolve", async (req: Request, res: Response) => {
  try {
    const event = await prisma.talabatComplianceEvent.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.user!.id },
    });
    if (event.count === 0) { res.status(404).json({ error: "Compliance event not found" }); return; }
    const updated = await prisma.talabatComplianceEvent.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Driver Summary ─────────────────────────────────────────────────────────

// GET /drivers/summary — Active Talabat driver count, avg sessions/week, avg deliveries/day
router.get("/drivers/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Active drivers: distinct drivers with sessions in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [activeDrivers, weekSessions, todaySessions] = await Promise.all([
      prisma.talabatSession.findMany({
        where: { tenantId, date: { gte: sevenDaysAgo } },
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.talabatSession.count({
        where: { tenantId, date: { gte: sevenDaysAgo } },
      }),
      prisma.talabatSession.aggregate({
        where: { tenantId, date: { gte: startOfToday, lte: today } },
        _sum: { deliveries: true },
      }),
    ]);

    const activeDriverCount = activeDrivers.length;
    const avgSessionsPerWeekPerDriver = activeDriverCount > 0
      ? Math.round((weekSessions / activeDriverCount) * 10) / 10
      : 0;
    const avgDeliveriesPerDay = activeDriverCount > 0
      ? Math.round(((todaySessions._sum.deliveries || 0) / activeDriverCount) * 10) / 10
      : 0;

    res.json({
      activeDriverCount,
      avgSessionsPerWeekPerDriver,
      avgDeliveriesPerDay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Order Summary ──────────────────────────────────────────────────────────

// GET /orders/summary — Totals from TalabatSession with week-over-week comparison
router.get("/orders/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo } = req.query;

    const now = new Date();
    const currentEnd = dateTo ? new Date(dateTo as string) : now;
    const currentStart = dateFrom
      ? new Date(dateFrom as string)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const rangeDuration = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeDuration);

    const [current, previous] = await Promise.all([
      prisma.talabatSession.aggregate({
        where: { tenantId, date: { gte: currentStart, lte: currentEnd } },
        _sum: { deliveries: true, distanceKm: true, tips: true, cashCollected: true },
      }),
      prisma.talabatSession.aggregate({
        where: { tenantId, date: { gte: prevStart, lte: prevEnd } },
        _sum: { deliveries: true, distanceKm: true, tips: true, cashCollected: true },
      }),
    ]);

    const pctChange = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10;

    const totalDeliveries = current._sum.deliveries || 0;
    const totalDistanceKm = current._sum.distanceKm || 0;
    const totalTips = current._sum.tips || 0;
    const totalCash = current._sum.cashCollected || 0;

    const prevDeliveries = previous._sum.deliveries || 0;
    const prevDistanceKm = previous._sum.distanceKm || 0;
    const prevTips = previous._sum.tips || 0;
    const prevCash = previous._sum.cashCollected || 0;

    res.json({
      totalDeliveries,
      totalDistanceKm,
      totalTips,
      totalCash,
      weekOverWeek: {
        deliveries: pctChange(totalDeliveries, prevDeliveries),
        distanceKm: pctChange(totalDistanceKm, prevDistanceKm),
        tips: pctChange(totalTips, prevTips),
        cash: pctChange(totalCash, prevCash),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Rules ──────────────────────────────────────────────────────────────────

// POST /rules/run — Execute all rule checks
router.post("/rules/run", async (req: Request, res: Response) => {
  try {
    const { runAllRules } = await import("../services/rulesEngine");
    const results = await runAllRules(req.user!.tenantId);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
