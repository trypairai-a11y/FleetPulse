// Gold-set fixture #3: cashProblem — financial sub-score 40, others healthy.
//
// Composite 70, financial dragging the average down. The explanation
// must isolate the cash/settlement problem without proposing actions.
//
// REQ-agent-scoring · Phase 3 · Wave 0 RED.

import type { ScoreExplainerFixture } from "./index";

export const cashProblem: ScoreExplainerFixture = {
  name: "cashProblem",
  driverId: "drv-fix-03",
  scoreDate: "2026-05-09",
  score: {
    compositeScore: 70,
    attendanceScore: 85,
    deliveryScore: 80,
    financialScore: 40,
    equipmentScore: 90,
    platformScore: 80,
    trend: "STABLE",
    breakdown: {
      cashOutstandingKd: 28.5,
      cashAgeingDays: 6,
    },
  },
  recentShifts: [
    { shiftId: "sh-301", date: "2026-05-08", status: "ON_TIME" },
    { shiftId: "sh-302", date: "2026-05-07", status: "ON_TIME" },
  ],
  recentViolations: [],
  expectedFacts: ["70", "cash", "settlement", "financial", "40"],
  stubExplanation:
    "Khaled scores 70 out of 100. Financial is the weakest factor at 40/100 — the driver has KD 28.500 in cash outstanding from the most recent settlement, ageing 6 days. Attendance (85), delivery (80) and equipment (90) all remain in healthy territory. The composite is held back almost entirely by the cash gap.",
};
