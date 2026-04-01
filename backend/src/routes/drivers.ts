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
    const { platform, status, companyId, zone, batchNumber, search } = req.query;

    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (status) {
      const vals = (status as string).split(",").filter(Boolean);
      where.status = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (companyId) {
      const ids = (companyId as string).split(",").filter(Boolean);
      where.companyId = ids.length === 1 ? ids[0] : { in: ids };
    }
    if (zone) {
      const vals = (zone as string).split(",").filter(Boolean);
      where.zone = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (batchNumber) {
      const vals = (batchNumber as string).split(",").filter(Boolean);
      where.batchNumber = vals.length === 1 ? vals[0] : { in: vals };
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { platformDriverId: { contains: search as string, mode: "insensitive" } },
        { utr: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
      ];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [data, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true, platform: true } },
          orderLogs: {
            where: { date: { gte: todayStart, lt: tomorrowStart } },
            select: { orderCount: true, totalAmount: true, cashCollected: true, tips: true },
          },
          shifts: {
            where: { date: { gte: todayStart, lt: tomorrowStart } },
            select: { actualHoursMinutes: true },
          },
          talabatSessions: {
            where: { date: { gte: todayStart, lt: tomorrowStart } },
            select: { actualHours: true, cashCollected: true, deliveries: true },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    const enriched = data.map((d) => {
      const dailyOrders = d.orderLogs.reduce((sum, o) => sum + o.orderCount, 0);

      // Sales: sum of totalAmount from orderLogs, fallback to cashCollected + tips
      const totalSales = d.orderLogs.reduce(
        (sum, o) => {
          if (o.totalAmount) return sum + Number(o.totalAmount);
          const cash = o.cashCollected ? Number(o.cashCollected) : 0;
          const tips = o.tips ? Number(o.tips) : 0;
          return sum + cash + tips;
        },
        0
      );

      // Cash: sum from orderLogs + talabatSessions
      const orderCash = d.orderLogs.reduce(
        (sum, o) => sum + (o.cashCollected ? Number(o.cashCollected) : 0),
        0
      );
      const sessionCash = d.talabatSessions.reduce(
        (sum, s) => sum + Number(s.cashCollected),
        0
      );
      const cashCollected = orderCash + sessionCash;

      // Hours: from shifts (actualHoursMinutes) or talabatSessions (actualHours)
      const shiftHours = d.shifts.reduce(
        (sum, s) => sum + (s.actualHoursMinutes ? s.actualHoursMinutes / 60 : 0),
        0
      );
      const sessionHours = d.talabatSessions.reduce(
        (sum, s) => sum + (s.actualHours ? Number(s.actualHours) : 0),
        0
      );
      const workingHours = shiftHours + sessionHours;

      return {
        ...d,
        dailyOrders,
        totalSales: totalSales || null,
        cashCollected: cashCollected || null,
        workingHours: workingHours || null,
        orderLogs: undefined,
        shifts: undefined,
        talabatSessions: undefined,
      };
    });

    res.json(paginatedResponse(enriched, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, companyId } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (companyId) {
      const ids = (companyId as string).split(",").filter(Boolean);
      where.companyId = ids.length === 1 ? ids[0] : { in: ids };
    }

    const [total, active, inactive, suspended] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "SUSPENDED" } }),
    ]);

    res.json({ total, active, inactive, suspended, docsExpiring: 0, docsMissing: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, status, companyId } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const drivers = await prisma.driver.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    });

    const rows = drivers.map((d) => ({
      Name: d.name,
      Platform: d.platform,
      "Platform ID": d.platformDriverId || "",
      Status: d.status,
      Phone: d.phone || "",
      Zone: d.zone || "",
      "Vehicle Type": d.vehicleType || "",
      Company: d.company?.name || "",
      "Hire Date": d.hireDate ? new Date(d.hireDate).toLocaleDateString() : "",
    }));

    sendXlsx(res, rows, "Drivers", "drivers-report.xlsx");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        company: true,
        inventory: true,
        supervisor: { select: { id: true, name: true } },
        assignedVehicle: true,
      },
    });
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json(driver);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(driver);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (driver.count === 0) { res.status(404).json({ error: "Driver not found" }); return; }
    const updated = await prisma.driver.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.driver.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Driver deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
