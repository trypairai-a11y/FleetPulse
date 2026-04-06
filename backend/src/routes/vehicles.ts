import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform } = req.query;
    const where: any = { tenantId };
    if (platform) {
      where.company = { platform: platform as string };
    }

    const [total, active, maintenance] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.vehicle.count({ where: { ...where, status: "MAINTENANCE" } }),
    ]);

    res.json({ total, active, maintenance, nonCompliant: 0, retired: total - active - maintenance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { status, companyId, vehicleType, platform, search } = req.query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (vehicleType) where.vehicleType = vehicleType;
    if (platform) {
      where.company = { platform: platform as string };
    }
    if (search) {
      where.OR = [
        { plateNumber: { contains: search as string, mode: "insensitive" } },
        { assignedDriver: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true, platform: true } },
          assignedDriver: { select: { id: true, name: true, zone: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    const enriched = data.map((v) => ({
      ...v,
      driver: v.assignedDriver,
      zone: v.assignedDriver?.zone || null,
    }));

    res.json(paginatedResponse(enriched, total, page, limit));
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
