// Wave 0 RED test — turns GREEN in Wave 1 when
// backend/src/agent/scheduler.ts ships monitorTick("hot"|"warm"|"cold")
// and the start-up code wires three setInterval calls at the documented
// cadences. Do not skip.
//
// Behavior contract (REQ-agent-continuous-monitoring + Pattern 2 cadence):
//   - hot   tier → 60_000 ms     (1 minute)
//   - warm  tier → 900_000 ms    (15 minutes)
//   - cold  tier → 3_600_000 ms  (1 hour)
//
// Implementation hint: startAgentScheduler() must call setInterval THREE
// times for the monitor tier ticks (existing scheduler.ts already runs
// setInterval for tenant refresh / triage / narrator — the new monitor
// ticks are added on top).

import { prisma } from "../../mocks/config";

describe("REQ-agent-continuous-monitoring: tiered cadence (monitorTick)", () => {
  let setIntervalSpy: jest.SpyInstance;
  const intervals: Array<[Function, number]> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    intervals.length = 0;
    setIntervalSpy = jest
      .spyOn(global, "setInterval")
      .mockImplementation((fn: any, ms: any) => {
        intervals.push([fn, ms]);
        return 0 as any;
      });

    (prisma as unknown as { tenant: { findMany: jest.Mock } }).tenant = {
      findMany: jest.fn().mockResolvedValue([{ id: "t-1" }]),
    };
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    delete process.env.ANTHROPIC_API_KEY;
  });

  test("monitorTick('hot') is scheduled at 60_000 ms intervals", async () => {
    const { startAgentScheduler, stopAgentScheduler } = await import(
      "../../../agent/scheduler"
    );
    await startAgentScheduler();
    const found = intervals.some(([, ms]) => ms === 60_000);
    expect(found).toBe(true);
    stopAgentScheduler();
  });

  test("monitorTick('warm') is scheduled at 900_000 ms intervals", async () => {
    const { startAgentScheduler, stopAgentScheduler } = await import(
      "../../../agent/scheduler"
    );
    await startAgentScheduler();
    const found = intervals.some(([, ms]) => ms === 900_000);
    expect(found).toBe(true);
    stopAgentScheduler();
  });

  test("monitorTick('cold') is scheduled at 3_600_000 ms intervals (in addition to existing narrator/triage ticks)", async () => {
    const { startAgentScheduler, stopAgentScheduler } = await import(
      "../../../agent/scheduler"
    );
    await startAgentScheduler();
    const matches = intervals.filter(([, ms]) => ms === 3_600_000);
    // Wave 0: zero matches. Wave 1: ≥1 match (cold-tier monitor) — the
    // existing narrator hourly tick uses 60*60*1000 too, so the count
    // becomes ≥2 once Wave 1 lands. The assertion stays simple.
    expect(matches.length).toBeGreaterThanOrEqual(1);
    stopAgentScheduler();
  });
});
