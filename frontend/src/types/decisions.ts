// Phase 2 Wave 3 — Frontend type contract for the Decisions surface.
// Mirrors backend cardProjector output verbatim (UI-SPEC §4.5).
//
// Tag values are CAPITALIZED (matches backend's projectPendingAction
// output and the Wave 0 RED test contract — see DecisionsList.test.tsx
// line 19, 38, 53). The §4.5 lowercase alias in UI-SPEC was a doc
// inconsistency; the test + Wave 2 backend are the source of truth.

export type DecisionTag =
  | "Penalty"
  | "Suspend"
  | "Warn"
  | "Cash reminder"
  | "Promote"
  | "Review"
  | "Other";

export interface Evidence {
  type: "shift" | "violation" | "cashRecord" | "order" | "gps" | "note";
  label: string;
  entityType: string;
  entityId: string;
  href?: string;
}

export interface AgentActionDraft {
  toolName: string;
  args: Record<string, unknown>;
  reasoning: string;
  subjectType: string;
  subjectId: string;
}

export interface DecisionCardData {
  id: string;
  tag: DecisionTag;
  confidence: number;            // 0..1
  driverName: string;
  driverId: string;
  headline: string;
  reasoning: string;             // 2 lines max recommended
  evidence: Evidence[];
  proposalDraft: AgentActionDraft;
  toolName: string;
  toolIsLive: boolean;           // false for tools not yet wired in Phase 2
  state: "pending" | "approved" | "dismissed";
  createdAt: string;             // ISO
  approvedAt?: string;
  approvedById?: string;
  dismissedAt?: string;
  dismissalReason?: string;
}

// ---- Phase 2 tool registry hints ----
// Mirrors backend PHASE_2_LIVE_TOOLS. The Decisions UI uses this Set to
// decide whether to enable/disable the Approve button. Suspend/penalty cards
// (Phase 8 tools) render with disabled Approve + tooltip "Action tool ships
// in Phase 8 — your approval is recorded for training."
export const PHASE_2_LIVE_TOOLS = new Set<string>(["draftCourierMessage"]);

// Per-tool editableParams allow-list (matches the backend tool registry's
// editableParams attribute set by Wave 1). When the user clicks Edit, the
// drawer renders ONE input per param name listed here. Empty array → no
// editable fields → Edit button hidden for that tool.
export const TOOL_EDITABLE_PARAMS: Record<string, string[]> = {
  draftCourierMessage: ["bodyEnglish"],
  proposeCashReminder: ["bodyEnglish", "amountKd"],
  flagForReview: [],
};

// ---- Audit log ----
// Shape returned by GET /api/audit/agent-actions. Joins added by
// /agent-actions/:id detail endpoint. Wave 2 backend's audit.ts is the
// source of truth.
export interface AgentActionRow {
  id: string;
  tenantId: string;
  proposer: string;              // "Darb" | userId for human-initiated
  approverId: string | null;
  agentRunId: string | null;
  toolName: string;
  originalProposal: Record<string, unknown>;
  modificationsBeforeApproval: Record<string, unknown> | null;
  outcome: "success" | "failure" | "rolled_back";
  errorMessage: string | null;
  reasoning: string | null;
  subjectType: string;
  subjectId: string;
  rolledBackAt: string | null;
  rolledBackById: string | null;
  rollbackReason: string | null;
  createdAt: string;
}

export interface AgentActionDetail extends AgentActionRow {
  approver?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  agentRun?: {
    id: string;
    agentId: string;
    model: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    promptTokens: number | null;
    completionTokens: number | null;
  } | null;
}

// Pagination response wrapper used by both /api/decisions and /api/audit
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DecisionsListResponse {
  cards: DecisionCardData[];
  counts: Record<string, number>;
  pagination: PaginationMeta;
}

export interface AuditListResponse {
  rows: AgentActionRow[];
  pagination: PaginationMeta;
}
