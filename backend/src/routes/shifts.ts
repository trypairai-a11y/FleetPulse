import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { upload } from "../utils/upload";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { platform, driverId, status, zone, dateFrom, dateTo, batchNumber, search } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
    if (zone) where.zone = zone;
    if (batchNumber) where.driver = { ...where.driver, batchNumber: batchNumber as string };
    if (search) {
      where.driver = { ...where.driver, name: { contains: search as string, mode: "insensitive" } };
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        const p = (dateFrom as string).split('-');
        where.date.gte = new Date(+p[0], +p[1] - 1, +p[2]);
      }
      if (dateTo) {
        const p = (dateTo as string).split('-');
        where.date.lte = new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59);
      }
    }

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true, zone: true, batchNumber: true, vehicleType: true } },
          talabatSessions: { take: 1, orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.shift.count({ where }),
    ]);

    // Flatten TalabatSession fields into each shift for the frontend
    const now = new Date();
    const mapped = data.map((s: any) => {
      const sess = s.talabatSessions?.[0];
      const { talabatSessions, ...rest } = s;

      // Compute actual hours dynamically
      let actualHours: number | null = null;
      if (s.actualHoursMinutes) {
        actualHours = Math.round(s.actualHoursMinutes / 60 * 10) / 10;
      } else if (s.actualStart && s.actualEnd) {
        const diffMs = new Date(s.actualEnd).getTime() - new Date(s.actualStart).getTime();
        actualHours = Math.round(diffMs / 60000 / 60 * 10) / 10;
      } else if (s.actualStart) {
        const diffMs = now.getTime() - new Date(s.actualStart).getTime();
        actualHours = Math.round(diffMs / 60000 / 60 * 10) / 10;
      } else if (s.plannedHoursMinutes) {
        actualHours = Math.round(s.plannedHoursMinutes / 60 * 10) / 10;
      }

      return {
        ...rest,
        batchNumber: s.driver?.batchNumber || null,
        vehicleType: s.driver?.vehicleType || null,
        bookedHours: s.plannedHoursMinutes ? Math.round(s.plannedHoursMinutes / 60 * 10) / 10 : null,
        actualHours,
        faceVerified: sess?.faceVerified ?? null,
        equipmentVerified: sess?.equipmentVerified ?? null,
        gpsCompliance: sess?.gpsCompliance ?? null,
        scheduledDuration: s.plannedHoursMinutes ? `${Math.floor(s.plannedHoursMinutes / 60)}h${s.plannedHoursMinutes % 60 ? ` ${s.plannedHoursMinutes % 60}m` : ''}` : null,
      };
    });

    res.json(paginatedResponse(mapped, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// All drivers with their booking status for a given date
router.get("/booking-status", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, date, zone, batchNumber, search, bookingFilter, companyId } = req.query;

    // Build driver filter
    const driverWhere: any = { tenantId, status: "ACTIVE" };
    if (platform) driverWhere.platform = platform;
    if (companyId) driverWhere.companyId = companyId as string;
    if (zone) driverWhere.zone = zone;
    if (batchNumber) driverWhere.batchNumber = batchNumber as string;
    if (search) driverWhere.name = { contains: search as string, mode: "insensitive" };

    // Parse the target date
    const targetDate = date ? new Date(date as string) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all active drivers for this platform
    const drivers = await prisma.driver.findMany({
      where: driverWhere,
      select: { id: true, name: true, phone: true, zone: true, batchNumber: true, vehicleType: true, photoUrl: true, company: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    // Get all shifts for these drivers on the target date
    const driverIds = drivers.map(d => d.id);
    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: dayStart, lte: dayEnd },
        ...(platform ? { platform: platform as any } : {}),
      },
      include: {
        talabatSessions: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    // Build a map of driverId -> shift
    const shiftByDriver = new Map<string, any>();
    for (const s of shifts) {
      shiftByDriver.set(s.driverId, s);
    }

    // Merge drivers with their shift data
    const now = new Date();
    const result = drivers.map(d => {
      const shift = shiftByDriver.get(d.id);
      const sess = shift?.talabatSessions?.[0];

      // Compute actual hours dynamically
      let actualHours: number | null = null;
      if (shift?.actualHoursMinutes) {
        actualHours = Math.round(shift.actualHoursMinutes / 60 * 10) / 10;
      } else if (shift?.actualStart && shift?.actualEnd) {
        const diffMs = new Date(shift.actualEnd).getTime() - new Date(shift.actualStart).getTime();
        actualHours = Math.round(diffMs / 60000 / 60 * 10) / 10;
      } else if (shift?.actualStart) {
        // Shift in progress - compute from actualStart to now
        const diffMs = now.getTime() - new Date(shift.actualStart).getTime();
        actualHours = Math.round(diffMs / 60000 / 60 * 10) / 10;
      } else if (shift?.plannedHoursMinutes) {
        // Booked but not started - show planned as actual
        actualHours = Math.round(shift.plannedHoursMinutes / 60 * 10) / 10;
      }

      return {
        driverId: d.id,
        driverName: d.name,
        companyName: (d as any).company?.name || null,
        phone: d.phone,
        zone: d.zone,
        batchNumber: d.batchNumber,
        vehicleType: d.vehicleType,
        photoUrl: d.photoUrl,
        hasBooked: !!shift,
        shiftId: shift?.id || null,
        status: shift?.status || "NOT_BOOKED",
        scheduledStart: shift?.scheduledStart || null,
        scheduledEnd: shift?.scheduledEnd || null,
        actualStart: shift?.actualStart || null,
        actualEnd: shift?.actualEnd || null,
        bookedHours: shift?.plannedHoursMinutes ? Math.round(shift.plannedHoursMinutes / 60 * 10) / 10 : null,
        actualHours,
        faceVerified: sess?.faceVerified ?? null,
      };
    });

    // Apply booking filter
    let filtered = result;
    if (bookingFilter === "BOOKED") filtered = result.filter(r => r.hasBooked);
    else if (bookingFilter === "NOT_BOOKED") filtered = result.filter(r => !r.hasBooked);

    const bookedCount = result.filter(r => r.hasBooked).length;
    const notBookedCount = result.filter(r => !r.hasBooked).length;

    res.json({
      date: dayStart.toISOString().split("T")[0],
      totalDrivers: result.length,
      bookedCount,
      notBookedCount,
      drivers: filtered,
    });
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

    // Calculate start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekWhere = { ...where, date: { gte: weekStart, lt: weekEnd } };

    const [totalThisWeek, missedCount, hoursAgg] = await Promise.all([
      prisma.shift.count({ where: weekWhere }),
      prisma.shift.count({ where: { ...weekWhere, status: "MISSED" } }),
      prisma.shift.aggregate({
        where: weekWhere,
        _sum: { plannedHoursMinutes: true, actualHoursMinutes: true },
      }),
    ]);

    const bookedHours = Math.round((hoursAgg._sum.plannedHoursMinutes || 0) / 60 * 10) / 10;
    const actualHours = Math.round((hoursAgg._sum.actualHoursMinutes || 0) / 60 * 10) / 10;

    res.json({ totalThisWeek, bookedHours, actualHours, faceFailCount: 0, missedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true, attendanceRecords: true, orderLogs: true },
    });
    if (!shift) { res.status(404).json({ error: "Shift not found" }); return; }
    res.json(shift);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(shift);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (shift.count === 0) { res.status(404).json({ error: "Shift not found" }); return; }
    const updated = await prisma.shift.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.shift.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Shift deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Clock in with selfie
router.post("/:id/clock-in", upload.single("selfie"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { latitude, longitude } = req.body;
    const selfieUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const now = new Date();

    // Fetch the shift first to get scheduledStart
    const existingShift = await prisma.shift.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true, driverId: true, date: true, platform: true, scheduledStart: true, zone: true },
    });
    if (!existingShift) { res.status(404).json({ error: "Shift not found" }); return; }

    // Update the shift
    await prisma.shift.update({
      where: { id: existingShift.id },
      data: {
        actualStart: now,
        status: "IN_PROGRESS",
        selfieUrl,
        selfieLocation: latitude && longitude ? { latitude, longitude } : undefined,
        clockInMethod: "selfie",
      },
    });

    // Late detection: if clocked in even 1 minute after scheduledStart, mark as LATE
    const lateMs = now.getTime() - new Date(existingShift.scheduledStart).getTime();
    const lateMinutes = Math.floor(lateMs / 60000);
    const isLate = lateMinutes >= 1;

    // Auto-create attendance record
    const attendanceDate = new Date(existingShift.date);
    attendanceDate.setHours(0, 0, 0, 0);

    await prisma.attendanceRecord.upsert({
      where: {
        tenantId_driverId_date: {
          tenantId,
          driverId: existingShift.driverId,
          date: attendanceDate,
        },
      },
      create: {
        tenantId,
        driverId: existingShift.driverId,
        shiftId: existingShift.id,
        date: attendanceDate,
        status: isLate ? "LATE" : "PRESENT",
        lateMinutes: isLate ? lateMinutes : 0,
        source: "SYSTEM",
      },
      update: {
        status: isLate ? "LATE" : "PRESENT",
        lateMinutes: isLate ? lateMinutes : 0,
        shiftId: existingShift.id,
      },
    });

    // Create LATE_CLOCK_IN compliance event if late (for Talabat, or generic alert for others)
    if (isLate) {
      if (existingShift.platform === "TALABAT") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingEvent = await prisma.talabatComplianceEvent.findFirst({
          where: {
            tenantId,
            driverId: existingShift.driverId,
            type: "LATE_CLOCK_IN",
            createdAt: { gte: today },
          },
        });
        if (!existingEvent) {
          await prisma.talabatComplianceEvent.create({
            data: {
              tenantId,
              driverId: existingShift.driverId,
              type: "LATE_CLOCK_IN",
              description: `Driver clocked in ${lateMinutes} minute${lateMinutes > 1 ? "s" : ""} late (scheduled: ${new Date(existingShift.scheduledStart).toLocaleTimeString()})`,
              metadata: { shiftId: existingShift.id, lateMinutes, scheduledStart: existingShift.scheduledStart },
            },
          });
        }
      } else {
        // Generic alert for non-Talabat platforms
        await prisma.alert.create({
          data: {
            tenantId,
            type: "late_clock_in",
            severity: lateMinutes >= 15 ? "HIGH" : "MEDIUM",
            title: "Late Clock-In",
            message: `Driver clocked in ${lateMinutes} minute${lateMinutes > 1 ? "s" : ""} late for ${existingShift.platform} shift`,
            driverId: existingShift.driverId,
            data: { shiftId: existingShift.id, lateMinutes, scheduledStart: existingShift.scheduledStart },
          },
        });
      }
    }

    res.json({
      message: "Clocked in",
      isLate,
      lateMinutes: isLate ? lateMinutes : 0,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Clock out
router.post("/:id/clock-out", upload.single("selfie"), async (req: Request, res: Response) => {
  try {
    const shift = await prisma.shift.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: {
        actualEnd: new Date(),
        status: "COMPLETED",
        clockOutMethod: "selfie",
      },
    });
    if (shift.count === 0) { res.status(404).json({ error: "Shift not found" }); return; }
    res.json({ message: "Clocked out" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Import schedule XLSX (Americana)
router.post("/import-schedule", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    res.json({ message: "Schedule XLSX import received", file: req.file.filename });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
