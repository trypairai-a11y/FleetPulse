// Gold-set fixture #5: newDriver — sparse data, no breakdown.
//
// Composite 75 (all sub-scores 75 by default-fill), no breakdown JSON.
// The explanation must acknowledge that data is limited rather than
// over-confidently asserting strengths/weaknesses.
//
// REQ-agent-scoring · Phase 3 · Wave 0 RED.

import type { ScoreExplainerFixture } from "./index";

export const newDriver: ScoreExplainerFixture = {
  name: "newDriver",
  driverId: "drv-fix-05",
  scoreDate: "2026-05-09",
  score: {
    compositeScore: 75,
    attendanceScore: 75,
    deliveryScore: 75,
    financialScore: 75,
    equipmentScore: 75,
    platformScore: 75,
    trend: "STABLE",
    // No breakdown — new driver, signal insufficient
  },
  recentShifts: [
    { shiftId: "sh-501", date: "2026-05-08", status: "ON_TIME" },
  ],
  recentViolations: [],
  expectedFacts: ["75", "limited", "new"],
  stubExplanation:
    "Sara is new to the fleet and the available data is limited — only 1 shift on file. The score of 75 out of 100 reflects a neutral default across all five factors (each at 75/100). A clearer picture of attendance, delivery, and platform performance will emerge once more shifts are completed.",
};
