import { z } from "zod";
import { prisma } from "../../../config";
import { createViolationWithAlert } from "../../../services/violationEngine";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Reconciliation Agent tools. Scope: `CashRecord` rows where
 *   salesAmount ≠ collectionAmount + pendingDues.
 *
 * Narrative notes auto-execute (descriptive, reversible). Violation creation
 * via `flagForReview` requires human approval.
 */

const getDriverDayLedger = defineTool({
  name: "getDriverDayLedger",
  description:
    "Get a driver's cash ledger for a specific date: the CashRecord, all CashTransaction rows, and any pending-dues ledger entries.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string" },
      date: { type: "string", description: "ISO date (YYYY-MM-DD or full ISO)" },
    },
    required: ["driverId", "date"],
  },
  inputValidator: z.object({ driverId: z.string(), date: z.string() }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"],
  requiresApproval: false,
  allowedAgents: ["reconciliation", "triage", "chat"],
  async execute(ctx, input) {
    const day = new Date(input.date);
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // PendingDuesLedger is monthly-bucketed — find the row whose month covers this day.
    const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));
    const [cashRecord, transactions, pendingLedger] = await Promise.all([
      prisma.cashRecord.findFirst({
        where: { tenantId: ctx.tenantId, driverId: input.driverId, date: { gte: dayStart, lt: dayEnd } },
      }),
      prisma.cashTransaction.findMany({
        where: { tenantId: ctx.tenantId, driverId: input.driverId, date: { gte: dayStart, lt: dayEnd } },
        orderBy: { date: "asc" },
      }),
      prisma.pendingDuesLedger.findFirst({
        where: { tenantId: ctx.tenantId, driverId: input.driverId, month: monthStart },
      }),
    ]);

    if (!cashRecord) return { error: "No CashRecord for that driver/date" };
    const sales = Number(cashRecord.salesAmount);
    const collected = Number(cashRecord.collectionAmount);
    const pending = Number(cashRecord.pendingDues);
    const gap = +(sales - collected - pending).toFixed(3);
    return {
      cashRecord: {
        id: cashRecord.id,
        date: cashRecord.date.toISOString(),
        sales: sales.toFixed(3),
        collected: collected.toFixed(3),
        pending: pending.toFixed(3),
        gapKd: gap.toFixed(3),
        status: cashRecord.status,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount).toFixed(3),
        date: t.date.toISOString(),
        description: t.description,
      })),
      pendingLedger: pendingLedger
        ? {
            id: pendingLedger.id,
            month: pendingLedger.month.toISOString(),
            closingBalance: Number(pendingLedger.closingBalance).toFixed(3),
            status: pendingLedger.status,
          }
        : null,
    };
  },
});

const getOrderFlowForDriver = defineTool({
  name: "getOrderFlowForDriver",
  description:
    "Get raw OrderEvent rows for a driver on a given date, ordered chronologically — useful for matching refunds/cancellations to cash gaps.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string" },
      date: { type: "string" },
    },
    required: ["driverId", "date"],
  },
  inputValidator: z.object({ driverId: z.string(), date: z.string() }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"],
  requiresApproval: false,
  allowedAgents: ["reconciliation", "triage", "chat"],
  async execute(ctx, input) {
    const day = new Date(input.date);
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Join OrderLog (driver-scoped) with OrderEvent (order-scoped) via orderId overlap
    const orders = await prisma.orderLog.findMany({
      where: { tenantId: ctx.tenantId, driverId: input.driverId, date: { gte: dayStart, lt: dayEnd } },
      select: { id: true, platform: true, orderCount: true },
      take: 200,
    });
    const events = await prisma.orderEvent.findMany({
      where: { tenantId: ctx.tenantId, timestamp: { gte: dayStart, lt: dayEnd } },
      orderBy: { timestamp: "asc" },
      take: 500,
    });
    return {
      orderLogs: orders,
      events: events.map((e) => ({
        id: e.id,
        orderId: e.orderId,
        action: e.action,
        description: e.description,
        operator: e.operator,
        timestamp: e.timestamp.toISOString(),
      })),
    };
  },
});

const createReconciliationNote = defineTool({
  name: "createReconciliationNote",
  description:
    "Write a one-sentence reconciliation note on the CashRecord's notes field. Auto-executes (descriptive, reversible).",
  inputSchema: {
    type: "object" as const,
    properties: {
      cashRecordId: { type: "string" },
      note: { type: "string" },
    },
    required: ["cashRecordId", "note"],
  },
  inputValidator: z.object({ cashRecordId: z.string(), note: z.string().min(5).max(500) }),
  sideEffect: "write",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"],
  requiresApproval: false,
  allowedAgents: ["reconciliation"],
  async execute(ctx, input) {
    const existing = await prisma.cashRecord.findFirst({
      where: { id: input.cashRecordId, tenantId: ctx.tenantId },
    });
    if (!existing) return { error: "CashRecord not found" };
    const stamp = `[agent:${ctx.agentId} run:${ctx.runId.slice(0, 8)}]`;
    const newNotes = [existing.notes, `${stamp} ${input.note}`].filter(Boolean).join("\n");
    await prisma.cashRecord.update({
      where: { id: existing.id },
      data: { notes: newNotes },
    });
    return { ok: true };
  },
});

const flagForReview = defineTool({
  name: "flagForReview",
  description:
    "Create a CASH_DISCREPANCY violation for a driver when a fraud pattern is detected (3+ consecutive days of unexplained gaps above threshold). REQUIRES HUMAN APPROVAL.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string" },
      platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
      totalGapKd: { type: "number" },
      days: { type: "number" },
      details: { type: "string" },
    },
    required: ["driverId", "platform", "totalGapKd", "days", "details"],
  },
  inputValidator: z.object({
    driverId: z.string(),
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"]),
    totalGapKd: z.number(),
    days: z.number().int().min(1),
    details: z.string().min(10),
  }),
  sideEffect: "write",
  requiredRole: ["ADMIN", "OPS_MANAGER", "ACCOUNTANT"],
  requiresApproval: true,
  allowedAgents: ["reconciliation"],
  async execute(ctx, input) {
    const violation = await createViolationWithAlert({
      tenantId: ctx.tenantId,
      driverId: input.driverId,
      platform: input.platform as any,
      violationType: "CASH_DISCREPANCY" as any,
      violationTime: new Date(),
      details: input.details,
      metadata: { totalGapKd: input.totalGapKd, days: input.days, flaggedBy: "reconciliation-agent", runId: ctx.runId },
    });
    return { ok: true, violationId: violation?.id ?? null };
  },
});

export function registerReconciliationTools() {
  toolRegistry.register(getDriverDayLedger);
  toolRegistry.register(getOrderFlowForDriver);
  toolRegistry.register(createReconciliationNote);
  toolRegistry.register(flagForReview);
}
