import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { sendXlsx } from "../utils/xlsxExport";
import { reconcilePlatformClock } from "../services/attendanceReconciliation";

const router = Router();
router.use(authMiddleware, tenantScope);

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: List attendance records with filters and pagination
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [TALABAT, KEETA, DELIVEROO, AMERICANA] }
 *       - in: query
 *         name: driverId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PRESENT, LATE, ABSENT, EXCUSED] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated attendance records with driver and shift info
 */
/**
 * R7 · Live "On shift now" by zone.
 *
 * GET /api/attendance/live?platform=TALABAT&zone=<optional>
 *   → { window, zones: [{ name, expected, online, late, noShow, drivers[] }] }
 *
 * "Late" threshold is read from platformSettings.shiftRules.lateThresholdMinutes
 * (default 15). Expected = drivers with a BOOKED shift whose window includes now.
 */
router.get("/live", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = String(req.query.platform ?? "TALABAT").toUpperCase() as any;
    const zoneFilter = req.query.zone ? String(req.query.zone) : undefined;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const settings = await prisma.platformSettings.findUnique({
      where: { tenantId_platform: { tenantId, platform } },
      select: { shiftRules: true },
    });
    const lateThresholdMin =
      ((settings?.shiftRules as any)?.lateThresholdMinutes ?? 15) * 1;

    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        platform,
        date: { gte: todayStart, lt: todayEnd },
        scheduledStart: { lte: now },
        scheduledEnd: { gte: now },
        ...(zoneFilter ? { zone: zoneFilter } : {}),
      },
      select: {
        id: true,
        zone: true,
        scheduledStart: true,
        scheduledEnd: true,
        actualStart: true,
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            zone: true,
            device: { select: { isOnline: true, lastSeen: true } },
          },
        },
      },
    });

    type Row = {
      shiftId: string;
      driverId: string;
      name: string;
      phone: string;
      onlineNow: boolean;
      lateMinutes: number;
      status: "PRESENT" | "LATE" | "NO_SHOW";
    };
    const byZone = new Map<
      string,
      { name: string; expected: number; online: number; late: number; noShow: number; drivers: Row[] }
    >();

    const getZone = (name: string) => {
      if (!byZone.has(name)) {
        byZone.set(name, { name, expected: 0, online: 0, late: 0, noShow: 0, drivers: [] });
      }
      return byZone.get(name)!;
    };

    for (const s of shifts) {
      const zoneName = s.zone ?? s.driver?.zone ?? "Unassigned";
      const z = getZone(zoneName);
      z.expected += 1;

      const onlineNow = !!s.driver?.device?.isOnline;
      if (onlineNow) z.online += 1;

      let status: Row["status"] = "PRESENT";
      let lateMinutes = 0;
      if (!s.actualStart) {
        const minutesPast = (now.getTime() - s.scheduledStart.getTime()) / 60_000;
        if (minutesPast >= lateThresholdMin) {
          status = minutesPast > lateThresholdMin * 4 ? "NO_SHOW" : "LATE";
          lateMinutes = Math.floor(minutesPast);
          if (status === "LATE") z.late += 1;
          else z.noShow += 1;
        }
      } else if (s.actualStart.getTime() - s.scheduledStart.getTime() > lateThresholdMin * 60_000) {
        status = "LATE";
        lateMinutes = Math.floor((s.actualStart.getTime() - s.scheduledStart.getTime()) / 60_000);
        z.late += 1;
      }

      z.drivers.push({
        shiftId: s.id,
        driverId: s.driver!.id,
        name: s.driver!.name,
        phone: s.driver!.phone,
        onlineNow,
        lateMinutes,
        status,
      });
    }

    res.json({
      window: { startAt: todayStart, endAt: todayEnd, nowAt: now },
      lateThresholdMinutes: lateThresholdMin,
      zones: [...byZone.values()].sort((a, b) => b.expected - a.expected),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
    const data = records.map(r => {
      // Backward-compat: legacy UI reads clockIn/clockOut. Prefer platform, fall back to Darb.
      const clockIn = r.platformClockIn ?? r.darbClockIn ?? r.shift?.actualStart ?? null;
      const clockOut = r.platformClockOut ?? r.darbClockOut ?? r.shift?.actualEnd ?? null;
      const workedHours =
        clockIn && clockOut
          ? (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000
          : null;
      const sourceLabel =
        r.darbClockIn && r.platformClockIn ? "BOTH"
          : r.platformClockIn ? "PLATFORM_ONLY"
          : r.darbClockIn ? "DARB_ONLY"
          : r.source;
      return {
        ...r,
        clockIn,
        clockOut,
        workedHours,
        sourceLabel,
        clockInLocation: r.driver?.zone || null,
      };
    });
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/attendance/summary:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance summary counts for a date (present, late, absent, excused)
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Defaults to today; falls back to most recent date with data
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [TALABAT, KEETA, DELIVEROO, AMERICANA] }
 *     responses:
 *       200:
 *         description: Summary with present, late, absent, excused counts and presentPercentage
 */
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

/**
 * @swagger
 * /api/attendance/monthly:
 *   get:
 *     tags: [Attendance]
 *     summary: Get monthly attendance aggregates per driver
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: Month in YYYY-MM or numeric format
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [TALABAT, KEETA, DELIVEROO, AMERICANA] }
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Per-driver monthly totals (present, absent, late, totalHours)
 */
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

/**
 * @swagger
 * /api/attendance/export:
 *   get:
 *     tags: [Attendance]
 *     summary: Export attendance records as XLSX
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [TALABAT, KEETA, DELIVEROO, AMERICANA] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: XLSX file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 */
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

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     tags: [Attendance]
 *     summary: Create an attendance record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId, date, status]
 *             properties:
 *               driverId: { type: string }
 *               date: { type: string, format: date }
 *               status: { type: string, enum: [PRESENT, LATE, ABSENT, EXCUSED] }
 *               source: { type: string }
 *               lateMinutes: { type: integer }
 *     responses:
 *       201:
 *         description: Created attendance record
 */
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

/**
 * POST /api/attendance/platform-clock — upsert platform clock-in/out for a driver+date.
 * Called by Keeta session sync, Talabat/Deliveroo/Americana importers, etc.
 * Recomputes variance and LATE status (platform time is the system of record).
 */
router.post("/platform-clock", async (req: Request, res: Response) => {
  try {
    const { driverId, date } = req.body as { driverId?: string; date?: string };
    if (!driverId || !date) { res.status(400).json({ error: "driverId and date required" }); return; }
    const record = await reconcilePlatformClock({
      tenantId: req.user!.tenantId,
      driverId,
      date,
      platformClockIn: req.body.platformClockIn,
      platformClockOut: req.body.platformClockOut,
      scheduledStart: req.body.scheduledStart,
    });
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
