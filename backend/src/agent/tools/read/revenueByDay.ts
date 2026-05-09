import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Wraps OrderLog (per-driver-per-day aggregate). Groups by date and sums
 * orderCount + totalAmount. Tenant-scoped via where.tenantId = ctx.tenantId.
 */
export const revenueByDay = defineTool({
  name: "revenueByDay",
  description:
    "Return total completed orders, gross delivery revenue (KD with 3 decimals), and OrderLog row count grouped by day for a date range. Use this for trend questions, morning briefings, and Tue-vs-Wed comparisons. Tenant-scoped. Returns at most 90 days; if dateTo - dateFrom exceeds 90 days the tool truncates the older end. Optional platform filter (KEETA/TALABAT/DELIVEROO/AMERICANA).",
  inputSchema: {
    type: "object" as const,
    properties: {
      dateFrom: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      dateTo: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      platform: {
        type: "string",
        enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
        description: "Optional platform filter.",
      },
    },
    required: ["dateFrom", "dateTo"],
    additionalProperties: false,
  },
  inputValidator: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"]).optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const fromDate = new Date(input.dateFrom);
    const toDate = new Date(input.dateTo);
    const ninetyDaysAgo = new Date(toDate.getTime() - 89 * 86_400_000);
    if (fromDate < ninetyDaysAgo) {
      // Truncate the older end — keep the most recent 90 days.
      fromDate.setTime(ninetyDaysAgo.getTime());
    }
    const rows = await prisma.orderLog.groupBy({
      by: ["date"],
      where: {
        tenantId: ctx.tenantId,
        date: { gte: fromDate, lte: toDate },
        ...(input.platform ? { platform: input.platform } : {}),
      },
      _sum: { orderCount: true, totalAmount: true },
      _count: { id: true },
      orderBy: { date: "asc" },
    });
    return rows.map((r) => ({
      day: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      completedOrders: r._sum.orderCount ?? 0,
      grossRevenueKd: Number(r._sum.totalAmount ?? 0).toFixed(3),
      orderLogRows: r._count.id,
    }));
  },
});

export function registerRevenueByDayTool() {
  toolRegistry.register(revenueByDay);
}

// Side-effect register on import (matches tenantIsolation.test.ts pattern).
registerRevenueByDayTool();
