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
    const { platform, status, companyId, zone, search } = req.query;

    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (zone) where.zone = zone;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { platformDriverId: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true, platform: true } } },
      }),
      prisma.driver.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;

    const [total, active, inactive, suspended] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "SUSPENDED" } }),
    ]);

    res.json({ total, active, inactive, suspended, docsExpiring: 0, docsMissing: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        company: true,
        inventory: true,
        supervisor: { select: { id: true, name: true } },
        assignedVehicle: true,
      },
    });
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json(driver);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(driver);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (driver.count === 0) { res.status(404).json({ error: "Driver not found" }); return; }
    const updated = await prisma.driver.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.driver.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Driver deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
