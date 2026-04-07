import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET /api/platform-settings/:platform
router.get("/:platform", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = req.params.platform.toUpperCase();

    const settings = await prisma.platformSettings.findUnique({
      where: { tenantId_platform: { tenantId, platform: platform as any } },
    });

    if (!settings) {
      // Return defaults based on platform
      res.json({ platform, targets: getDefaultTargets(platform), kpis: getDefaultKpis(platform), shiftRules: getDefaultShiftRules(), zones: getDefaultZones(platform) });
      return;
    }

    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/platform-settings/:platform
router.put("/:platform", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = req.params.platform.toUpperCase();
    const { targets, kpis, shiftRules, zones } = req.body;

    const settings = await prisma.platformSettings.upsert({
      where: { tenantId_platform: { tenantId, platform: platform as any } },
      create: { tenantId, platform: platform as any, targets: targets || getDefaultTargets(platform), kpis, shiftRules, zones },
      update: { targets, kpis, shiftRules, zones },
    });

    res.json(settings);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/platform-settings/:platform/inventory
router.get("/:platform/inventory", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = req.params.platform.toUpperCase();

    // Get companies for this platform
    const companies = await prisma.company.findMany({
      where: { tenantId, platform: platform as any },
      select: { id: true, name: true },
    });

    const companyIds = companies.map((c) => c.id);

    const inventory = await prisma.companyInventory.findMany({
      where: { tenantId, companyId: { in: companyIds } },
      include: { company: { select: { name: true, platform: true } } },
      orderBy: { itemType: "asc" },
    });

    res.json({ data: inventory, companies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/platform-settings/:platform/inventory
router.put("/:platform/inventory", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { items } = req.body; // [{ companyId, itemType, total, minStock }]

    const results = [];
    for (const item of items) {
      const issued = item.issued || 0;
      const result = await prisma.companyInventory.upsert({
        where: { companyId_itemType: { companyId: item.companyId, itemType: item.itemType } },
        create: { tenantId, companyId: item.companyId, itemType: item.itemType, total: item.total, issued, available: item.total - issued, minStock: item.minStock || 0 },
        update: { total: item.total, issued, available: item.total - issued, minStock: item.minStock || 0 },
      });
      results.push(result);
    }

    res.json({ data: results });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

function getDefaultTargets(platform: string) {
  switch (platform) {
    case "TALABAT":
      return {
        mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 18, unit: "orders", description: "Target number of orders per shift" },
        subTargets: [
          { name: "Batch Number", key: "batchNumber", value: 1, unit: "batch", description: "Target batch number (1 = best, 7 = worst)" },
          { name: "Daily Hours", key: "dailyHours", value: 12, unit: "hours", description: "Expected hours per shift" },
          { name: "UTR", key: "utr", value: 100, unit: "%", description: "Utilization rate target" },
        ],
      };
    case "KEETA":
      return {
        mainTarget: { name: "Daily Hours", key: "dailyHours", value: 10, unit: "hours", description: "Target online hours per day" },
        subTargets: [
          { name: "On-time Login", key: "onTimeLogin", value: 100, unit: "%", description: "Login at scheduled time" },
          { name: "Number of Orders", key: "ordersPerDay", value: 15, unit: "orders", description: "Target deliveries per day" },
          { name: "Delivery On Time", key: "deliveryOnTime", value: 95, unit: "%", description: "On-time delivery rate" },
          { name: "Completion Rate", key: "completionRate", value: 98, unit: "%", description: "Order completion rate" },
        ],
      };
    case "AMERICANA":
      return {
        mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 20, unit: "orders", description: "Target orders per day" },
        subTargets: [
          { name: "Arrive on Time", key: "arriveOnTime", value: 100, unit: "%", description: "Arrive to store on time" },
        ],
      };
    case "DELIVEROO":
      return {
        mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 15, unit: "orders", description: "Target orders per day" },
        subTargets: [
          { name: "Daily Hours", key: "dailyHours", value: 10, unit: "hours", description: "Target online hours" },
        ],
      };
    default:
      return { mainTarget: { name: "Orders per Day", key: "ordersPerDay", value: 15, unit: "orders" }, subTargets: [] };
  }
}

function getDefaultKpis(platform: string) {
  switch (platform) {
    case "TALABAT":
      return {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Below Average", minPercent: 30, maxPercent: 49, color: "#f97316" },
          { label: "Failed", minPercent: 0, maxPercent: 29, color: "#ef4444" },
        ],
        weights: {
          ordersPerDay: 40,
          batchNumber: 30,
          attendance: 20,
          compliance: 10,
        },
        thresholds: {
          ordersExcellent: 18,
          ordersGood: 12,
          ordersMinimum: 8,
          batchBest: 1,
          batchWorst: 7,
        },
      };
    case "KEETA":
      return {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Below Average", minPercent: 30, maxPercent: 49, color: "#f97316" },
          { label: "Failed", minPercent: 0, maxPercent: 29, color: "#ef4444" },
        ],
        weights: {
          dailyHours: 30,
          onTimeLogin: 25,
          ordersPerDay: 20,
          deliveryOnTime: 15,
          completionRate: 10,
        },
      };
    default:
      return {
        gradingScale: [
          { label: "Excellent", minPercent: 90, maxPercent: 100, color: "#22c55e" },
          { label: "Good", minPercent: 70, maxPercent: 89, color: "#3b82f6" },
          { label: "Average", minPercent: 50, maxPercent: 69, color: "#f59e0b" },
          { label: "Failed", minPercent: 0, maxPercent: 49, color: "#ef4444" },
        ],
        weights: { ordersPerDay: 50, attendance: 30, compliance: 20 },
      };
  }
}

function getDefaultShiftRules() {
  return {
    defaultHoursPerShift: 12,
    maxLateMinutes: 1,
    earlyClockOutMinutes: 15,
    maxCashHoldKD: 50,
  };
}

function getDefaultZones(platform: string) {
  switch (platform) {
    case "TALABAT":
      return ["Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem"];
    case "KEETA":
      return ["Zone A", "Zone B", "Zone C"];
    default:
      return [];
  }
}

export default router;
