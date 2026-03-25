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
    const { stage } = req.query;
    const where: any = { tenantId };
    if (stage) where.stage = stage;

    const [data, total] = await Promise.all([
      prisma.recruitmentPipeline.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: { assignedCompany: { select: { id: true, name: true } } },
      }),
      prisma.recruitmentPipeline.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.recruitmentPipeline.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { assignedCompany: true },
    });
    if (!record) { res.status(404).json({ error: "Candidate not found" }); return; }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const record = await prisma.recruitmentPipeline.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.recruitmentPipeline.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (record.count === 0) { res.status(404).json({ error: "Candidate not found" }); return; }
    const updated = await prisma.recruitmentPipeline.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.recruitmentPipeline.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Candidate deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
