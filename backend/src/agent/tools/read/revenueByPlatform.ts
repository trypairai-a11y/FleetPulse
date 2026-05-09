import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 * Wraps OrderLog with groupBy on platform column.
 */
export const revenueByPlatform = defineTool({
  name: "revenueByPlatform",
  description:
    "Return order volume and gross delivery revenue (KD with 3 decimals) grouped by platform (KEETA/TALABAT/DELIVEROO/AMERICANA) for a date range. Use to answer 'which platform contributed most this week', or to compose the briefing platform-mix line. Returns one row per platform that had at least one OrderLog row in the range. Tenant-scoped, default lookback up to the supplied dateFrom (no truncation — caller controls the range).",
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
    const rows = await prisma.orderLog.groupBy({
      by: ["platform"],
      where: {
        tenantId: ctx.tenantId,
        date: { gte: fromDate, lte: toDate },
      },
      _sum: { orderCount: true, totalAmount: true },
      _count: { id: true },
    });
    return rows.map((r) => ({
      platform: r.platform,
      orders: r._sum.orderCount ?? 0,
      revenueKd: Number(r._sum.totalAmount ?? 0).toFixed(3),
      orderLogRows: r._count.id,
    }));
  },
});

export function registerRevenueByPlatformTool() {
  toolRegistry.register(revenueByPlatform);
}

registerRevenueByPlatformTool();
