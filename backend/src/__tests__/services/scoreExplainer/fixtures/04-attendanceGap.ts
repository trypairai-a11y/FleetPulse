// Gold-set fixture #4: attendanceGap — attendance sub-score 30, delivery healthy.
//
// Composite 58, attendance is the outlier (3 NO_SHOW + 4 LATE shifts).
// The explanation must call out the attendance pattern descriptively;
// no action verbs.
//
// REQ-agent-scoring · Phase 3 · Wave 0 RED.

import type { ScoreExplainerFixture } from "./index";

export const attendanceGap: ScoreExplainerFixture = {
  name: "attendanceGap",
  driverId: "drv-fix-04",
  scoreDate: "2026-05-09",
  score: {
    compositeScore: 58,
    attendanceScore: 30,
    deliveryScore: 85,
    financialScore: 75,
    equipmentScore: 80,
    platformScore: 72,
    trend: "DOWN",
    breakdown: {
      lateClockInCount: 4,
      noShowCount: 3,
      observationWindowDays: 14,
    },
  },
  recentShifts: [
    { shiftId: "sh-401", date: "2026-05-08", status: "NO_SHOW" },
    { shiftId: "sh-402", date: "2026-05-07", status: "LATE" },
    { shiftId: "sh-403", date: "2026-05-06", status: "NO_SHOW" },
    { shiftId: "sh-404", date: "2026-05-05", status: "LATE" },
  ],
  recentViolations: [],
  expectedFacts: ["58", "attendance", "shifts", "30"],
  stubExplanation:
    "Yousef scores 58 out of 100. Attendance is the outlier at 30/100 — 3 no-show shifts and 4 late clock-ins across the last 14 days. When Yousef does show up, delivery (85) and equipment (80) remain solid. The attendance gap is the single biggest factor pulling the composite below 60.",
};
