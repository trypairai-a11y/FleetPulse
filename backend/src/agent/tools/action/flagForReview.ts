import { z } from "zod";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 2 — `flagForReview`. Audit-only review flag for ambiguous anomalies.
 *
 * The monitor calls this when an anomaly is real but the right operator
 * action is unclear (e.g. unusual GPS pattern that may be a malfunctioning
 * device, or a Phase 8 tool would be the right action but Phase 8 hasn't
 * shipped yet). The execute body has no side effect on Phase 2 production
 * data — it just returns a structured payload. The actual `AgentAction`
 * audit row is written by the Wave 2 approve route after a human
 * Confirms, so the propose-and-confirm contract is preserved end-to-end.
 *
 * `editableParams: []` — operator can only Confirm or Dismiss as drafted.
 * The reasoning belongs to the agent; if the operator wants to add a
 * different note, they should Dismiss + draft a fresh action.
 *
 * REQ-agent-action-drafting / REQ-agent-propose-confirm.
 */
export const flagForReview = defineTool({
  name: "flagForReview",
  description:
    "Stage a 'needs human review' flag against a subject (Driver, Shift, CashRecord, Order, or Violation). Tenant-scoped. Audit-only in Phase 2 — the execute body returns a structured payload but writes no production data; the AgentAction audit row is written by the Wave 2 approve route after a human Confirms. Use this when an anomaly is real but the right action is ambiguous, or when a Phase 8 tool (applyPenalty / suspendDriver / recordCashSettlement / etc.) would be the natural response but isn't yet available. requiresApproval=true; non-editable by the approver.",
  inputSchema: {
    type: "object" as const,
    properties: {
      subjectType: {
        type: "string",
        enum: ["Driver", "Shift", "CashRecord", "Order", "Violation"],
        description: "Which model the flag attaches to.",
      },
      subjectId: { type: "string", description: "ID of the subject row within the tenant." },
      reason: {
        type: "string",
        description: "Data-grounded reason this needs supervisor eyes (20-400 chars).",
      },
    },
    required: ["subjectType", "subjectId", "reason"],
    additionalProperties: false,
  },
  inputValidator: z
    .object({
      subjectType: z.enum([
        "Driver",
        "Shift",
        "CashRecord",
        "Order",
        "Violation",
      ]),
      subjectId: z.string().min(1),
      reason: z.string().min(20).max(400),
    })
    .strict(),
  strict: true,
  sideEffect: "write",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: true,
  allowedAgents: ["monitor", "triage", "narrator"],
  editableParams: [],
  async execute(_ctx, input) {
    // Phase 2 audit-only: no production-data write. The AgentAction row is
    // written by the Wave 2 approve route once a human Confirms. Returning
    // a structured payload lets the runtime persist a useful AgentToolCall
    // audit entry.
    return {
      ok: true,
      audit_only: true,
      flagged: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
      },
    };
  },
});

export function registerFlagForReviewTool() {
  toolRegistry.register(flagForReview);
}

registerFlagForReviewTool();
