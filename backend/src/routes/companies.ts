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
    const where: any = { tenantId };
    if (req.query.platform) where.platform = req.query.platform;

    const [data, total] = await Promise.all([
      prisma.company.findMany({
        where, skip, take: limit,
        orderBy: { name: "asc" },
        include: { _count: { select: { drivers: true } } },
      }),
      prisma.company.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { _count: { select: { drivers: true, vehicles: true } } },
    });
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }
    res.json(company);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(company);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (company.count === 0) { res.status(404).json({ error: "Company not found" }); return; }
    const updated = await prisma.company.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.company.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Company deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
