import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { status, severity, type } = req.query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      prisma.alert.findMany({
        where, skip, take: limit,
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        include: {
          driver: { select: { id: true, name: true, platform: true } },
          vehicle: { select: { id: true, plateNumber: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    const alert = await prisma.alert.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedById: req.user!.userId,
        acknowledgedAt: new Date(),
      },
    });
    if (alert.count === 0) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json({ message: "Alert acknowledged" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const alert = await prisma.alert.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: { status: "RESOLVED" },
    });
    if (alert.count === 0) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json({ message: "Alert resolved" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
