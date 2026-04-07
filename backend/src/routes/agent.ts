import { Router, Request, Response } from "express";
import { prisma } from "../config";

const router = Router();

// Agent endpoints don't use standard auth - they use device-based auth
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { enrollmentCode, imei, model, osVersion } = req.body;
    // Find driver by enrollment code (using platformDriverId as enrollment code for now)
    const driver = await prisma.driver.findFirst({
      where: { platformDriverId: enrollmentCode },
      include: { company: true },
    });
    if (!driver) { res.status(404).json({ error: "Invalid enrollment code" }); return; }

    const device = await prisma.device.upsert({
      where: { imei },
      create: {
        imei,
        model,
        osVersion,
        driverId: driver.id,
        tenantId: driver.tenantId,
        status: "ACTIVE",
        isOnline: true,
        lastSeen: new Date(),
      },
      update: {
        model,
        osVersion,
        driverId: driver.id,
        status: "ACTIVE",
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    res.status(201).json({
      deviceId: device.id,
      driver: { id: driver.id, name: driver.name, platform: driver.platform },
      company: { id: driver.company.id, name: driver.company.name },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/heartbeat", async (req: Request, res: Response) => {
  try {
    const { deviceId, batteryLevel, isCharging, latitude, longitude, agentVersion } = req.body;
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        batteryLevel,
        isOnline: true,
        lastSeen: new Date(),
        agentVersion,
        lastLatitude: latitude,
        lastLongitude: longitude,
      },
    });
    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/captured-orders", async (req: Request, res: Response) => {
  try {
    const { deviceId, driverId, orders } = req.body;
    if (orders?.length > 0) {
      await prisma.capturedOrder.createMany({
        data: orders.map((o: any) => ({
          deviceId,
          driverId,
          platform: o.platform,
          notificationText: o.notificationText,
          parsedData: o.parsedData,
          capturedAt: new Date(o.capturedAt),
        })),
      });
    }
    res.json({ synced: orders?.length || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/location", async (req: Request, res: Response) => {
  try {
    const { deviceId, driverId, locations } = req.body;
    if (locations?.length > 0) {
      await prisma.locationLog.createMany({
        data: locations.map((l: any) => ({
          deviceId,
          driverId,
          latitude: l.latitude,
          longitude: l.longitude,
          accuracy: l.accuracy,
          speed: l.speed,
          capturedAt: new Date(l.capturedAt),
        })),
      });
      // Update device last location
      const last = locations[locations.length - 1];
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastLatitude: last.latitude, lastLongitude: last.longitude, lastSeen: new Date() },
      });
    }
    res.json({ synced: locations?.length || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/app-usage", async (req: Request, res: Response) => {
  try {
    const { deviceId, driverId, logs } = req.body;
    if (logs?.length > 0) {
      await prisma.appUsageLog.createMany({
        data: logs.map((l: any) => ({
          deviceId,
          driverId,
          appPackage: l.appPackage,
          eventType: l.eventType,
          durationSeconds: l.durationSeconds,
          capturedAt: new Date(l.capturedAt),
        })),
      });
    }
    res.json({ synced: logs?.length || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/commands", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.query;
    const commands = await prisma.deviceCommand.findMany({
      where: { deviceId: deviceId as string, status: "PENDING" },
      orderBy: { issuedAt: "asc" },
    });
    res.json(commands);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/commands/:id/ack", async (req: Request, res: Response) => {
  try {
    await prisma.deviceCommand.update({
      where: { id: req.params.id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
    res.json({ message: "Command acknowledged" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
