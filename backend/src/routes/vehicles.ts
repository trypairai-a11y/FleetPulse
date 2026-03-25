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
    const { status, companyId, vehicleType } = req.query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (vehicleType) where.vehicleType = vehicleType;

    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true } },
          assignedDriver: { select: { id: true, name: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        company: true,
        assignedDriver: true,
        inspections: { orderBy: { date: "desc" }, take: 5 },
        maintenanceRecords: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!vehicle) { res.status(404).json({ error: "Vehicle not found" }); return; }
    res.json(vehicle);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(vehicle);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (vehicle.count === 0) { res.status(404).json({ error: "Vehicle not found" }); return; }
    const updated = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.vehicle.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Vehicle deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
