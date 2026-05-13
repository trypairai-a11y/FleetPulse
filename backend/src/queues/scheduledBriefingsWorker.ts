// Phase 4 Wave 5 — Scheduled briefings worker.
//
// Consumes BullMQ JobScheduler ticks for each ScheduledBriefing row. On each
// tick, runs the chat agent and persists a ChatThread + 2 ChatMessages
// (user prompt + assistant reply) so the user can open the result from chat
// history. Standing-rule entries (type=standing_rule_v3) are explicit no-ops
// in Phase 4 — Phase 12 wires the firing engine
// (orchestrator_resolutions §3).
//
// REQ-chat-scheduled-jobs.
//
// Exports:
//   - SCHEDULED_BRIEFINGS_QUEUE — queue name constant.
//   - getScheduledBriefingsQueue() — returns the BullMQ Queue (null when
//     REDIS is missing for dev/test).
//   - bindBriefing(b) — upserts a JobScheduler entry (idempotent).
//   - unbindBriefing(id) — removes the JobScheduler entry.
//   - startScheduledBriefingsWorker() — boot the BullMQ Worker (no-op when
//     REDIS is missing).
//
// Architecture references:
//   - Phase 2's onboardingBackwashWorker.ts for the queue + worker + Redis
//     guard pattern (env.REDIS_URL guard + side-effect import in server.ts).
//   - BullMQ JobScheduler upsertJobScheduler (5.x) pattern from RESEARCH
//     Pattern 5; tz: "Asia/Kuwait" per Pitfall 7 (Kuwait does not observe
//     DST so cron expressions fire at consistent wall-clock times).

import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../config";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { runAgent } from "../agent";
import { recordMetricEvent } from "../agent/metricEvent";
import * as chatHistoryService from "../services/chatHistoryService";

export const SCHEDULED_BRIEFINGS_QUEUE = "scheduled-briefings";
const SCHEDULER_PREFIX = "sb";

export interface ScheduledBriefingTickData {
  briefingId: string;
  tenantId: string;
  userId: string;
  prompt: string;
  type: "briefing" | "standing_rule_v3";
}

export interface BriefingRecord {
  id: string;
  tenantId: string;
  userId: string;
  cron: string;
  prompt: string;
  type: string;
}

// ─── Queue + connection singletons ─────────────────────────────────────────

function hasRedis(): boolean {
  return !!env.REDIS_URL && env.REDIS_URL !== "redis://localhost:6379";
}

let _queueSingleton: Queue<ScheduledBriefingTickData> | null = null;
let _connectionSingleton: IORedis | null = null;

function getConnection(): IORedis | null {
  if (!hasRedis()) return null;
  if (_connectionSingleton) return _connectionSingleton;
  _connectionSingleton = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return _connectionSingleton;
}

export function getScheduledBriefingsQueue(): Queue<ScheduledBriefingTickData> | null {
  if (!hasRedis()) {
    logger?.warn?.("scheduledBriefings: REDIS_URL not configured; queue disabled");
    return null;
  }
  if (_queueSingleton) return _queueSingleton;
  const connection = getConnection();
  if (!connection) return null;
  _queueSingleton = new Queue<ScheduledBriefingTickData>(SCHEDULED_BRIEFINGS_QUEUE, {
    connection,
  });
  return _queueSingleton;
}

// ─── bind / unbind (BullMQ JobScheduler) ───────────────────────────────────

/**
 * Upsert a JobScheduler entry for the briefing. BullMQ 5.x stores the cron
 * pattern and timezone on Redis; subsequent calls with the same scheduler
 * id are idempotent (the cron pattern is updated in place).
 *
 * RESEARCH Pitfall 7 — Kuwait is UTC+3 year-round (no DST), so cron strings
 * fire at consistent wall-clock times.
 */
export async function bindBriefing(briefing: BriefingRecord): Promise<void> {
  const queue = getScheduledBriefingsQueue();
  if (!queue) {
    logger?.warn?.(
      { briefingId: briefing.id },
      "scheduledBriefings.bindBriefing: queue disabled (no Redis); skipping",
    );
    return;
  }
  const schedulerId = `${SCHEDULER_PREFIX}:${briefing.id}`;
  await queue.upsertJobScheduler(
    schedulerId,
    { pattern: briefing.cron, tz: "Asia/Kuwait" },
    {
      name: "scheduled-briefing-tick",
      data: {
        briefingId: briefing.id,
        tenantId: briefing.tenantId,
        userId: briefing.userId,
        prompt: briefing.prompt,
        type: (briefing.type as "briefing" | "standing_rule_v3") ?? "briefing",
      },
    },
  );
}

/**
 * Remove the JobScheduler entry. No-op when Redis is not configured.
 */
export async function unbindBriefing(briefingId: string): Promise<void> {
  const queue = getScheduledBriefingsQueue();
  if (!queue) return;
  try {
    await queue.removeJobScheduler(`${SCHEDULER_PREFIX}:${briefingId}`);
  } catch (err) {
    logger?.warn?.(
      { briefingId, err: (err as Error).message },
      "scheduledBriefings.unbindBriefing: removeJobScheduler error (already removed?)",
    );
  }
}

// ─── Tick processor (pure, testable) ───────────────────────────────────────

/**
 * Process a single scheduled-briefing tick. Pure & testable — accepts the
 * job data directly. The BullMQ worker wraps this in `new Worker(...)`.
 *
 * Contract:
 *   - type=standing_rule_v3 → no-op + metric event "standing_rule_skipped"
 *   - type=briefing → runAgent("chat") → upsertThread + 2 appendMessage
 *   - agent failure → write a callout view to a single error assistant
 *     message; do NOT throw (the BullMQ retry policy would re-run the cron
 *     and fan-out duplicate threads — better to surface the error in chat).
 */
export async function processTick(data: ScheduledBriefingTickData): Promise<{
  status: "completed" | "skipped" | "error";
  threadId?: string;
  reason?: string;
}> {
  const { briefingId, tenantId, userId, prompt, type } = data;

  if (type === "standing_rule_v3") {
    logger?.info?.(
      { briefingId },
      "scheduledBriefingsWorker: standing_rule_v3 no-op (Phase 12 wires firing)",
    );
    await recordMetricEvent({
      tenantId,
      userId,
      event: "standing_rule_skipped",
      properties: { briefingId, reason: "phase_4_no_op" },
    });
    return { status: "skipped", reason: "standing_rule_v3" };
  }

  if (type !== "briefing") {
    logger?.warn?.(
      { briefingId, type },
      "scheduledBriefingsWorker: unknown type — skipping",
    );
    return { status: "skipped", reason: `unknown type ${type}` };
  }

  let result;
  try {
    result = await runAgent("chat", {
      tenantId,
      triggerEvent: `cron:scheduled-briefing:${briefingId}`,
      userMessage: prompt,
      payload: { briefingId, userId },
    });
  } catch (err) {
    const message = (err as Error).message ?? "agent threw";
    logger?.error?.(
      { briefingId, err: message },
      "scheduledBriefingsWorker: runAgent threw",
    );
    return await writeErrorThread({
      tenantId,
      userId,
      briefingId,
      prompt,
      error: message,
    });
  }

  if (!result || result.status !== "completed") {
    const errorMessage = result?.error ?? `agent status: ${result?.status ?? "unknown"}`;
    logger?.warn?.(
      { briefingId, status: result?.status, error: errorMessage },
      "scheduledBriefingsWorker: agent run did not complete",
    );
    await recordMetricEvent({
      tenantId,
      userId,
      event: "scheduled_briefing_failed",
      properties: {
        briefingId,
        runId: result?.runId,
        status: result?.status,
        error: errorMessage,
      },
    });
    return await writeErrorThread({
      tenantId,
      userId,
      briefingId,
      prompt,
      error: errorMessage,
    });
  }

  // Persist the briefing as a new chat thread + 2 messages (user + assistant).
  const thread = await chatHistoryService.upsertThread({
    tenantId,
    userId,
    source: "briefing",
    briefingId,
    firstMessage: prompt,
  });
  await chatHistoryService.appendMessage({
    threadId: thread.id,
    tenantId,
    role: "user",
    content: prompt,
    state: "complete",
  });
  await chatHistoryService.appendMessage({
    threadId: thread.id,
    tenantId,
    role: "assistant",
    content: (result.text as string) ?? "",
    views: (result.views ?? []) as any[],
    state: "complete",
  });

  // Update lastFireAt — nextFireAt is computed by BullMQ JobScheduler.
  try {
    await prisma.scheduledBriefing.updateMany({
      where: { id: briefingId, tenantId, userId },
      data: { lastFireAt: new Date() },
    });
  } catch (err) {
    logger?.warn?.(
      { briefingId, err: (err as Error).message },
      "scheduledBriefingsWorker: failed to update lastFireAt (non-fatal)",
    );
  }

  await recordMetricEvent({
    tenantId,
    userId,
    event: "scheduled_briefing_fired",
    properties: {
      briefingId,
      runId: (result as any).runId,
      threadId: thread.id,
      viewCount: ((result.views ?? []) as unknown[]).length,
    },
  });

  return { status: "completed", threadId: thread.id };
}

async function writeErrorThread(opts: {
  tenantId: string;
  userId: string;
  briefingId: string;
  prompt: string;
  error: string;
}): Promise<{ status: "error"; threadId: string; reason: string }> {
  const thread = await chatHistoryService.upsertThread({
    tenantId: opts.tenantId,
    userId: opts.userId,
    source: "briefing",
    briefingId: opts.briefingId,
    firstMessage: opts.prompt,
  });
  await chatHistoryService.appendMessage({
    threadId: thread.id,
    tenantId: opts.tenantId,
    role: "user",
    content: opts.prompt,
    state: "complete",
  });
  await chatHistoryService.appendMessage({
    threadId: thread.id,
    tenantId: opts.tenantId,
    role: "assistant",
    content: "The scheduled briefing failed to run.",
    views: [
      {
        type: "callout",
        tone: "error",
        title: "Briefing failed",
        body: opts.error,
      } as any,
    ],
    state: "error",
    errorMessage: opts.error,
  });
  return { status: "error", threadId: thread.id, reason: opts.error };
}

// ─── BullMQ worker (production) ────────────────────────────────────────────

let _workerSingleton: Worker<ScheduledBriefingTickData> | null = null;

export function startScheduledBriefingsWorker():
  | Worker<ScheduledBriefingTickData>
  | null {
  if (!hasRedis()) {
    logger?.warn?.(
      "startScheduledBriefingsWorker: REDIS_URL not configured; worker disabled",
    );
    return null;
  }
  if (_workerSingleton) return _workerSingleton;
  const connection = getConnection();
  if (!connection) return null;

  const worker = new Worker<ScheduledBriefingTickData>(
    SCHEDULED_BRIEFINGS_QUEUE,
    async (job: Job<ScheduledBriefingTickData>) => {
      const data = job.data;
      logger?.info?.(
        { briefingId: data.briefingId, jobId: job.id, type: data.type },
        "scheduledBriefingsWorker: tick",
      );
      return await processTick(data);
    },
    { connection, concurrency: 2 },
  );

  worker.on("completed", (job, result) =>
    logger?.debug?.({ jobId: job.id, result }, "scheduledBriefing tick completed"),
  );
  worker.on("failed", (job, err) =>
    logger?.warn?.(
      { jobId: job?.id, err: err.message },
      "scheduledBriefing tick failed",
    ),
  );
  worker.on("error", (err) =>
    logger?.error?.({ err }, "scheduledBriefingsWorker error"),
  );

  logger?.info?.("scheduledBriefingsWorker started");
  _workerSingleton = worker;
  return worker;
}

// Allow `tsx src/queues/scheduledBriefingsWorker.ts` standalone.
if (require.main === module) {
  startScheduledBriefingsWorker();
}
