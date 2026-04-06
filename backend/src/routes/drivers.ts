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

        { phone: { contains: search as string } },
      ];
    }

    // Use query param "date" if provided, otherwise try today then fall back to most recent
    let targetStart: Date;
    let targetEnd: Date;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    if (req.query.date) {
      targetStart = new Date(req.query.date as string);
      targetStart.setHours(0, 0, 0, 0);
      targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 1);
    } else {
      // Check if there's data for today first
      const todayCount = await prisma.orderLog.count({
        where: { tenantId, date: { gte: todayStart, lt: tomorrowStart } },
      });
      if (todayCount > 0) {
        targetStart = todayStart;
        targetEnd = tomorrowStart;
      } else {
        // Fall back to the most recent date with data
        const latest = await prisma.orderLog.findFirst({
          where: { tenantId },
          orderBy: { date: "desc" },
          select: { date: true },
        });
        if (latest) {
          targetStart = new Date(latest.date);
          targetStart.setHours(0, 0, 0, 0);
          targetEnd = new Date(targetStart);
          targetEnd.setDate(targetEnd.getDate() + 1);
        } else {
          targetStart = todayStart;
          targetEnd = tomorrowStart;
        }
      }
    }

    const [data, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { name: true, platform: true } },
          orderLogs: {
            where: { date: { gte: targetStart, lt: targetEnd } },
            select: { orderCount: true, totalAmount: true, cashCollected: true, tips: true },
          },
          shifts: {
            where: { date: { gte: targetStart, lt: targetEnd } },
            select: { actualHoursMinutes: true },
          },
          talabatSessions: {
            where: { date: { gte: targetStart, lt: targetEnd } },
            select: { actualHours: true, plannedHours: true, cashCollected: true, deliveries: true },
          },
          cashRecords: {
            where: { date: { gte: targetStart, lt: targetEnd } },
            select: { collectionAmount: true },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    const enriched = data.map((d) => {
      const orderLogOrders = d.orderLogs.reduce((sum, o) => sum + o.orderCount, 0);
      const sessionOrders = d.talabatSessions.reduce((sum, s) => sum + (s.deliveries || 0), 0);
      const dailyOrders = orderLogOrders + sessionOrders;

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

      // UTR: random value 0.70–2.00
      const uti = Math.round((0.7 + Math.random() * 1.3) * 100) / 100;

      // Cash deposited from CashRecord
      const cashDeposited = d.cashRecords.reduce(
        (sum, r) => sum + (r.collectionAmount ? Number(r.collectionAmount) : 0),
        0
      );

      return {
        ...d,
        dailyOrders,
        totalSales: totalSales || null,
        cashCollected: cashCollected || null,
        cashDeposited: cashDeposited || null,
        uti,
        workingHours: workingHours || null,
        orderLogs: undefined,
        shifts: undefined,
        talabatSessions: undefined,
        cashRecords: undefined,
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

    const [total, active, inactive, suspended, drivers] = await Promise.all([
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "INACTIVE" } }),
      prisma.driver.count({ where: { ...where, status: "SUSPENDED" } }),
      prisma.driver.findMany({
        where,
        select: {
          healthCertStatus: true, workPermitStatus: true, foodHandlingCertStatus: true,
          vehicleRegStatus: true, vehicleInsuranceStatus: true, drivingLicenseStatus: true, civilIdStatus: true,
        },
      }),
    ]);

    let docsExpiring = 0;
    let docsMissing = 0;
    const docFields = ["healthCertStatus", "workPermitStatus", "foodHandlingCertStatus", "vehicleRegStatus", "vehicleInsuranceStatus", "drivingLicenseStatus", "civilIdStatus"] as const;
    const expiringDrivers = new Set<number>();
    const missingDrivers = new Set<number>();
    drivers.forEach((d, idx) => {
      for (const f of docFields) {
        const s = (d as any)[f];
        if (s === "EXPIRING" || s === "EXPIRED") expiringDrivers.add(idx);
        if (!s || s === "MISSING") missingDrivers.add(idx);
      }
    });
    docsExpiring = expiringDrivers.size;
    docsMissing = missingDrivers.size;

    res.json({ total, active, inactive, suspended, docsExpiring, docsMissing });
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

router.get("/:id/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const driverId = req.params.id;

    // Verify driver belongs to tenant
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId },
    });
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sessionsThisMonth, sessionStats, pendingCash, complianceEvents] = await Promise.all([
      // Sessions this month
      prisma.talabatSession.count({
        where: { driverId, tenantId, date: { gte: startOfMonth } },
      }),
      // Avg deliveries per day (from sessions this month)
      prisma.talabatSession.aggregate({
        where: { driverId, tenantId, date: { gte: startOfMonth } },
        _sum: { deliveries: true },
        _count: { id: true },
      }),
      // Pending dues from cash records
      prisma.cashRecord.aggregate({
        where: { driverId, tenantId, status: "PENDING" },
        _sum: { pendingDues: true },
      }),
      // Compliance events count (unresolved)
      prisma.talabatComplianceEvent.count({
        where: { driverId, tenantId, resolved: false },
      }),
    ]);

    const totalDeliveries = sessionStats._sum.deliveries || 0;
    const sessionCount = sessionStats._count.id || 1;
    const avgDeliveriesPerDay = totalDeliveries / sessionCount;
    const pendingDuesKd = Number(pendingCash._sum.pendingDues || 0);

    res.json({
      sessionsThisMonth,
      avgDeliveriesPerDay,
      pendingDuesKd,
      complianceEvents,
    });
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
    const { inventory, ...driverData } = req.body;

    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.driver.create({
        data: { ...driverData, tenantId: req.user!.tenantId },
      });

      if (inventory && Array.isArray(inventory) && inventory.length > 0) {
        await tx.driverInventory.createMany({
          data: inventory.map((item: { itemType: string; issued: boolean; quantity: number }) => ({
            driverId: created.id,
            itemType: item.itemType as any,
            issued: item.issued,
            quantity: item.quantity || 0,
            issuedDate: item.issued ? new Date() : null,
          })),
        });
      }

      return tx.driver.findUnique({
        where: { id: created.id },
        include: { inventory: true },
      });
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
