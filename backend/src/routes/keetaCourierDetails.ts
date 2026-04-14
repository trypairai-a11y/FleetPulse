import { Router, Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

const SLOTS = [0, 3, 6, 9, 12, 15, 18, 21];

function slotLabel(h: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:00-${pad(h + 3)}:00`;
}

async function buildRows(tenantId: string, from: Date, to: Date, filters: any) {
  const driverWhere: any = { tenantId, platform: "KEETA" };
  if (filters.courierId) driverWhere.id = filters.courierId;
  if (filters.vehicleType) driverWhere.vehicleType = filters.vehicleType;

  const drivers = await prisma.driver.findMany({
    where: driverWhere,
    select: { id: true, name: true, vehicleType: true, platformDriverId: true },
    orderBy: { name: "asc" },
  });
  const driverIds = drivers.map((d) => d.id);
  if (driverIds.length === 0) return [];

  const [metrics, slots] = await Promise.all([
    prisma.keetaDailyMetrics.findMany({
      where: { tenantId, driverId: { in: driverIds }, date: { gte: from, lte: to } },
    }),
    prisma.courierAttendanceSlot.findMany({
      where: { tenantId, driverId: { in: driverIds }, date: { gte: from, lte: to } },
    }),
  ]);

  // Group by driverId + date
  const key = (driverId: string, date: Date) => `${driverId}:${date.toISOString().slice(0, 10)}`;
  const metricsByKey = new Map(metrics.map((m) => [key(m.driverId, m.date), m]));
  const slotsByKey = new Map<string, any[]>();
  for (const s of slots) {
    const k = key(s.driverId, s.date);
    if (!slotsByKey.has(k)) slotsByKey.set(k, []);
    slotsByKey.get(k)!.push(s);
  }

  const rows: any[] = [];
  const startT = from.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const numDays = Math.max(1, Math.round((to.getTime() - startT) / dayMs) + 1);

  for (const d of drivers) {
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startT + i * dayMs);
      const k = key(d.id, date);
      const m = metricsByKey.get(k) as any;
      const daySlots = slotsByKey.get(k) || [];
      const slotMap = new Map(daySlots.map((s: any) => [s.slotStart, s]));
      const slotCells = SLOTS.map((h) => {
        const s = slotMap.get(h);
        return {
          start: `${String(h).padStart(2, "0")}:00`,
          end: `${String(h + 3).padStart(2, "0")}:00`,
          label: slotLabel(h),
          status: s?.status ?? "NO_SHIFT",
          onShiftMin: s?.onShiftMin ?? 0,
        };
      });
      if (!m && daySlots.length === 0) continue; // skip days with nothing
      rows.push({
        driverId: d.id,
        driverName: d.name,
        platformDriverId: d.platformDriverId,
        vehicleType: d.vehicleType,
        date: date.toISOString().slice(0, 10),
        onShift: m?.onShift ?? false,
        validDay: m?.validDay ?? false,
        courierAppOnlineTime: m?.onlineTime ?? 0,
        validOnlineTime: m?.validOnlineTime ?? 0,
        peakOnlineHours: Number(((m?.peakOnlineMinutes ?? 0) / 60).toFixed(2)),
        acceptedTasks: m?.acceptedTasks ?? 0,
        tasksWithRestaurantArrivals: m?.restaurantArrivals ?? 0,
        deliveredTasks: m?.deliveredTasks ?? 0,
        largeOrderTasksCompleted: m?.largeOrdersCompleted ?? 0,
        cancelledTasks: m?.cancelledTasks ?? 0,
        slots: slotCells,
      });
    }
  }
  return rows;
}

function parseRange(req: Request) {
  const from = req.query.from ? new Date(req.query.from as string) : new Date();
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { from, to } = parseRange(req);
    const filters = {
      courierId: req.query.courierId as string | undefined,
      vehicleType: req.query.vehicleType as string | undefined,
    };
    const rows = await buildRows(tenantId, from, to, filters);
    const total = rows.length;
    const paged = rows.slice(skip, skip + limit);
    res.json(paginatedResponse(paged, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export.xlsx", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { from, to } = parseRange(req);
    const filters = {
      courierId: req.query.courierId as string | undefined,
      vehicleType: req.query.vehicleType as string | undefined,
    };
    const rows = await buildRows(tenantId, from, to, filters);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("CourierDetails");
    const slotHeaders = SLOTS.map(slotLabel);
    ws.columns = [
      { header: "Courier", key: "driverName", width: 24 },
      { header: "Courier ID", key: "platformDriverId", width: 14 },
      { header: "Vehicle", key: "vehicleType", width: 12 },
      { header: "Date", key: "date", width: 12 },
      { header: "On Shift", key: "onShift", width: 10 },
      { header: "Valid Day", key: "validDay", width: 10 },
      { header: "Online (min)", key: "courierAppOnlineTime", width: 12 },
      { header: "Valid Online", key: "validOnlineTime", width: 12 },
      { header: "Peak Online (h)", key: "peakOnlineHours", width: 14 },
      { header: "Accepted", key: "acceptedTasks", width: 10 },
      { header: "Restaurant Arrivals", key: "tasksWithRestaurantArrivals", width: 16 },
      { header: "Delivered", key: "deliveredTasks", width: 10 },
      { header: "Large Orders", key: "largeOrderTasksCompleted", width: 12 },
      { header: "Cancelled", key: "cancelledTasks", width: 10 },
      ...slotHeaders.map((h) => ({ header: h, key: h, width: 14 })),
    ];

    for (const r of rows) {
      const base: any = {
        driverName: r.driverName,
        platformDriverId: r.platformDriverId,
        vehicleType: r.vehicleType,
        date: r.date,
        onShift: r.onShift,
        validDay: r.validDay,
        courierAppOnlineTime: r.courierAppOnlineTime,
        validOnlineTime: r.validOnlineTime,
        peakOnlineHours: r.peakOnlineHours,
        acceptedTasks: r.acceptedTasks,
        tasksWithRestaurantArrivals: r.tasksWithRestaurantArrivals,
        deliveredTasks: r.deliveredTasks,
        largeOrderTasksCompleted: r.largeOrderTasksCompleted,
        cancelledTasks: r.cancelledTasks,
      };
      for (const s of r.slots) {
        base[s.label] = s.status === "ON_SHIFT" ? "On Shift 3 hr"
          : s.status === "PARTIAL" ? `${Math.floor(s.onShiftMin / 60)} hr ${s.onShiftMin % 60} min`
          : "No Shift";
      }
      const row = ws.addRow(base);
      for (let i = 0; i < SLOTS.length; i++) {
        const slot = r.slots[i];
        if (slot.status === "NO_SHIFT") {
          const col = ws.columns.length - SLOTS.length + i + 1;
          row.getCell(col).fill = {
            type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF59D" },
          };
        }
      }
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="keeta-courier-details-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
