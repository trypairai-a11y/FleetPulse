import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { rbac } from "../middleware/rbac";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { recomputeRound, seedDefaultGoals, seedDefaultTiers } from "../services/incentiveEngine";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/rounds", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const where: any = { tenantId };
    if (req.query.period) where.period = req.query.period;
    if (req.query.partnerId) where.partnerId = req.query.partnerId;
    if (req.query.vehicleType) where.vehicleType = req.query.vehicleType;
    const rounds = await prisma.incentiveTargetRound.findMany({
      where, orderBy: { issuedAt: "desc" },
      include: { partner: { select: { name: true } } },
    });
    res.json({ data: rounds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/rounds/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const round = await prisma.incentiveTargetRound.findFirst({
      where: { id: req.params.id, tenantId },
      include: { partner: true, goals: true, tiers: true },
    });
    if (!round) { res.status(404).json({ error: "Round not found" }); return; }
    res.json(round);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/rounds", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { partnerId, period, vehicleType, initialTarget, operator } = req.body;
    const round = await prisma.incentiveTargetRound.create({
      data: {
        tenantId, partnerId, period, vehicleType,
        issuedAt: new Date(),
        initialTarget,
        operator: operator ?? "Keeta OPS",
      },
    });
    await seedDefaultGoals(round.id);
    await seedDefaultTiers(round.id);
    res.status(201).json(round);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/rounds/:id/adjust", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { adjustedTarget } = req.body;
    const existing = await prisma.incentiveTargetRound.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) { res.status(404).json({ error: "Round not found" }); return; }
    const round = await prisma.incentiveTargetRound.update({
      where: { id: req.params.id },
      data: { adjustedTarget },
    });
    res.json(round);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/rounds/:id/recompute", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const existing = await prisma.incentiveTargetRound.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) { res.status(404).json({ error: "Round not found" }); return; }
    const payouts = await recomputeRound(req.params.id);
    res.json({ computed: payouts.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/rounds/:id/payouts", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { skip, limit, page } = getPagination(req);
    const where: any = { roundId: req.params.id, tenantId };
    if (req.query.search) {
      where.driver = { name: { contains: req.query.search as string, mode: "insensitive" } };
    }
    const [data, total] = await Promise.all([
      prisma.courierIncentivePayout.findMany({
        where, skip, take: limit,
        orderBy: { totalPayKwd: "desc" },
        include: { driver: { select: { id: true, name: true, phone: true, vehicleType: true, platformDriverId: true } } },
      }),
      prisma.courierIncentivePayout.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/drivers/:driverId/performance", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const payouts = await prisma.courierIncentivePayout.findMany({
      where: { tenantId, driverId: req.params.driverId },
      orderBy: { computedAt: "desc" },
      include: { round: { select: { period: true, vehicleType: true, partnerId: true, partner: { select: { name: true } } } } },
    });
    res.json({ driverId: req.params.driverId, payouts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
