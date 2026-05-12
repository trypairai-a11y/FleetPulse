import {
  runAgent,
  latestMemoryByKey,
  upsertAgentMemory,
} from "../../agent";

/**
 * Phase 3 Wave 1 — REQ-agent-scoring.
 *
 * Returns a plain-English explanation of a courier's composite score.
 * Cached in AgentMemory under a compositeScore-keyed key so a re-scored
 * driver invalidates a stale explanation within the same day (Pitfall 2).
 *
 * Cache TTL = 1 hour. Key shape:
 *   score_explanation:<driverId>:<scoreDateYYYY-MM-DD>:<compositeScore>
 *
 * When ANTHROPIC_API_KEY is absent, runAgent returns { status: "disabled" } —
 * explainScore degrades gracefully to a fixed placeholder rather than throwing.
 */

export interface ScorePayload {
  compositeScore: number;
  attendanceScore: number;
  deliveryScore: number;
  financialScore: number;
  equipmentScore: number;
  platformScore: number;
  trend: "UP" | "DOWN" | "STABLE";
  breakdown?: Record<string, unknown>;
}

export interface ExplainScoreInput {
  tenantId: string;
  driverId: string;
  /** ISO date (yyyy-mm-dd) — used as part of the cache key. */
  scoreDate: string;
  score: ScorePayload;
  recentShifts: Array<{ shiftId: string; date: string; status: string }>;
  recentViolations: Array<{ id: string; type: string; time: string }>;
}

export interface ExplainScoreResult {
  text: string;
  cached: boolean;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_RECENT_SHIFTS = 10; // anti-context-bloat (RESEARCH §Anti-Patterns)
const MAX_RECENT_VIOLATIONS = 10;

function buildCacheKey(driverId: string, scoreDate: string, compositeScore: number): string {
  return `score_explanation:${driverId}:${scoreDate}:${compositeScore}`;
}

export async function explainScore(input: ExplainScoreInput): Promise<ExplainScoreResult> {
  const key = buildCacheKey(input.driverId, input.scoreDate, input.score.compositeScore);

  const hit = await latestMemoryByKey(input.tenantId, key);
  if (hit) {
    const ageMs = Date.now() - new Date(hit.createdAt).getTime();
    if (ageMs < CACHE_TTL_MS) {
      const value = hit.value as { text?: string } | null;
      if (value?.text) {
        return { text: value.text, cached: true };
      }
    }
  }

  const payload = {
    driverId: input.driverId,
    scoreDate: input.scoreDate,
    score: input.score,
    recentShifts: input.recentShifts.slice(0, MAX_RECENT_SHIFTS),
    recentViolations: input.recentViolations.slice(0, MAX_RECENT_VIOLATIONS),
  };

  const result = await runAgent("score-explainer", {
    tenantId: input.tenantId,
    triggerEvent: "explain_score",
    payload,
  });

  if (result.status === "disabled" || !result.text) {
    return { text: "Score explanation unavailable.", cached: false };
  }

  await upsertAgentMemory({
    tenantId: input.tenantId,
    key,
    value: { text: result.text },
    source: "agent_observation",
    agentRunId: result.runId,
  });

  return { text: result.text, cached: false };
}
