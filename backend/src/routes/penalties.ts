import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

/**
 * @swagger
 * /api/penalties:
 *   get:
 *     tags: [Penalties]
 *     summary: List penalties with filters and pagination
 *     parameters:
 *       - in: query
 *         name: driverId
 *         schema: { type: string }
 *       - in: query
 *         name: penaltyType
 *         schema: { type: string, enum: [ONLINE_TRAINING, VIOLATION_RECORD, ACCOUNT_SUSPENSION, WARNING] }
 *       - in: query
 *         name: penaltyStatus
 *         schema: { type: string, enum: [EFFECTIVE, COMPLETED, OVERTURNED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by driver name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated penalty list with driver info and violation count
 */
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

/**
 * @swagger
 * /api/penalties/{id}:
 *   get:
 *     tags: [Penalties]
 *     summary: Get a single penalty with all linked violations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Penalty detail with driver and violation history
 *       404:
 *         description: Penalty not found
 */
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
