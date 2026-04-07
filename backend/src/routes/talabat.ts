import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { parseLocalDate, parseLocalDateEnd } from "../utils/date";
import { createViolationNotifications, getViolationSeverity } from "../services/notificationService";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── Sessions ───────────────────────────────────────────────────────────────

// GET /sessions - List with filters, paginated
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo, zone, driverId, status, companyId, search } = req.query;
    const where: any = { tenantId };
    if (companyId) where.driver = { companyId: companyId as string };
    if (zone) where.zone = zone;
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
    if (search) where.driver = { ...where.driver, name: { contains: search as string, mode: "insensitive" } };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.date.lte = parseLocalDateEnd(dateTo as string);
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

// GET /sessions/summary - Aggregate stats for a given date
router.get("/sessions/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setDate(startOfDay.getDate() - 1); // include UTC-offset dates
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { companyId } = req.query;
    const dateFilter: any = { tenantId, date: { gte: startOfDay, lte: endOfDay } };
    if (companyId) dateFilter.driver = { companyId: companyId as string };

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

// GET /sessions/daily-overview - All sessions grouped by driver for a date
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

// GET /sessions/:id - Single session with driver + complianceEvents
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await prisma.talabatSession.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true, complianceEvents: true, deliveryItems: { orderBy: { finishedAt: "desc" } } },
    });
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /sessions - Create session
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

// PUT /sessions/:id - Update session
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

// ─── Deliveries ────────────────────────────────────────────────────────────

// GET /deliveries - List individual deliveries with filters, paginated
router.get("/deliveries", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { driverId, sessionId, dateFrom, dateTo, status } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (sessionId) where.sessionId = sessionId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.date.lte = parseLocalDateEnd(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.talabatDelivery.findMany({
        where, skip, take: limit,
        orderBy: { finishedAt: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true } },
          session: { select: { id: true, sessionCode: true, zone: true } },
        },
      }),
      prisma.talabatDelivery.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /deliveries/summary - Aggregate stats for deliveries
router.get("/deliveries/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo, driverId } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.date.lte = parseLocalDateEnd(dateTo as string);
    }

    const [total, aggregates, byType] = await Promise.all([
      prisma.talabatDelivery.count({ where }),
      prisma.talabatDelivery.aggregate({
        where,
        _sum: { amount: true, tip: true, distanceKm: true },
      }),
      prisma.talabatDelivery.groupBy({
        by: ["orderType"],
        where,
        _count: { id: true },
      }),
    ]);

    res.json({
      totalDeliveries: total,
      totalAmount: Number(aggregates._sum.amount || 0),
      totalTips: Number(aggregates._sum.tip || 0),
      totalDistanceKm: Number(aggregates._sum.distanceKm || 0),
      byType: byType.map((t) => ({ type: t.orderType, count: t._count.id })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /deliveries/:id - Single delivery
router.get("/deliveries/:id", async (req: Request, res: Response) => {
  try {
    const delivery = await prisma.talabatDelivery.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true, session: true },
    });
    if (!delivery) { res.status(404).json({ error: "Delivery not found" }); return; }
    res.json(delivery);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /deliveries - Create delivery
router.post("/deliveries", async (req: Request, res: Response) => {
  try {
    const delivery = await prisma.talabatDelivery.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(delivery);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /deliveries/:id - Update delivery
router.put("/deliveries/:id", async (req: Request, res: Response) => {
  try {
    const delivery = await prisma.talabatDelivery.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (delivery.count === 0) { res.status(404).json({ error: "Delivery not found" }); return; }
    const updated = await prisma.talabatDelivery.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Compliance ─────────────────────────────────────────────────────────────

// GET /compliance - List events with filters, paginated
router.get("/compliance", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { type, driverId, companyId, dateFrom, dateTo, resolved, search } = req.query;
    const where: any = { tenantId };
    if (type) where.type = type;
    if (driverId) where.driverId = driverId;
    if (companyId) where.driver = { ...where.driver, companyId: companyId as string };
    if (resolved !== undefined) where.resolved = resolved === "true";
    if (search) where.driver = { ...where.driver, name: { contains: search as string, mode: "insensitive" } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.createdAt.lte = parseLocalDateEnd(dateTo as string);
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

    // Enrich SHIFT_NOT_BOOKED events with scheduled shift details
    const shiftIds = data
      .filter((e: any) => e.type === "SHIFT_NOT_BOOKED" && e.metadata?.shiftId)
      .map((e: any) => e.metadata.shiftId);
    let shiftMap: Record<string, any> = {};
    if (shiftIds.length > 0) {
      const shifts = await prisma.shift.findMany({
        where: { id: { in: shiftIds } },
        select: { id: true, zone: true, scheduledStart: true, scheduledEnd: true, status: true },
      });
      shiftMap = Object.fromEntries(shifts.map((s) => [s.id, s]));
    }
    const enriched = data.map((e: any) => {
      if (e.type === "SHIFT_NOT_BOOKED" && e.metadata?.shiftId && shiftMap[e.metadata.shiftId]) {
        return { ...e, shift: shiftMap[e.metadata.shiftId] };
      }
      return e;
    });

    res.json(paginatedResponse(enriched, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /compliance/summary - Counts by type, severity, unresolved
router.get("/compliance/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const { companyId } = req.query;
    const summaryWhere: any = { tenantId };
    if (companyId) summaryWhere.driver = { companyId: companyId as string };

    const [byType, unresolvedCount] = await Promise.all([
      prisma.talabatComplianceEvent.groupBy({
        by: ["type"],
        where: summaryWhere,
        _count: { id: true },
      }),
      prisma.talabatComplianceEvent.count({ where: { ...summaryWhere, resolved: false } }),
    ]);

    res.json({
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
      unresolvedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /compliance - Create event
router.post("/compliance", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const event = await prisma.talabatComplianceEvent.create({
      data: { ...req.body, tenantId },
      include: { driver: { select: { name: true } } },
    });
    // Fire notifications
    await createViolationNotifications({
      tenantId,
      eventType: event.type,
      severity: getViolationSeverity(event.type),
      title: event.type.replace(/_/g, " "),
      message: event.description,
      sourceId: event.id,
      metadata: { driverName: (event as any).driver?.name },
    });
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /compliance/:id/resolve - Mark resolved
router.put("/compliance/:id/resolve", async (req: Request, res: Response) => {
  try {
    const event = await prisma.talabatComplianceEvent.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: (req.user as any).id },
    });
    if (event.count === 0) { res.status(404).json({ error: "Compliance event not found" }); return; }
    const updated = await prisma.talabatComplianceEvent.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Driver Summary ─────────────────────────────────────────────────────────

// GET /drivers/summary - Active Talabat driver count, avg sessions/week, avg deliveries/day
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

// GET /orders/summary - Totals from TalabatSession with week-over-week comparison + top earners
router.get("/orders/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo } = req.query;

    const now = new Date();
    const currentEnd = dateTo ? parseLocalDateEnd(dateTo as string) : now;
    const currentStart = dateFrom
      ? parseLocalDate(dateFrom as string)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const rangeDuration = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeDuration);

    const currentWhere = { tenantId, date: { gte: currentStart, lte: currentEnd } };
    const previousWhere = { tenantId, date: { gte: prevStart, lte: prevEnd } };

    const [current, previous, sessionsByDriver, allDrivers] = await Promise.all([
      prisma.talabatSession.aggregate({
        where: currentWhere,
        _sum: { deliveries: true, distanceKm: true, tips: true, cashCollected: true },
      }),
      prisma.talabatSession.aggregate({
        where: previousWhere,
        _sum: { deliveries: true, distanceKm: true, tips: true, cashCollected: true },
      }),
      prisma.talabatSession.groupBy({
        by: ["driverId"],
        where: currentWhere,
        _sum: { deliveries: true, cashCollected: true, tips: true },
        orderBy: { _sum: { deliveries: "desc" } },
      }),
      prisma.driver.findMany({
        where: { tenantId, platform: "TALABAT", status: "ACTIVE" },
        select: { id: true, name: true },
      }),
    ]);

    // Merge all drivers with session data
    const sessionMap = new Map(sessionsByDriver.map((e) => [e.driverId, e]));
    const topEarners = allDrivers
      .map((d) => {
        const session = sessionMap.get(d.id);
        return {
          driverId: d.id,
          driverName: d.name || "Unknown",
          deliveries: Number(session?._sum.deliveries || 0),
          cashKd: Number(session?._sum.cashCollected || 0),
          tipsKd: Number(session?._sum.tips || 0),
        };
      })
      .sort((a, b) => b.deliveries - a.deliveries);

    const totalDeliveries = Number(current._sum.deliveries || 0);
    const totalDistanceKm = Number(current._sum.distanceKm || 0);
    const totalTips = Number(current._sum.tips || 0);
    const totalCash = Number(current._sum.cashCollected || 0);

    const prevDeliveries = Number(previous._sum.deliveries || 0);
    const prevDistanceKm = Number(previous._sum.distanceKm || 0);
    const prevTips = Number(previous._sum.tips || 0);
    const prevCash = Number(previous._sum.cashCollected || 0);

    res.json({
      thisWeek: {
        deliveries: totalDeliveries,
        distanceKm: totalDistanceKm,
        tipsKd: totalTips,
        cashKd: totalCash,
      },
      lastWeek: {
        deliveries: prevDeliveries,
        distanceKm: prevDistanceKm,
        tipsKd: prevTips,
        cashKd: prevCash,
      },
      topEarners,
      // Keep flat fields for backward compat
      totalDeliveries,
      totalDistanceKm,
      totalTips,
      totalCash,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders by Hour ────────────────────────────────────────────────────────

// GET /orders/hourly - Deliveries grouped by hour of day
router.get("/orders/hourly", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { dateFrom, dateTo } = req.query;

    const where: any = { tenantId };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.date.lte = parseLocalDateEnd(dateTo as string);
    }

    let sessions = await prisma.talabatSession.findMany({
      where,
      select: { plannedStart: true, actualStart: true, deliveries: true },
    });

    // Smart date fallback: if no sessions for the requested date, find most recent date
    if (sessions.length === 0 && (dateFrom || dateTo)) {
      const fallbackWhere: any = { tenantId };
      const latest = await prisma.talabatSession.findFirst({
        where: fallbackWhere,
        orderBy: { date: "desc" },
        select: { date: true },
      });
      if (latest) {
        const latestDate = new Date(latest.date);
        latestDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(latestDate);
        nextDay.setDate(nextDay.getDate() + 1);
        fallbackWhere.date = { gte: latestDate, lt: nextDay };
        sessions = await prisma.talabatSession.findMany({
          where: fallbackWhere,
          select: { plannedStart: true, actualStart: true, deliveries: true },
        });
      }
    }

    // Group deliveries by hour of day (use actualStart if available, else plannedStart)
    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;

    for (const s of sessions) {
      const startTime = s.actualStart || s.plannedStart;
      if (!startTime) continue;
      const hour = new Date(startTime).getHours();
      hourlyMap[hour] += s.deliveries;
    }

    const hourly = Object.entries(hourlyMap).map(([hour, orders]) => ({
      hour: Number(hour),
      orders,
    }));

    res.json(hourly);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Rules ──────────────────────────────────────────────────────────────────

// POST /rules/run - Execute all rule checks
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
