// CON-audit-row-shape writer. Every approved action writes exactly one row here.
// The audit log is the product over time and the training corpus for future runs.
//
// Wave 2 ships the writer + tests; Phase 8 wires it into the action-orchestrator
// path. AgentAction rows are append-only; the rolledBack* fields on the schema
// are reserved for Phase 12's rollback flow and are NEVER written from here.
//
// REQ-data-agent-action / CON-audit-row-shape.

import { prisma } from "../config";

export interface AuditRow {
  tenantId: string;
  approverUserId: string; // human user id from req.user.userId
  agentRunId?: string; // optional FK to AgentRunLog
  toolName: string;
  originalProposal: unknown; // the agent's first draft (validated before reaching here)
  modificationsBeforeApproval?: unknown; // diff if the human edited
  outcome: "success" | "failure" | "rolled_back";
  reasoning: string; // agent's natural-language justification
  errorMessage?: string;
  modelName?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  subjectType?: string; // "Driver" | "CashRecord" | "Shift" | ...
  subjectId?: string;
  // Phase 4 Wave 2 — chat-origin attribution. Defaults to "decisions" so
  // existing Phase 2 callers leave these fields unset and the schema default
  // applies. Chat-origin writers populate source="chat" + chatThreadId +
  // chatMessageId.
  source?: "decisions" | "chat" | "briefing" | "auto";
  chatThreadId?: string | null;
  chatMessageId?: string | null;
}

const VALID_OUTCOMES: ReadonlySet<string> = new Set([
  "success",
  "failure",
  "rolled_back",
]);

export async function writeAgentAction(
  row: AuditRow,
): Promise<{ id: string }> {
  if (!row.tenantId) throw new Error("writeAgentAction: tenantId required");
  if (!row.approverUserId)
    throw new Error("writeAgentAction: approverUserId required");
  if (!row.toolName) throw new Error("writeAgentAction: toolName required");
  if (!row.outcome) throw new Error("writeAgentAction: outcome required");
  if (!VALID_OUTCOMES.has(row.outcome)) {
    throw new Error(`writeAgentAction: invalid outcome "${row.outcome}"`);
  }

  const created = await prisma.agentAction.create({
    data: {
      tenantId: row.tenantId,
      // T-01-W2-01: proposer is hardcoded — never read from caller input.
      proposer: "Darb",
      approverId: row.approverUserId,
      toolName: row.toolName,
      originalProposal: row.originalProposal as any,
      modificationsBeforeApproval:
        (row.modificationsBeforeApproval ?? null) as any,
      outcome: row.outcome,
      reasoning: row.reasoning ?? "",
      agentRunId: row.agentRunId ?? null,
      modelName: row.modelName ?? null,
      promptTokens: row.promptTokens ?? 0,
      completionTokens: row.completionTokens ?? 0,
      latencyMs: row.latencyMs ?? 0,
      errorMessage: row.errorMessage ?? null,
      subjectType: row.subjectType ?? null,
      subjectId: row.subjectId ?? null,
      // Phase 4 Wave 2 — leave undefined to inherit the schema default
      // ("decisions"); only set when an explicit non-default origin is
      // passed by the caller. The schema has @default("decisions") so
      // passing `undefined` is safe.
      ...(row.source ? { source: row.source } : {}),
      ...(row.chatThreadId ? { chatThreadId: row.chatThreadId } : {}),
      ...(row.chatMessageId ? { chatMessageId: row.chatMessageId } : {}),
    },
  });
  return { id: created.id };
}
