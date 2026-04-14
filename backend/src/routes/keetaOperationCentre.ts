import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { cacheGet, cacheSet } from "../utils/cache";

const router = Router();
router.use(authMiddleware, tenantScope);

const CACHE_TTL = 5; // seconds

router.get("/by-courier", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const cacheKey = `opc:${tenantId}:by-courier`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    const sessions = await prisma.courierOnlineSession.findMany({
      where: { tenantId, isOnline: true },
      orderBy: { startTime: "desc" },
      take: 1000,
      include: {
        driver: {
          select: {
            id: true, name: true, phone: true, vehicleType: true, zone: true, platform: true,
            assignedVehicle: { select: { plateNumber: true, model: true, vehicleType: true } },
          },
        },
      },
    });

    // dedupe by driver — keep latest session per driver
    const seen = new Set<string>();
    const couriers: any[] = [];
    const now = Date.now();
    for (const s of sessions) {
      if (seen.has(s.driverId)) continue;
      seen.add(s.driverId);
      const stale = !s.lastGpsAt || (now - s.lastGpsAt.getTime()) > 10 * 60 * 1000;
      couriers.push({
        id: s.driverId,
        name: s.driver?.name ?? "Unknown",
        phone: s.driver?.phone ?? null,
        vehicle: s.driver?.vehicleType ?? null,
        plate: s.driver?.assignedVehicle?.plateNumber ?? null,
        lat: s.lastGpsLat ? Number(s.lastGpsLat) : null,
        lng: s.lastGpsLng ? Number(s.lastGpsLng) : null,
        status: stale ? "idle" : "working",
        lastGpsAt: s.lastGpsAt,
        area: s.area ?? s.driver?.zone ?? null,
      });
    }

    const payload = { couriers };
    await cacheSet(cacheKey, payload, CACHE_TTL);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/by-order", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const cacheKey = `opc:${tenantId}:by-order`;
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    // Pull recent orders from OrderLog + latest status from OrderEvent.
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recent = await prisma.orderEvent.findMany({
      where: { tenantId, timestamp: { gte: since } },
      orderBy: { timestamp: "desc" },
      take: 500,
    });

    const byOrder = new Map<string, any[]>();
    for (const ev of recent) {
      if (!byOrder.has(ev.orderId)) byOrder.set(ev.orderId, []);
      byOrder.get(ev.orderId)!.push(ev);
    }

    const orders: any[] = [];
    for (const [orderId, events] of byOrder.entries()) {
      events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const last = events[events.length - 1];
      const meta = (last.metadata as any) ?? {};
      orders.push({
        id: orderId,
        status: last.action,
        merchantLat: meta.merchantLat ?? null,
        merchantLng: meta.merchantLng ?? null,
        customerLat: meta.customerLat ?? null,
        customerLng: meta.customerLng ?? null,
        courierId: meta.courierId ?? null,
        etaAt: meta.etaAt ?? null,
        updatedAt: last.timestamp,
      });
    }

    const payload = { orders };
    await cacheSet(cacheKey, payload, CACHE_TTL);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
