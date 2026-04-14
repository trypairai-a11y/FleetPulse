import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

function parseRange(req: Request) {
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const from = req.query.from ? new Date(req.query.from as string) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function deltaPct(today: number, ref: number): number | null {
  if (!ref) return null;
  return Number((((today - ref) / ref) * 100).toFixed(2));
}

async function fetchSeries(tenantId: string, from: Date, to: Date) {
  const rows = await prisma.keetaDailyMetrics.findMany({
    where: { tenantId, date: { gte: from, lte: to } },
    select: {
      date: true, acceptedTasks: true, deliveredTasks: true, cancelledTasks: true,
      onTimeRate: true, avgDeliveryMinutes: true, onlineTime: true, validOnlineTime: true,
      driverId: true, validDay: true,
    },
  });
  const byDay = new Map<string, any>();
  for (const r of rows) {
    const k = r.date.toISOString().slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, {
      date: k, accepted: 0, delivered: 0, cancelled: 0, ontime: 0, ontimeCount: 0,
      avgDeliveryMin: 0, avgDelCount: 0, online: 0, validOnline: 0, drivers: new Set<string>(), validDays: 0,
    });
    const a = byDay.get(k)!;
    a.accepted += r.acceptedTasks || 0;
    a.delivered += r.deliveredTasks || 0;
    a.cancelled += r.cancelledTasks || 0;
    if (r.onTimeRate != null) { a.ontime += Number(r.onTimeRate); a.ontimeCount += 1; }
    if (r.avgDeliveryMinutes != null) { a.avgDeliveryMin += Number(r.avgDeliveryMinutes); a.avgDelCount += 1; }
    a.online += r.onlineTime || 0;
    a.validOnline += r.validOnlineTime || 0;
    a.drivers.add(r.driverId);
    if (r.validDay) a.validDays += 1;
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)).map((a) => ({
    date: a.date,
    acceptedTasks: a.accepted,
    deliveredTasks: a.delivered,
    cancelledTasks: a.cancelled,
    onTimeRate: a.ontimeCount > 0 ? Number((a.ontime / a.ontimeCount).toFixed(4)) : 0,
    avgDeliveryMin: a.avgDelCount > 0 ? Number((a.avgDeliveryMin / a.avgDelCount).toFixed(2)) : 0,
    onlineCouriers: a.drivers.size,
    onlineMinutes: a.online,
    validOnlineMinutes: a.validOnline,
    validDays: a.validDays,
  }));
}

function buildCards(series: any[], fields: { key: string; label: string }[]) {
  const last = series[series.length - 1] ?? {};
  const prev = series[series.length - 2] ?? {};
  const wow = series[series.length - 8] ?? {};
  return fields.map((f) => ({
    label: f.label,
    value: last[f.key] ?? 0,
    dodPct: deltaPct(last[f.key] ?? 0, prev[f.key] ?? 0),
    wowPct: deltaPct(last[f.key] ?? 0, wow[f.key] ?? 0),
  }));
}

router.get("/task-volumes", async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);
    const series = await fetchSeries(req.user!.tenantId, from, to);
    res.json({
      cards: buildCards(series, [
        { key: "acceptedTasks", label: "Accepted Tasks" },
        { key: "deliveredTasks", label: "Delivered Tasks" },
        { key: "cancelledTasks", label: "Cancelled Tasks" },
      ]),
      trend: { metricA: "acceptedTasks", metricB: "deliveredTasks", points: series },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/courier-capacity", async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);
    const series = await fetchSeries(req.user!.tenantId, from, to);
    res.json({
      cards: buildCards(series, [
        { key: "onlineCouriers", label: "Online Couriers" },
        { key: "onlineMinutes", label: "Online Minutes" },
        { key: "validDays", label: "Valid Days" },
      ]),
      trend: { metricA: "onlineCouriers", metricB: "validDays", points: series },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/delivery-experience", async (req: Request, res: Response) => {
  try {
    const { from, to } = parseRange(req);
    const series = await fetchSeries(req.user!.tenantId, from, to);
    res.json({
      cards: buildCards(series, [
        { key: "onTimeRate", label: "On-Time Rate" },
        { key: "avgDeliveryMin", label: "Avg Delivery (min)" },
      ]),
      trend: { metricA: "onTimeRate", metricB: "avgDeliveryMin", points: series },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
