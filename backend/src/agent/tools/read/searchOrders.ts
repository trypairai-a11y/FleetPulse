import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Phase 1 scope (orchestrator resolution #2): searchOrders ships against the
 * OrderLog (per-driver-per-day aggregate) — NOT a per-individual-order Order
 * model. Phase 2/3 may add `model Order` later if per-order detail becomes a
 * blocker; in Phase 1 the agent reasons over daily aggregates.
 */
export const searchOrders = defineTool({
  name: "searchOrders",
  description:
    "Search OrderLog (per-driver-per-day aggregate) with filters. Returns matching rows: orderLogId, driverId, driverName, platform, date (YYYY-MM-DD), orderCount, totalKd. Use for 'how many orders did driver X complete this week', 'show me Talabat orders >50KD this month', or general order-volume questions. Phase 1 scope is the per-day aggregate — per-individual-order detail (e.g. for Order Flow Timeline) requires a future Order model. Tenant-scoped, default lookback 30 days, default limit 50, max 100.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Optional free-text query — matches orderNumber or restaurantName (case-insensitive contains).",
      },
      driverId: { type: "string", description: "Optional: scope to one driver." },
      platform: {
        type: "string",
        enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
        description: "Optional platform filter.",
      },
      dateFrom: {
        type: "string",
        description: "ISO date YYYY-MM-DD, inclusive. Defaults to 30 days ago.",
      },
      dateTo: {
        type: "string",
        description: "ISO date YYYY-MM-DD, inclusive. Defaults to today.",
      },
      minTotalKd: {
        type: "number",
        description: "Filter to rows where totalAmount >= this value.",
      },
      minOrderCount: {
        type: "number",
        description: "Filter to rows where orderCount >= this value.",
      },
      limit: { type: "number", description: "Default 50, max 100." },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({
    query: z.string().optional(),
    driverId: z.string().optional(),
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"]).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    minTotalKd: z.number().min(0).optional(),
    minOrderCount: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const limit = Math.min(input.limit ?? 50, 100);
    const dateTo = input.dateTo ? new Date(input.dateTo) : new Date();
    const dateFrom = input.dateFrom
      ? new Date(input.dateFrom)
      : new Date(dateTo.getTime() - 30 * 86_400_000);
    const queryFilter = input.query
      ? {
          OR: [
            { orderNumber: { contains: input.query, mode: "insensitive" as const } },
            { restaurantName: { contains: input.query, mode: "insensitive" as const } },
          ],
        }
      : {};

    const rows = await prisma.orderLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(input.driverId ? { driverId: input.driverId } : {}),
        ...(input.platform ? { platform: input.platform } : {}),
        date: { gte: dateFrom, lte: dateTo },
        ...(input.minTotalKd != null ? { totalAmount: { gte: input.minTotalKd } } : {}),
        ...(input.minOrderCount != null
          ? { orderCount: { gte: input.minOrderCount } }
          : {}),
        ...queryFilter,
      },
      include: { driver: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      orderLogId: r.id,
      driverId: r.driver?.id ?? r.driverId,
      driverName: r.driver?.name ?? null,
      platform: r.platform,
      date: r.date.toISOString().slice(0, 10),
      orderCount: r.orderCount ?? 0,
      totalKd: Number(r.totalAmount ?? 0).toFixed(3),
    }));
  },
});

export function registerSearchOrdersTool() {
  toolRegistry.register(searchOrders);
}

registerSearchOrdersTool();
