import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { upload } from "../utils/upload";
import { parseAmericanaXlsx } from "../services/americanaXlsxParser";
import fs from "fs";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── Orders ──────────────────────────────────────────────────────────────────

// GET /orders — List AmericanaDailyOrders with filters, paginated
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { month, driverId, storeName } = req.query;
    const where: any = { tenantId };

    if (driverId) where.driverId = driverId;
    if (storeName) where.storeName = { contains: storeName as string, mode: "insensitive" };
    if (month) {
      // Match by month range to handle timezone offsets (same pattern as cash.ts)
      const monthStr = month as string; // "2026-03" or "2026-03-01"
      const parts = monthStr.split("-");
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const startOfMonth = new Date(y, m, 1);
      startOfMonth.setDate(startOfMonth.getDate() - 1); // buffer for timezone
      const endOfMonth = new Date(y, m + 1, 1);
      endOfMonth.setDate(endOfMonth.getDate() + 1); // buffer for timezone
      where.month = { gte: startOfMonth, lt: endOfMonth };
    }

    const [data, total] = await Promise.all([
      prisma.americanaDailyOrders.findMany({
        where, skip, take: limit,
        orderBy: { month: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.americanaDailyOrders.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/summary — Aggregate stats for a given month
router.get("/orders/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { month } = req.query;
    const where: any = { tenantId };

    if (month) {
      const monthStr = month as string;
      const parts = monthStr.split("-");
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const startOfMonth = new Date(y, m, 1);
      startOfMonth.setDate(startOfMonth.getDate() - 1);
      const endOfMonth = new Date(y, m + 1, 1);
      endOfMonth.setDate(endOfMonth.getDate() + 1);
      where.month = { gte: startOfMonth, lt: endOfMonth };
    }

    const records = await prisma.americanaDailyOrders.findMany({
      where,
      select: { driverId: true, totalOrders: true, storeName: true },
    });

    const uniqueDrivers = new Set(records.map((r) => r.driverId));
    const totalOrders = records.reduce((sum, r) => sum + (r.totalOrders || 0), 0);
    const totalDrivers = uniqueDrivers.size;
    const avgOrdersPerDriver = totalDrivers > 0
      ? Math.round((totalOrders / totalDrivers) * 10) / 10
      : 0;

    // Store breakdown: orders per store
    const storeMap: Record<string, number> = {};
    for (const r of records) {
      const store = r.storeName || "Unknown";
      storeMap[store] = (storeMap[store] || 0) + (r.totalOrders || 0);
    }
    const storeBreakdown = Object.entries(storeMap)
      .map(([store, orders]) => ({ store, orders }))
      .sort((a, b) => b.orders - a.orders);

    res.json({
      totalDrivers,
      totalOrders,
      avgOrdersPerDriver,
      storeBreakdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/:id — Single record with driver
router.get("/orders/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.americanaDailyOrders.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true },
    });
    if (!record) { res.status(404).json({ error: "Order record not found" }); return; }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /orders — Create
router.post("/orders", async (req: Request, res: Response) => {
  try {
    const record = await prisma.americanaDailyOrders.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /orders/:id — Update
router.put("/orders/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.americanaDailyOrders.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (record.count === 0) { res.status(404).json({ error: "Order record not found" }); return; }
    const updated = await prisma.americanaDailyOrders.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Driver Summary ──────────────────────────────────────────────────────────

// GET /drivers/summary — Americana driver stats
router.get("/drivers/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Total distinct drivers with any Americana orders
    const allDrivers = await prisma.americanaDailyOrders.findMany({
      where: { tenantId },
      select: { driverId: true },
      distinct: ["driverId"],
    });

    // Active drivers: those with orders in the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setDate(startOfMonth.getDate() - 1); // timezone buffer
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    endOfMonth.setDate(endOfMonth.getDate() + 1);

    const [activeDrivers, monthAgg] = await Promise.all([
      prisma.americanaDailyOrders.findMany({
        where: { tenantId, month: { gte: startOfMonth, lt: endOfMonth } },
        select: { driverId: true },
        distinct: ["driverId"],
      }),
      prisma.americanaDailyOrders.aggregate({
        where: { tenantId, month: { gte: startOfMonth, lt: endOfMonth } },
        _sum: { totalOrders: true },
        _count: { id: true },
      }),
    ]);

    const activeCount = activeDrivers.length;
    const totalOrdersThisMonth = monthAgg._sum.totalOrders || 0;
    // Approximate avg orders/day: totalOrders / activeDrivers / days elapsed in month
    const dayOfMonth = Math.max(1, now.getDate());
    const avgOrdersPerDay = activeCount > 0
      ? Math.round((totalOrdersThisMonth / activeCount / dayOfMonth) * 10) / 10
      : 0;

    res.json({
      totalDrivers: allDrivers.length,
      activeDrivers: activeCount,
      avgOrdersPerDay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Import ──────────────────────────────────────────────────────────────────

// POST /import — Parse uploaded Americana monthly XLSX file
router.post("/import", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const tenantId = req.user!.tenantId;
    const { month } = req.body;

    const buffer = fs.readFileSync(req.file.path);
    const rows = parseAmericanaXlsx(buffer);

    if (rows.length === 0) {
      res.status(400).json({ error: "No data rows found in file" });
      return;
    }

    // Determine month: prefer explicit body param, then auto-detected from headers
    let monthDate: Date;
    if (month) {
      const parts = (month as string).split("-");
      monthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    } else if (rows[0].detectedMonth) {
      monthDate = rows[0].detectedMonth;
    } else {
      monthDate = new Date();
      monthDate.setDate(1);
    }
    monthDate.setHours(0, 0, 0, 0);

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (!row.empId) {
          errors.push(`Row missing Emp ID: ${row.driverName || "unknown"}`);
          continue;
        }

        // Look up driver by platformDriverId matching empId, or by name
        let driver = await prisma.driver.findFirst({
          where: {
            tenantId,
            platformDriverId: row.empId,
          },
        });

        if (!driver && row.driverName) {
          driver = await prisma.driver.findFirst({
            where: {
              tenantId,
              name: { equals: row.driverName, mode: "insensitive" },
            },
          });
        }

        if (!driver) {
          errors.push(`Driver not found: ${row.empId} (${row.driverName || "unknown"})`);
          continue;
        }

        await prisma.americanaDailyOrders.upsert({
          where: {
            tenantId_driverId_month: {
              tenantId,
              driverId: driver.id,
              month: monthDate,
            },
          },
          create: {
            tenantId,
            driverId: driver.id,
            month: monthDate,
            chain: row.chain,
            empId: row.empId,
            storeName: row.storeName,
            costCenter: row.costCenter,
            company: row.company,
            position: row.position,
            dailyOrders: row.dailyOrders,
            totalOrders: row.totalOrders,
            source: "XLSX_IMPORT",
          },
          update: {
            chain: row.chain,
            empId: row.empId,
            storeName: row.storeName,
            costCenter: row.costCenter,
            company: row.company,
            position: row.position,
            dailyOrders: row.dailyOrders,
            totalOrders: row.totalOrders,
            source: "XLSX_IMPORT",
          },
        });

        imported++;
      } catch (rowErr: any) {
        errors.push(`Error processing ${row.empId}: ${rowErr.message}`);
      }
    }

    res.json({ imported, total: rows.length, errors });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
