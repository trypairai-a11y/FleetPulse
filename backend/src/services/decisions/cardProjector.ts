// Phase 2 Wave 2 — projectPendingAction.
//
// Maps a PendingAgentAction row + its tenant-scoped driver lookup into a
// DecisionCardData object suitable for the front-end Decisions Surface.
//
// Contract (CON-decisions-card-shape, UI-SPEC §3.1.2 + §4.5):
//   - tag: "Penalty" | "Suspend" | "Warn" | "Cash reminder" | "Promote"
//          | "Review" | "Other"  (UI labels per the Tag Colour Map table)
//   - state: "pending" | "approved" | "dismissed" — derived from
//          PendingAgentAction.resolvedAt + .resolution
//   - toolIsLive: true ONLY for tools wired to a real side-effect in
//          Phase 2 (PHASE_2_LIVE_TOOLS). Phase-8 tools display but their
//          Approve button is disabled in the UI.
//   - driverName: loaded via prisma.driver.findFirst(
//          where: { id: subjectId, tenantId: ctx.tenantId }) when
//          subjectType === "Driver"; falls back to "(unknown)" if the
//          row no longer exists or subjectType isn't a Driver.
//   - evidence[]: gathered by evidenceCollector.ts (per-anomaly class
//          links to shifts / cash records / violations / GPS samples).
//
// REQ-decisions-proposal-inbox.

import { prisma } from "../../config";
import { collectEvidence, type Evidence } from "./evidenceCollector";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * The set of tag labels surfaced in the Decisions UI. The strings match the
 * "Tag" column of UI-SPEC §3.1.2 / §3.1.4 verbatim so the front-end can pass
 * them to <TagPill /> without further mapping.
 */
export type DecisionTag =
  | "Penalty"
  | "Suspend"
  | "Warn"
  | "Cash reminder"
  | "Promote"
  | "Review"
  | "Other";

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
  confidence: number; // 0..1
  driverName: string;
  driverId: string;
  headline: string;
  reasoning: string;
  evidence: Evidence[];
  proposalDraft: AgentActionDraft;
  toolName: string;
  toolIsLive: boolean;
  state: "pending" | "approved" | "dismissed";
  createdAt: string; // ISO
  approvedAt?: string;
  approvedById?: string;
  dismissedAt?: string;
  dismissalReason?: string;
}

/**
 * Minimal shape of the row this projector accepts. Matches the live Prisma
 * model PendingAgentAction (schema.prisma:2218) but kept structural so tests
 * can pass plain literals without going through the generated client.
 */
export interface PendingAgentActionLike {
  id: string;
  tenantId: string;
  runId: string;
  agentId: string;
  toolName: string;
  input: unknown;
  recommendation: string;
  reasoning: string;
  confidence: number;
  priorityScore: number;
  subjectType: string | null;
  subjectId: string | null;
  resolvedAt: Date | string | null;
  resolution: string | null;
  overrideReason: string | null;
  resolvedBy?: string | null;
  createdAt: Date | string;
}

export interface ProjectorContext {
  tenantId: string;
}

// ─── Mappings ───────────────────────────────────────────────────────────────

/**
 * Phase-2-only LIVE write tools. Any tool not in this set still surfaces in
 * the Decisions UI but its Approve action writes the AgentAction audit row
 * with a no-op side effect. The plan's contract (must_haves.truths line 27):
 *
 *   "Approve route for live tool draftCourierMessage: re-invokes registry
 *    with ctx.userId set so the registry executes the tool body."
 */
export const PHASE_2_LIVE_TOOLS: ReadonlySet<string> = new Set([
  "draftCourierMessage",
]);

/**
 * toolName → DecisionTag mapping. Keys mirror the names registered in
 * agent/tools/action/* (Phase 2 ships 3 tools live + the legacy triage tools
 * the monitor may still emit) plus the Phase-8 hint tools listed in
 * UI-SPEC §3.1.2 ("action tools ship in Phase 8 — your approval is
 * recorded for training"). Cards still render for those even though their
 * Approve button is disabled in the UI.
 */
const TOOL_TO_TAG: Record<string, DecisionTag> = {
  // Phase 2 live + audit-only tools
  draftCourierMessage: "Warn",
  flagForReview: "Review",
  proposeCashReminder: "Cash reminder",

  // Phase 1 legacy triage tools the monitor may still propose
  proposeAppealDecision: "Review",
  proposeCoachingMessage: "Warn",
  snoozeAlert: "Other",

  // Phase 8 forbidden-list hints — render the tag if a Phase-2 prompt
  // accidentally drafts one (the registry's allowedAgents gate stops the
  // actual write). Keeping them mapped means the UI shows a tag rather
  // than the catch-all "Other".
  applyPenalty: "Penalty",
  suspendDriver: "Suspend",
};

/**
 * For draftCourierMessage, the intent enum overrides the default tag. This
 * mirrors UI-SPEC §3.1.2's tag map: a CASH_REMINDER message is a "Cash
 * reminder" card, a PROMOTE_TOP_PERFORMER is a "Promote", and the warning
 * intents fall back to "Warn".
 */
const INTENT_TO_TAG: Record<string, DecisionTag> = {
  CASH_REMINDER: "Cash reminder",
  PROMOTE_TOP_PERFORMER: "Promote",
  WARN_LATE_CLOCKIN: "Warn",
  WARN_ORDER_REJECTIONS: "Warn",
  WARN_GPS_STALE: "Warn",
  COACHING_PERFORMANCE: "Warn",
  GENERIC: "Other",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveTag(pa: PendingAgentActionLike): DecisionTag {
  const base = TOOL_TO_TAG[pa.toolName] ?? "Other";
  if (pa.toolName === "draftCourierMessage") {
    const input = pa.input as { intent?: string } | null;
    const intent = input?.intent;
    if (intent && INTENT_TO_TAG[intent]) return INTENT_TO_TAG[intent];
  }
  return base;
}

function deriveState(
  pa: PendingAgentActionLike,
): "pending" | "approved" | "dismissed" {
  if (pa.resolvedAt == null) return "pending";
  if (pa.resolution === "approved") return "approved";
  // resolution === "rejected" or any other resolved-but-not-approved value
  return "dismissed";
}

function shapeHeadline(
  pa: PendingAgentActionLike,
  driverName: string,
): string {
  // First sentence (or first 90 chars) of the agent's reasoning.
  const reasoning = (pa.reasoning ?? "").trim();
  let summary = reasoning.split(/[\n.]/, 1)[0]?.trim() ?? "";
  if (summary.length > 90) summary = summary.slice(0, 90).trimEnd() + "…";
  if (driverName && driverName !== "(unknown)") {
    return summary ? `${driverName} — ${summary}` : driverName;
  }
  return summary || "(no summary)";
}

async function loadDriverName(
  pa: PendingAgentActionLike,
  ctx: ProjectorContext,
): Promise<{ driverName: string; driverId: string }> {
  if (pa.subjectType !== "Driver" || !pa.subjectId) {
    // Either the proposal isn't about a driver (Shift / CashRecord / etc.)
    // or the row has no subject. Caller decides how to render; we return a
    // sentinel so the field is non-null and headline shaping works.
    return {
      driverName: "(unknown)",
      driverId: pa.subjectId ?? "",
    };
  }
  const driver = await prisma.driver.findFirst({
    where: { id: pa.subjectId, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  if (!driver) {
    return { driverName: "(unknown)", driverId: pa.subjectId };
  }
  return { driverName: driver.name, driverId: driver.id };
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function projectPendingAction(
  pa: PendingAgentActionLike,
  ctx: ProjectorContext,
): Promise<DecisionCardData> {
  const { driverName, driverId } = await loadDriverName(pa, ctx);
  const evidence = await collectEvidence(pa);

  const tag = deriveTag(pa);
  const toolIsLive = PHASE_2_LIVE_TOOLS.has(pa.toolName);
  const state = deriveState(pa);
  const headline = shapeHeadline(pa, driverName);

  const proposalDraft: AgentActionDraft = {
    toolName: pa.toolName,
    args: (pa.input ?? {}) as Record<string, unknown>,
    reasoning: pa.reasoning ?? "",
    subjectType: pa.subjectType ?? "",
    subjectId: pa.subjectId ?? "",
  };

  const card: DecisionCardData = {
    id: pa.id,
    tag,
    confidence: pa.confidence,
    driverName,
    driverId,
    headline,
    reasoning: pa.reasoning ?? "",
    evidence,
    proposalDraft,
    toolName: pa.toolName,
    toolIsLive,
    state,
    createdAt: toIso(pa.createdAt),
  };

  if (state === "approved" && pa.resolvedAt) {
    card.approvedAt = toIso(pa.resolvedAt);
    if (pa.resolvedBy) card.approvedById = pa.resolvedBy;
  } else if (state === "dismissed" && pa.resolvedAt) {
    card.dismissedAt = toIso(pa.resolvedAt);
    if (pa.overrideReason) card.dismissalReason = pa.overrideReason;
  }

  return card;
}
