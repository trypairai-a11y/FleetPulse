/**
 * @wave 5 (Wave 0 RED — flips GREEN in Wave 5 Task 3)
 *
 * BullMQ scheduledBriefingsWorker: consumes JobScheduler ticks, runs the
 * chat agent for each briefing, persists a ChatThread + assistant
 * ChatMessage so the user can open the result from the chat history.
 *
 * Key invariants:
 *   - bindBriefing(b) upserts JobScheduler(briefingId, cron) — idempotent
 *   - unbindBriefing(id) removes the scheduler
 *   - worker.tick() creates ChatThread.title="Daily briefing — 2026-04-12"
 *     + ChatMessage.role="assistant" + bodyMarkdown + viewBlocks[]
 *   - if briefing.type === "standing_rule_v3", worker SKIPS (no-op) and
 *     emits an INFO log noting "deferred to Phase 12"
 *     (orchestrator_resolutions §3)
 *
 * REQ-chat-scheduled-jobs.
 */

describe("scheduledBriefingsWorker (Wave 0 RED)", () => {
  it.todo("bindBriefing upserts a JobScheduler entry (BullMQ 5.x)");
  it.todo("bindBriefing is idempotent — second call with same id+cron does not duplicate");
  it.todo("unbindBriefing removes the JobScheduler entry");
  it.todo("tick() creates a ChatThread + 1 assistant ChatMessage with viewBlocks");
  it.todo("tick() for a standing_rule_v3 briefing is a no-op (defer to Phase 12)");
  it.todo("tick() failure (agent throw) writes a callout view to the assistant message");
  it.todo("tick() respects the briefing's tenantId+userId scope when invoking the agent");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
