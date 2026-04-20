import XLSX from "xlsx";
import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { resolveRatesForMonth } from "../services/americanaRevenueService";

const router = Router();
router.use(authMiddleware, tenantScope);

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function nextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function vehicleTypeOf(position: string | null | undefined): "BIKE" | "CAR" {
  return (position || "").toLowerCase().includes("bike") ? "BIKE" : "CAR";
}

// GET /api/americana/export?month=YYYY-MM
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const monthStr = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const [y, m] = monthStr.split("-").map((v) => parseInt(v, 10));
    const thisMonth = new Date(y, m - 1, 1);
    const lastMonth = new Date(y, m - 2, 1);
    const from = firstOfMonth(thisMonth);
    const to = nextMonth(thisMonth);

    const [orders, prevOrders, chains, stores, rateMap] = await Promise.all([
      prisma.americanaDailyOrders.findMany({
        where: { tenantId, month: from },
        include: { driver: { select: { id: true, name: true, vehicleType: true } } },
      }),
      prisma.americanaDailyOrders.findMany({
        where: { tenantId, month: firstOfMonth(lastMonth) },
      }),
      prisma.americanaChain.findMany({ where: { tenantId } }),
      prisma.americanaStore.findMany({ where: { tenantId } }),
      resolveRatesForMonth(tenantId, from),
    ]);

    const chainMap = new Map(chains.map((c) => [c.id, c]));
    const storeMap = new Map(stores.map((s) => [s.id, s]));

    // Sheet 1: Summary — one row per (store, chain)
    const summaryRows: any[] = [];
    const byStore = new Map<string, { storeName: string; chainName: string; orders: number; prevOrders: number; position: string | null }>();
    for (const o of orders) {
      const storeKey = o.storeId || `name:${o.storeName || "Unknown"}`;
      const chainName = (o.chainId ? chainMap.get(o.chainId)?.name : null) || o.chain || "Unknown";
      const storeName = (o.storeId ? storeMap.get(o.storeId)?.name : null) || o.storeName || "Unknown";
      const existing = byStore.get(storeKey) ?? { storeName, chainName, orders: 0, prevOrders: 0, position: o.position };
      existing.orders += o.totalOrders || 0;
      byStore.set(storeKey, existing);
    }
    for (const o of prevOrders) {
      const storeKey = o.storeId || `name:${o.storeName || "Unknown"}`;
      const existing = byStore.get(storeKey);
      if (existing) existing.prevOrders += o.totalOrders || 0;
    }
    for (const [, v] of byStore) {
      const rateCar = rateMap.get(`${findChainIdByName(chains, v.chainName)}:CAR`);
      const rateBike = rateMap.get(`${findChainIdByName(chains, v.chainName)}:BIKE`);
      const rate = vehicleTypeOf(v.position) === "BIKE" ? rateBike : rateCar;
      const revenue = rate != null ? v.orders * rate : null;
      summaryRows.push({
        Store: v.storeName,
        Chain: v.chainName,
        Orders: v.orders,
        Rate: rate ?? "",
        Revenue: revenue ?? "",
        "Orders LM": v.prevOrders,
        "Delta %": v.prevOrders > 0 ? ((v.orders - v.prevOrders) / v.prevOrders) * 100 : null,
      });
    }

    // Sheet 2: Driver detail
    const driverRows: any[] = [];
    for (const o of orders) {
      const daily = (o.dailyOrders as Record<string, number>) || {};
      const dayKeys = Object.keys(daily);
      const presentDays = dayKeys.filter((k) => (daily[k] || 0) > 0).length;
      const scheduledDays = Math.max(dayKeys.length, presentDays);
      const attendancePct = scheduledDays > 0 ? Math.round((presentDays / scheduledDays) * 1000) / 10 : 0;
      const chainName = (o.chainId ? chainMap.get(o.chainId)?.name : null) || o.chain || "";
      const storeName = (o.storeId ? storeMap.get(o.storeId)?.name : null) || o.storeName || "";
      const rate = rateMap.get(`${o.chainId ?? ""}:${vehicleTypeOf(o.position)}`);
      const revenueShare = rate != null ? o.totalOrders * rate : null;
      const violations = await prisma.violation.count({
        where: {
          tenantId, driverId: o.driverId, platform: "AMERICANA",
          violationTime: { gte: from, lt: to },
        },
      });
      driverRows.push({
        Driver: o.driver.name,
        "Emp ID": o.empId || "",
        Chain: chainName,
        Store: storeName,
        Position: o.position || "",
        "Days Worked": presentDays,
        Orders: o.totalOrders,
        "Attendance %": attendancePct,
        Violations: violations,
        "Revenue Share": revenueShare ?? "",
      });
    }

    // Sheet 3: Invoice lines — one row per (chain, vehicleType)
    const invoice = new Map<string, { chain: string; vehicleType: string; orders: number; rate: number | null }>();
    for (const o of orders) {
      const chainName = (o.chainId ? chainMap.get(o.chainId)?.name : null) || o.chain || "Unknown";
      const vt = vehicleTypeOf(o.position);
      const key = `${chainName}|${vt}`;
      const rate = o.chainId ? rateMap.get(`${o.chainId}:${vt}`) ?? null : null;
      const existing = invoice.get(key) ?? { chain: chainName, vehicleType: vt, orders: 0, rate };
      existing.orders += o.totalOrders;
      invoice.set(key, existing);
    }
    const invoiceRows = Array.from(invoice.values()).map((row) => ({
      Chain: row.chain,
      "Vehicle Type": row.vehicleType,
      Orders: row.orders,
      Rate: row.rate ?? "",
      Revenue: row.rate != null ? row.orders * row.rate : "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(driverRows), "Driver detail");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), "Invoice lines");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=americana-${monthStr}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

function findChainIdByName(chains: { id: string; name: string }[], name: string): string {
  const hit = chains.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return hit?.id ?? "";
}

export default router;
