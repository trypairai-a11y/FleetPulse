/**
 * @wave 5 (Wave 0 RED — flips GREEN in Wave 5 Task 2)
 *
 * Scheduled briefings CRUD. Cron whitelist enforces only allowed schedules
 * (orchestrator_resolutions §3 + UI-SPEC §9):
 *   "0 6 * * *"   — 06:00 daily
 *   "0 7 * * *"   — 07:00 daily
 *   "0 17 * * *"  — 17:00 daily
 *   "0 6 * * 1"   — Monday 06:00
 * Custom cron expressions require role=ADMIN. Any other input → 400.
 *
 * T-04-W0-05 mitigation: rejecting invalid cron prevents runaway BullMQ
 * scheduler costs.
 *
 *   POST   /api/scheduled-briefings
 *   GET    /api/scheduled-briefings
 *   PATCH  /api/scheduled-briefings/:id   (active toggle, schedule, prompt)
 *   DELETE /api/scheduled-briefings/:id   (also unbinds JobScheduler)
 *
 * REQ-chat-scheduled-jobs.
 */

describe("Scheduled briefings routes (Wave 0 RED)", () => {
  it.todo("POST creates briefing with whitelisted cron '0 6 * * *' (200)");
  it.todo("POST rejects invalid cron '* * * * *' (400) for non-ADMIN");
  it.todo("POST allows custom cron for ADMIN role");
  it.todo("POST rejects non-cron string '@daily' (400)");
  it.todo("GET lists user's own briefings only");
  it.todo("PATCH toggles active flag and bind/unbind the JobScheduler accordingly");
  it.todo("DELETE removes briefing AND calls jobScheduler.removeJobScheduler(briefingId)");
  it.todo("cross-user leak: user B cannot read/delete user A's briefing");
  it.todo("rejects briefings whose `type` is standing_rule_v3 from auto-firing (logged + flagged)");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
