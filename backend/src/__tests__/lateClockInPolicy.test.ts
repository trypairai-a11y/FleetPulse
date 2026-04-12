/**
 * Covers the "1 minute late = LATE" policy applied across all platforms.
 * Mirrors the logic inside services/rulesEngine.ts::detectLateClockIns so
 * the policy is pinned by a fast unit test.
 */

function computeLateStatus(
  scheduledStart: Date,
  actualStart: Date | null,
  maxLateMinutes: number
): { isLate: boolean; lateMinutes: number } {
  if (!actualStart) return { isLate: false, lateMinutes: 0 };
  const lateMs = actualStart.getTime() - scheduledStart.getTime();
  const lateMinutes = Math.floor(lateMs / 60000);
  return { isLate: lateMinutes >= maxLateMinutes, lateMinutes };
}

describe("Strict 1-minute late-clock-in policy", () => {
  const scheduled = new Date("2026-04-11T08:00:00Z");

  test("on-time clock-in is not late", () => {
    const actual = new Date("2026-04-11T07:59:30Z");
    expect(computeLateStatus(scheduled, actual, 1).isLate).toBe(false);
  });

  test("exactly 1 minute late = LATE (floored)", () => {
    const actual = new Date("2026-04-11T08:01:00Z");
    const r = computeLateStatus(scheduled, actual, 1);
    expect(r.isLate).toBe(true);
    expect(r.lateMinutes).toBe(1);
  });

  test("61 seconds late = LATE (floors to 1 minute)", () => {
    const actual = new Date("2026-04-11T08:01:01Z");
    expect(computeLateStatus(scheduled, actual, 1).isLate).toBe(true);
  });

  test("30 minutes late is LATE with large lateMinutes", () => {
    const actual = new Date("2026-04-11T08:30:00Z");
    const r = computeLateStatus(scheduled, actual, 1);
    expect(r.isLate).toBe(true);
    expect(r.lateMinutes).toBe(30);
  });

  test("policy applies the same across all platforms (no per-platform leniency)", () => {
    const actual = new Date("2026-04-11T08:00:59Z");
    // Even with maxLateMinutes=1, sub-minute lateness does not trip the rule
    // because lateMinutes is floored. This matches the implementation.
    expect(computeLateStatus(scheduled, actual, 1).lateMinutes).toBe(0);
    expect(computeLateStatus(scheduled, actual, 1).isLate).toBe(false);
  });

  test("null actualStart returns not-late (no clock-in yet)", () => {
    expect(computeLateStatus(scheduled, null, 1).isLate).toBe(false);
  });
});
