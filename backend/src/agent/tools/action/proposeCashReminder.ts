import { z } from "zod";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 2 — `proposeCashReminder`. Audit-only cash settlement reminder.
 *
 * The monitor calls this when a CashRecord row shows a pending-dues gap
 * (e.g. driver Saad has KD 28.500 outstanding from yesterday's settlement
 * and hasn't paid in). Phase 2 is audit-only — the execute body confirms
 * the proposal shape but does NOT send any message and does NOT mutate
 * the CashRecord. Phase 8 will ship the full Cash Workbench with
 * `recordCashSettlement` and a live `sendCourierMessage` companion.
 *
 * Both `bodyEnglish` and `amountKd` are editable by the approver — the
 * operator may want to adjust the suggested figure (e.g. "actually he paid
 * KD 5 in cash already, ask for the remaining KD 23.500") or rephrase
 * the reminder before Confirming.
 *
 * REQ-agent-action-drafting / REQ-agent-propose-confirm.
 */
export const proposeCashReminder = defineTool({
  name: "proposeCashReminder",
  description:
    "Audit-only cash settlement reminder proposal. The monitor calls this when a CashRecord shows a pending-dues gap; Phase 2 stages the proposal as a PendingAgentAction row but does NOT send any message and does NOT mutate the CashRecord. Phase 8 will wire this to the Cash Workbench (recordCashSettlement + live sendCourierMessage). Both bodyEnglish and amountKd are editable by the approver before Confirm. Tenant-scoped, requiresApproval=true.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string", description: "Driver.id within the tenant scope." },
      amountKd: {
        type: "number",
        description: "Suggested reminder amount in KD, positive 3-decimals (e.g. 28.500).",
      },
      bodyEnglish: {
        type: "string",
        description: "Drafted English reminder body (20-300 chars). Editable by the approver.",
      },
    },
    required: ["driverId", "amountKd", "bodyEnglish"],
    additionalProperties: false,
  },
  inputValidator: z
    .object({
      driverId: z.string().min(1),
      amountKd: z.number().min(0.001),
      bodyEnglish: z.string().min(20).max(300),
    })
    .strict(),
  strict: true,
  sideEffect: "notify",
  requiredRole: ["ADMIN", "OPS_MANAGER", "ACCOUNTANT"],
  requiresApproval: true,
  allowedAgents: ["monitor", "reconciliation", "narrator"],
  editableParams: ["bodyEnglish", "amountKd"],
  async execute(_ctx, input) {
    // Phase 2 audit-only: no production-data write, no outbound message.
    // The AgentAction row is written by the Wave 2 approve route. Phase 8
    // will replace this body with a real recordCashSettlement + live
    // sendCourierMessage chain.
    return {
      ok: true,
      audit_only: true,
      summary: `Phase 2 audit-only: would have proposed cash reminder for KD ${input.amountKd.toFixed(3)}`,
    };
  },
});

export function registerProposeCashReminderTool() {
  toolRegistry.register(proposeCashReminder);
}

registerProposeCashReminderTool();
