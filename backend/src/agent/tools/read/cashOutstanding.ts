import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Lists CashRecord rows with status PENDING or PARTIALLY_PAID. EXCLUDES
 * Americana drivers per CON-cash-platform-coverage (Americana platform doesn't
 * use the cash flow — drivers are paid through a different settlement model).
 *
 * Returns one row per outstanding CashRecord with the driver context, all KD
 * amounts at 3-decimal precision, an ageDays computed field, and the status.
 */
export const cashOutstanding = defineTool({
  name: "cashOutstanding",
  description:
    "List CashRecord rows with outstanding pendingDues (status PENDING or PARTIALLY_PAID). Each row carries driver name + ID, platform, date, sales/collected/pending KD amounts (3 decimals), an ageDays computed field, and CashRecord status. Only covers Keeta, Talabat, Deliveroo (Americana excluded by design — CON-cash-platform-coverage). Use for the Reconciliation Agent's cash-outstanding sweep, the dashboard's 'who owes us money' card, or chat 'what's outstanding for driver X'. Tenant-scoped, default lookback 60 days, default limit 50, max 200.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string", description: "Optional: scope to one driver." },
      platform: {
        type: "string",
        enum: ["KEETA", "TALABAT", "DELIVEROO"],
        description:
          "Optional platform filter. Note: Americana is intentionally excluded by CON-cash-platform-coverage and not a valid value here.",
      },
      daysBack: {
        type: "number",
        description: "How many days back to search (default 60, max 365).",
      },
      limit: { type: "number", description: "Default 50, max 200." },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({
    driverId: z.string().optional(),
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO"]).optional(),
    daysBack: z.number().int().min(1).max(365).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const daysBack = input.daysBack ?? 60;
    const limit = Math.min(input.limit ?? 50, 200);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - daysBack);

    const rows = await prisma.cashRecord.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        date: { gte: since },
        // CON-cash-platform-coverage: Americana excluded by design.
        driver: {
          platform: { not: "AMERICANA" },
          ...(input.platform ? { platform: input.platform } : {}),
        },
        ...(input.driverId ? { driverId: input.driverId } : {}),
      },
      include: {
        driver: { select: { id: true, name: true, platform: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
    });
    const now = Date.now();
    return rows.map((r) => {
      const sales = Number(r.salesAmount ?? 0);
      const collected = Number(r.collectionAmount ?? 0);
      const pending = Number(r.pendingDues ?? 0);
      const ageDays = Math.floor((now - r.date.getTime()) / 86_400_000);
      return {
        cashRecordId: r.id,
        driverId: r.driver?.id ?? null,
        driverName: r.driver?.name ?? null,
        platform: r.driver?.platform ?? null,
        date: r.date.toISOString().slice(0, 10),
        salesKd: sales.toFixed(3),
        collectedKd: collected.toFixed(3),
        pendingKd: pending.toFixed(3),
        ageDays,
        status: r.status,
      };
    });
  },
});

export function registerCashOutstandingTool() {
  toolRegistry.register(cashOutstanding);
}

registerCashOutstandingTool();
