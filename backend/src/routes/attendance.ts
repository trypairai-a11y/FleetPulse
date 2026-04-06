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
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setDate(end.getDate() + 1);
        where.date.lt = end;
      }
    }
    if (platform || companyId) {
      where.driver = {};
      if (platform) where.driver.platform = platform;
      if (companyId) where.driver.companyId = companyId;
    }

    const [records, total] = await Promise.all([
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
    const data = records.map(r => ({
      ...r,
      clockInLocation: r.driver?.zone || null,
    }));
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform } = req.query;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // If no data for today, fall back to most recent date with data
    const baseWhere: any = { tenantId };
    if (platform) baseWhere.driver = { platform: platform as string };

    let queryStart = startOfDay;
    let queryEnd = endOfDay;

    const todayCount = await prisma.attendanceRecord.count({
      where: { ...baseWhere, date: { gte: startOfDay, lt: endOfDay } },
    });
    if (todayCount === 0 && !req.query.date) {
      const latest = await prisma.attendanceRecord.findFirst({
        where: baseWhere,
        orderBy: { date: "desc" },
        select: { date: true },
      });
      if (latest) {
        queryStart = new Date(latest.date);
        queryStart.setHours(0, 0, 0, 0);
        queryEnd = new Date(queryStart.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    const dateWhere = { gte: queryStart, lt: queryEnd };
    const makeWhere = (status: string): any => {
      const w: any = { tenantId, date: dateWhere, status };
      if (platform) w.driver = { platform: platform as string };
      return w;
    };
    const leaveWhere: any = { tenantId, status: "PENDING" };
    if (platform) leaveWhere.driver = { platform: platform as string };

    const [present, late, absent, excused, pendingLeaves] = await Promise.all([
      prisma.attendanceRecord.count({ where: makeWhere("PRESENT") }),
      prisma.attendanceRecord.count({ where: makeWhere("LATE") }),
      prisma.attendanceRecord.count({ where: makeWhere("ABSENT") }),
      prisma.attendanceRecord.count({ where: makeWhere("EXCUSED") }),
      prisma.leaveRequest.count({ where: leaveWhere }),
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
    let m: number, y: number;
    const monthStr = month as string;
    if (monthStr && monthStr.includes("-")) {
      // Format: YYYY-MM
      const [ys, ms] = monthStr.split("-");
      y = parseInt(ys);
      m = parseInt(ms);
    } else {
      m = parseInt(monthStr) || new Date().getMonth() + 1;
      y = parseInt(year as string) || new Date().getFullYear();
    }
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
      include: {
        driver: { select: { id: true, name: true, platform: true, zone: true } },
        shift: { select: { actualStart: true, actualEnd: true } },
      },
    });

    // Aggregate by driver for monthly summary
    const driverMap = new Map<string, any>();
    for (const r of records) {
      if (!driverMap.has(r.driverId)) {
        driverMap.set(r.driverId, {
          driverId: r.driverId,
          driverName: r.driver.name,
          zone: r.driver.zone,
          present: 0, absent: 0, late: 0,
          faceFailCount: 0, zoneFlagCount: 0, totalHours: 0,
        });
      }
      const d = driverMap.get(r.driverId)!;
      if (r.status === "PRESENT") d.present++;
      else if (r.status === "ABSENT") d.absent++;
      if (r.status === "LATE") { d.late++; d.present++; }
      // Calculate hours from shift
      if (r.shift?.actualStart && r.shift?.actualEnd) {
        d.totalHours += (new Date(r.shift.actualEnd).getTime() - new Date(r.shift.actualStart).getTime()) / 3600000;
      }
    }

    const data = Array.from(driverMap.values()).map(d => ({
      ...d,
      totalHours: Math.round(d.totalHours * 10) / 10,
    }));
    res.json({ data });
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
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setDate(end.getDate() + 1);
        where.date.lt = end;
      }
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
