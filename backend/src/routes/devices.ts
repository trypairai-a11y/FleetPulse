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
    const { status, search } = req.query;
    const where: any = {
      driver: { tenantId: req.user!.tenantId },
    };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { imei: { contains: search as string } },
        { model: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.device.findMany({
        where, skip, take: limit,
        orderBy: { lastSeen: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.device.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/map", async (req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      where: {
        isOnline: true,
        lastLatitude: { not: null },
        lastLongitude: { not: null },
        driver: { tenantId: req.user!.tenantId },
      },
      include: { driver: { select: { id: true, name: true, platform: true, status: true } } },
    });
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        driver: true,
        commands: { orderBy: { issuedAt: "desc" }, take: 10 },
      },
    });
    if (!device) { res.status(404).json({ error: "Device not found" }); return; }
    res.json(device);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/command", async (req: Request, res: Response) => {
  try {
    const command = await prisma.deviceCommand.create({
      data: {
        deviceId: req.params.id,
        command: req.body.command,
        payload: req.body.payload,
        issuedById: req.user!.userId,
      },
    });
    res.status(201).json(command);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /trail/:driverId — Location history for polyline trail
router.get("/trail/:driverId", async (req: Request, res: Response) => {
  try {
    const { hours } = req.query;
    const hoursBack = parseInt(hours as string) || 4;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const logs = await prisma.locationLog.findMany({
      where: {
        driverId: req.params.driverId,
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: "asc" },
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        capturedAt: true,
      },
      take: 500,
    });

    res.json(logs.map((l) => ({
      lat: Number(l.latitude),
      lng: Number(l.longitude),
      speed: l.speed ? Number(l.speed) : null,
      time: l.capturedAt,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
