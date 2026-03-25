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
    const { platform, driverId, status, zone, dateFrom, dateTo } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
    if (zone) where.zone = zone;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.shift.count({ where }),
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
    const { latitude, longitude } = req.body;
    const selfieUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const shift = await prisma.shift.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: {
        actualStart: new Date(),
        status: "IN_PROGRESS",
        selfieUrl,
        selfieLocation: latitude && longitude ? { latitude, longitude } : undefined,
        clockInMethod: "selfie",
      },
    });
    if (shift.count === 0) { res.status(404).json({ error: "Shift not found" }); return; }
    res.json({ message: "Clocked in" });
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
