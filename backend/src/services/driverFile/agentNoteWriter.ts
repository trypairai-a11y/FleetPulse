import { upsertAgentMemory } from "../../agent";

/**
 * Phase 3 Wave 1 — REQ-driver-file (agent's running notes).
 *
 * Convention: per-driver agent notes are stored in AgentMemory under the
 * key prefix `note:driver:<driverId>:<unix-ms>`. The Driver File reads via
 * listMemoriesByPrefix(tenantId, `note:driver:<driverId>:`).
 *
 * Two writers populate this prefix (per RESEARCH §Open Questions Q2 resolution):
 * 1. /decisions approve + dismiss handlers (Phase 2) — write a note when an
 *    action linked to this driver is acted on by a human.
 * 2. aiScoringService score-regression detection (existing service) — writes
 *    a note when the composite score drops by more than 5 points week-over-week.
 *
 * Both call appendDriverNote() rather than touching AgentMemory directly.
 */

export type AgentNoteSource = "approve" | "dismiss" | "score-regression" | "manual";

export async function appendDriverNote(
  tenantId: string,
  driverId: string,
  text: string,
  source: AgentNoteSource,
  agentRunId?: string,
): Promise<{ id: string }> {
  const key = `note:driver:${driverId}:${Date.now()}`;
  return upsertAgentMemory({
    tenantId,
    key,
    value: { text, source },
    source: "agent_observation",
    agentRunId,
  });
}
