import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { sendXlsx } from "../utils/xlsxExport";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { platform, driverId, status, dateFrom, dateTo, companyId } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }
    if (platform || companyId) {
      where.driver = {};
      if (platform) where.driver.platform = platform;
      if (companyId) where.driver.companyId = companyId;
    }

    const [data, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true, zone: true } },
          shift: { select: { id: true, scheduledStart: true, scheduledEnd: true, actualStart: true, actualEnd: true, selfieUrl: true } },
        },
      }),
      prisma.attendanceRecord.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [present, late, absent, excused, pendingLeaves] = await Promise.all([
      prisma.attendanceRecord.count({ where: { tenantId, date: { gte: startOfDay, lt: endOfDay }, status: "PRESENT" } }),
      prisma.attendanceRecord.count({ where: { tenantId, date: { gte: startOfDay, lt: endOfDay }, status: "LATE" } }),
      prisma.attendanceRecord.count({ where: { tenantId, date: { gte: startOfDay, lt: endOfDay }, status: "ABSENT" } }),
      prisma.attendanceRecord.count({ where: { tenantId, date: { gte: startOfDay, lt: endOfDay }, status: "EXCUSED" } }),
      prisma.leaveRequest.count({ where: { tenantId, status: "PENDING" } }),
    ]);

    const total = present + late + absent + excused;
    res.json({
      present, late, absent, excused,
      total,
      presentPercentage: total > 0 ? Math.round((present / total) * 100) : 0,
      pendingLeaves,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/monthly", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { month, year, platform, companyId } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 1);

    const where: any = {
      tenantId,
      date: { gte: startOfMonth, lt: endOfMonth },
    };
    if (platform || companyId) {
      where.driver = {};
      if (platform) where.driver.platform = platform;
      if (companyId) where.driver.companyId = companyId;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { driver: { select: { id: true, name: true, platform: true } } },
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, dateFrom, dateTo, companyId } = req.query;
    const where: any = { tenantId };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }
    if (platform || companyId) {
      where.driver = {};
      if (platform) where.driver.platform = platform;
      if (companyId) where.driver.companyId = companyId;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
      take: 5000,
      include: {
        driver: { select: { name: true, platform: true, zone: true } },
      },
    });

    const rows = records.map((r) => ({
      Date: new Date(r.date).toLocaleDateString(),
      "Driver Name": r.driver.name,
      Platform: r.driver.platform,
      Zone: r.driver.zone || "",
      Status: r.status,
      Source: r.source,
      "Late Minutes": r.lateMinutes || 0,
    }));

    sendXlsx(res, rows, "Attendance", "attendance-report.xlsx");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const record = await prisma.attendanceRecord.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
