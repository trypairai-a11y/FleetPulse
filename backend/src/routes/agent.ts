import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { upload } from "../utils/upload";

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

/**
 * POST /api/agent/selfie — unified selfie-gated shift transition for the
 * Android agent. Identifies the driver by deviceId and either:
 *   - ACTION_CLOCK_IN  → locates today's BOOKED shift (or creates one at now),
 *                        sets selfieUrl/actualStart, returns shiftId
 *   - ACTION_CLOCK_OUT → finalizes the current shift, returns shiftId
 *
 * Multipart form fields:
 *   selfie (file, required), deviceId, action, shiftId?, latitude?, longitude?
 */
router.post("/selfie", upload.single("selfie"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No selfie file uploaded" }); return; }

    const { deviceId, action, shiftId: providedShiftId } = req.body as {
      deviceId?: string;
      action?: string;
      shiftId?: string;
    };
    const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;

    if (!deviceId || !action) {
      res.status(400).json({ error: "deviceId and action are required" });
      return;
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { driver: true },
    });
    if (!device?.driver) {
      res.status(404).json({ error: "Device or driver not found" });
      return;
    }
    const driver = device.driver;
    const tenantId = driver.tenantId;
    const selfieUrl = `/uploads/${req.file.filename}`;
    const now = new Date();

    if (action === "ACTION_CLOCK_IN") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Locate a scheduled shift for today, else create one on the fly.
      let shift = await prisma.shift.findFirst({
        where: {
          tenantId,
          driverId: driver.id,
          date: { gte: todayStart, lt: tomorrow },
          status: { in: ["BOOKED", "IN_PROGRESS"] },
        },
        orderBy: { scheduledStart: "asc" },
      });

      if (!shift) {
        shift = await prisma.shift.create({
          data: {
            tenantId,
            driverId: driver.id,
            platform: driver.platform,
            date: todayStart,
            scheduledStart: now,
            scheduledEnd: new Date(now.getTime() + 8 * 60 * 60 * 1000),
            status: "BOOKED",
            zone: driver.zone,
          },
        });
      }

      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          actualStart: now,
          status: "IN_PROGRESS",
          selfieUrl,
          selfieLocation: latitude != null && longitude != null ? { latitude, longitude } : undefined,
          clockInMethod: "selfie",
        },
      });

      // Attendance row + late detection
      const lateMs = now.getTime() - new Date(shift.scheduledStart).getTime();
      const lateMinutes = Math.max(0, Math.floor(lateMs / 60000));
      const isLate = lateMinutes >= 1;

      const existing = await prisma.attendanceRecord.findUnique({
        where: { tenantId_driverId_date: { tenantId, driverId: driver.id, date: todayStart } },
      });
      const variance =
        existing?.platformClockIn
          ? Math.abs(Math.floor((now.getTime() - new Date(existing.platformClockIn).getTime()) / 60000))
          : null;

      await prisma.attendanceRecord.upsert({
        where: {
          tenantId_driverId_date: { tenantId, driverId: driver.id, date: todayStart },
        },
        create: {
          tenantId,
          driverId: driver.id,
          shiftId: shift.id,
          date: todayStart,
          status: isLate ? "LATE" : "PRESENT",
          lateMinutes: isLate ? lateMinutes : 0,
          source: "DARB_APP",
          darbClockIn: now,
        },
        update: {
          shiftId: shift.id,
          darbClockIn: now,
          varianceMinutes: variance,
          // Late status is driven by platform when available; fall back to Darb time otherwise
          ...(existing?.platformClockIn
            ? {}
            : { status: isLate ? "LATE" : "PRESENT", lateMinutes: isLate ? lateMinutes : 0 }),
        },
      });

      res.json({ shiftId: shift.id, selfieUrl, isLate, lateMinutes });
      return;
    }

    if (action === "ACTION_CLOCK_OUT") {
      const targetId = providedShiftId;
      if (!targetId) { res.status(400).json({ error: "shiftId required for clock-out" }); return; }

      const shift = await prisma.shift.findFirst({
        where: { id: targetId, tenantId, driverId: driver.id },
      });
      if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }

      const actualStart = shift.actualStart ?? shift.scheduledStart;
      const actualMinutes = Math.max(0, Math.floor((now.getTime() - new Date(actualStart).getTime()) / 60000));

      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          actualEnd: now,
          status: "COMPLETED",
          clockOutMethod: "selfie",
          actualHoursMinutes: actualMinutes,
        },
      });

      // Mirror Darb clock-out to AttendanceRecord
      const dayStart = new Date(shift.date.getFullYear(), shift.date.getMonth(), shift.date.getDate());
      await prisma.attendanceRecord.updateMany({
        where: { tenantId, driverId: driver.id, date: dayStart },
        data: { darbClockOut: now },
      });

      res.json({ shiftId: shift.id, selfieUrl, actualMinutes });
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
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
