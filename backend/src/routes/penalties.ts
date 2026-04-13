import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET / - List penalties with filters, paginated
router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { driverId, penaltyType, penaltyStatus, search } = req.query;

    const where: any = { tenantId };
    if (driverId) where.driverId = driverId as string;
    if (penaltyType) where.penaltyType = penaltyType as string;
    if (penaltyStatus) where.penaltyStatus = penaltyStatus as string;
    if (search) where.driver = { name: { contains: search as string, mode: "insensitive" } };

    const [data, total] = await Promise.all([
      prisma.penalty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true, vehicleType: true, platformDriverId: true } },
          _count: { select: { violations: true } },
        },
      }),
      prisma.penalty.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id - Single penalty with linked violations
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const penalty = await prisma.penalty.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        driver: { select: { id: true, name: true, platform: true, vehicleType: true, platformDriverId: true } },
        violations: {
          orderBy: { violationTime: "desc" },
          include: { driver: { select: { id: true, name: true } } },
        },
      },
    });
    if (!penalty) { res.status(404).json({ error: "Penalty not found" }); return; }
    res.json(penalty);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
