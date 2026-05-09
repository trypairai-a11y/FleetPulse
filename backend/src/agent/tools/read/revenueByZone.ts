import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Joins OrderLog -> Driver.zone (Driver has a `zone` String? column). Aggregates
 * orders, revenue, and unique driver count per zone. The aggregation runs in
 * JS because Prisma's groupBy doesn't traverse relations directly; the OrderLog
 * findMany is bounded by `take: 5000` to keep payload size in check.
 */
export const revenueByZone = defineTool({
  name: "revenueByZone",
  description:
    "Return order volume, gross delivery revenue (KD), and unique driver count grouped by Driver.zone for a date range. Use to surface the geographic breakdown of revenue or answer 'which zone contributed most this week'. Zone comes from the Driver record (Salmiya, Hawally, Avenues, Jabriya, etc.); rows where Driver.zone is null are bucketed as '(unknown)'. Tenant-scoped. Bounded at 5000 OrderLog rows for the JS-side aggregation.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dateFrom: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      dateTo: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
    },
    required: ["dateFrom", "dateTo"],
    additionalProperties: false,
  },
  inputValidator: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const fromDate = new Date(input.dateFrom);
    const toDate = new Date(input.dateTo);
    const rows = await prisma.orderLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        date: { gte: fromDate, lte: toDate },
      },
      select: {
        date: true,
        orderCount: true,
        totalAmount: true,
        driverId: true,
        driver: { select: { id: true, zone: true } },
      },
      take: 5000,
    });
    type Acc = { orders: number; revenue: number; drivers: Set<string> };
    const byZone = new Map<string, Acc>();
    for (const r of rows) {
      const zone = r.driver?.zone ?? "(unknown)";
      const acc = byZone.get(zone) ?? { orders: 0, revenue: 0, drivers: new Set() };
      acc.orders += r.orderCount ?? 0;
      acc.revenue += Number(r.totalAmount ?? 0);
      if (r.driver?.id) acc.drivers.add(r.driver.id);
      byZone.set(zone, acc);
    }
    return [...byZone.entries()].map(([zone, v]) => ({
      zone,
      orders: v.orders,
      revenueKd: v.revenue.toFixed(3),
      drivers: v.drivers.size,
    }));
  },
});

export function registerRevenueByZoneTool() {
  toolRegistry.register(revenueByZone);
}

registerRevenueByZoneTool();
