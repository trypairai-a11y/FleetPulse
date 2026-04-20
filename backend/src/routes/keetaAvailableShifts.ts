import { Router, Request, Response } from "express";
import { Platform } from "../generated/prisma";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { rbac } from "../middleware/rbac";

function parseDate(v: any): Date {
  if (!v) return new Date();
  const d = new Date(v);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

const DEFAULT_SOURCE: Record<Platform, string> = {
  KEETA: "KEETA_SYNC",
  TALABAT: "TALABAT_SYNC",
  DELIVEROO: "DELIVEROO_SYNC",
  AMERICANA: "AMERICANA_SYNC",
};

// Factory so the same route can be mounted under /api/keeta, /api/talabat, etc.
export function createAvailableShiftsRouter(platform: Platform) {
  const router = Router();
  router.use(authMiddleware, tenantScope);

  // GET /?date=YYYY-MM-DD&area=Hawally&vehicleType=BIKE
  router.get("/", async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const where: any = { tenantId, platform };

      if (req.query.date) {
        const d = parseDate(req.query.date);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        where.date = { gte: start, lte: end };
      } else if (req.query.from || req.query.to) {
        where.date = {};
        if (req.query.from) where.date.gte = parseDate(req.query.from);
        if (req.query.to) where.date.lte = parseDate(req.query.to);
      }
      if (req.query.area) where.area = String(req.query.area);
      if (req.query.vehicleType) where.vehicleType = String(req.query.vehicleType);

      const slots = await prisma.keetaAvailableShiftSlot.findMany({
        where,
        orderBy: [{ date: "asc" }, { area: "asc" }, { slotStart: "asc" }],
      });

      const totals = slots.reduce(
        (acc, s) => {
          acc.capacity += s.capacity;
          acc.claimed += s.claimed;
          acc.open += Math.max(0, s.capacity - s.claimed);
          return acc;
        },
        { capacity: 0, claimed: 0, open: 0 }
      );

      res.json({ slots, totals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /rollup?date=YYYY-MM-DD — grouped by area
  router.get("/rollup", async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const d = parseDate(req.query.date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);

      const slots = await prisma.keetaAvailableShiftSlot.findMany({
        where: { tenantId, platform, date: { gte: start, lte: end } },
      });

      const perArea = new Map<string, { area: string; capacity: number; claimed: number; open: number; slots: number }>();
      for (const s of slots) {
        let a = perArea.get(s.area);
        if (!a) { a = { area: s.area, capacity: 0, claimed: 0, open: 0, slots: 0 }; perArea.set(s.area, a); }
        a.capacity += s.capacity;
        a.claimed += s.claimed;
        a.open += Math.max(0, s.capacity - s.claimed);
        a.slots += 1;
      }

      res.json({ date: start.toISOString().slice(0, 10), perArea: Array.from(perArea.values()) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /
  router.post("/", rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR"), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { date, area, slotStart, slotEnd, capacity, claimed, vehicleType, branchId, branchName, source, externalId, notes } = req.body || {};
      if (!date || !area || !slotStart || !slotEnd) return res.status(400).json({ error: "date, area, slotStart, slotEnd required" });

      const slot = await prisma.keetaAvailableShiftSlot.create({
        data: {
          tenantId,
          platform,
          date: parseDate(date),
          area,
          slotStart,
          slotEnd,
          capacity: Number(capacity ?? 0),
          claimed: Number(claimed ?? 0),
          vehicleType: vehicleType ?? null,
          branchId: branchId ?? null,
          branchName: branchName ?? null,
          source: source ?? "MANUAL",
          externalId: externalId ?? null,
          notes: notes ?? null,
        },
      });
      res.status(201).json(slot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /:id
  router.put("/:id", rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR"), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const existing = await prisma.keetaAvailableShiftSlot.findFirst({ where: { id: req.params.id, tenantId, platform } });
      if (!existing) return res.status(404).json({ error: "not found" });

      const { date, area, slotStart, slotEnd, capacity, claimed, vehicleType, branchId, branchName, notes } = req.body || {};
      const data: any = {};
      if (date !== undefined) data.date = parseDate(date);
      if (area !== undefined) data.area = area;
      if (slotStart !== undefined) data.slotStart = slotStart;
      if (slotEnd !== undefined) data.slotEnd = slotEnd;
      if (capacity !== undefined) data.capacity = Number(capacity);
      if (claimed !== undefined) data.claimed = Number(claimed);
      if (vehicleType !== undefined) data.vehicleType = vehicleType;
      if (branchId !== undefined) data.branchId = branchId;
      if (branchName !== undefined) data.branchName = branchName;
      if (notes !== undefined) data.notes = notes;

      const slot = await prisma.keetaAvailableShiftSlot.update({ where: { id: req.params.id }, data });
      res.json(slot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /:id
  router.delete("/:id", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const existing = await prisma.keetaAvailableShiftSlot.findFirst({ where: { id: req.params.id, tenantId, platform } });
      if (!existing) return res.status(404).json({ error: "not found" });
      await prisma.keetaAvailableShiftSlot.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /bulk — replace-or-insert a batch (used by sync)
  router.post("/bulk", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const items: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
      const results = [];
      for (const it of items) {
        if (!it.date || !it.area || !it.slotStart || !it.slotEnd) continue;
        const date = parseDate(it.date);
        const vehicleType = it.vehicleType ?? null;
        const saved = await prisma.keetaAvailableShiftSlot.upsert({
          where: {
            tenantId_platform_date_area_slotStart_vehicleType: {
              tenantId, platform, date, area: it.area, slotStart: it.slotStart, vehicleType: vehicleType as any,
            },
          },
          update: {
            slotEnd: it.slotEnd,
            capacity: Number(it.capacity ?? 0),
            claimed: Number(it.claimed ?? 0),
            branchId: it.branchId ?? null,
            branchName: it.branchName ?? null,
            externalId: it.externalId ?? null,
            source: it.source ?? DEFAULT_SOURCE[platform],
          },
          create: {
            tenantId,
            platform,
            date,
            area: it.area,
            slotStart: it.slotStart,
            slotEnd: it.slotEnd,
            capacity: Number(it.capacity ?? 0),
            claimed: Number(it.claimed ?? 0),
            vehicleType,
            branchId: it.branchId ?? null,
            branchName: it.branchName ?? null,
            externalId: it.externalId ?? null,
            source: it.source ?? DEFAULT_SOURCE[platform],
          },
        });
        results.push(saved);
      }
      res.json({ count: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// Default export preserves the existing `import keetaAvailableShiftsRoutes` usage.
export default createAvailableShiftsRouter("KEETA");
