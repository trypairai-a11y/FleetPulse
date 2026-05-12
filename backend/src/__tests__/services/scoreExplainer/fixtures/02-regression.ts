// Gold-set fixture #2: regression — composite slipping DOWN.
//
// Composite 67, trend DOWN. The explanation must name the regression
// without proposing remediation actions (no warn/suspend/penalty).
//
// REQ-agent-scoring · Phase 3 · Wave 0 RED.

import type { ScoreExplainerFixture } from "./index";

export const regression: ScoreExplainerFixture = {
  name: "regression",
  driverId: "drv-fix-02",
  scoreDate: "2026-05-09",
  score: {
    compositeScore: 67,
    attendanceScore: 70,
    deliveryScore: 55,
    financialScore: 80,
    equipmentScore: 85,
    platformScore: 75,
    trend: "DOWN",
    breakdown: {
      previousCompositeScore: 82,
      deliveryReason: "3 cancellations this week vs 0 last week",
    },
  },
  recentShifts: [
    { shiftId: "sh-201", date: "2026-05-08", status: "LATE" },
    { shiftId: "sh-202", date: "2026-05-07", status: "ON_TIME" },
    { shiftId: "sh-203", date: "2026-05-05", status: "LATE" },
  ],
  recentViolations: [
    { id: "v-201", type: "LATE_CLOCK_IN", time: "2026-05-08T08:15:00Z" },
  ],
  expectedFacts: ["67", "down", "regress", "decline", "attendance", "delivery"],
  stubExplanation:
    "Ahmed scores 67 out of 100 and the trend is down from 82 last week. Delivery has declined sharply to 55/100 because of 3 cancellations this week. Attendance dropped to 70/100 reflecting 2 late clock-ins. The decline is mostly delivery-driven; financial (80) and equipment (85) remain steady.",
};
