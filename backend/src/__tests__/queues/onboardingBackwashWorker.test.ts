// Wave 0 RED test — turns GREEN in Wave 4 when
// backend/src/queues/onboardingBackwashWorker.ts ships. Do not skip.
//
// Behavior contract (REQ-gtm-onboarding):
//   1. The 30-day backwash window is split into 6 chunks of 5 days each
//      per platform. Total chunks = 6 × N(platforms).
//   2. Per-platform progress is reported via `job.updateProgress({step,
//      totalSteps, message})` with totalSteps = 6 × N(platforms).
//   3. Concurrency cap: at most 2 platforms in flight simultaneously to
//      avoid scraper hammering (Pattern 6 + Pitfall 4).

import { runBackwashJob } from "../../queues/onboardingBackwashWorker";

describe("REQ-gtm-onboarding: backwash worker chunking", () => {
  test("30-day window split into 6 chunks of 5 days each per platform", async () => {
    const calls: Array<{ platform: string; from: string; to: string }> = [];
    const fakePullChunk = jest.fn(async (args: any) => {
      calls.push(args);
    });
    await runBackwashJob({
      tenantId: "t-1",
      platforms: ["KEETA", "TALABAT"],
      windowDays: 30,
      pullChunk: fakePullChunk as any,
      job: { updateProgress: jest.fn() } as any,
    });

    // Per platform: 30/5 = 6 chunks.
    const keeta = calls.filter((c) => c.platform === "KEETA");
    const talabat = calls.filter((c) => c.platform === "TALABAT");
    expect(keeta).toHaveLength(6);
    expect(talabat).toHaveLength(6);
  });

  test("per-platform progress reported via job.updateProgress with {step,totalSteps,message}", async () => {
    const updateProgress = jest.fn();
    await runBackwashJob({
      tenantId: "t-1",
      platforms: ["KEETA", "TALABAT"],
      windowDays: 30,
      pullChunk: jest.fn(async () => undefined) as any,
      job: { updateProgress } as any,
    });

    expect(updateProgress).toHaveBeenCalled();
    const calls = updateProgress.mock.calls.map((c) => c[0]);
    for (const call of calls) {
      expect(call).toEqual(
        expect.objectContaining({
          step: expect.any(Number),
          totalSteps: 12, // 6 × 2 platforms
          message: expect.any(String),
        }),
      );
    }
    // The final call's step should equal totalSteps.
    const last = calls[calls.length - 1];
    expect(last.step).toBe(12);
  });

  test("concurrency capped at 2 platforms in flight (avoid scraper hammering)", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const slowPullChunk = jest.fn(async () => {
      inFlight += 1;
      if (inFlight > maxInFlight) maxInFlight = inFlight;
      // Tiny delay to let other workers race the gate.
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
    });

    await runBackwashJob({
      tenantId: "t-1",
      platforms: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
      windowDays: 30,
      pullChunk: slowPullChunk as any,
      job: { updateProgress: jest.fn() } as any,
    });

    // Spec: ≤2 platforms in flight at once. 4 platforms × 6 chunks = 24
    // chunks, but never more than 2 chunks running concurrently.
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
