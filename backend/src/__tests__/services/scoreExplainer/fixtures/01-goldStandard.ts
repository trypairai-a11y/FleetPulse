// Gold-set fixture #1: goldStandard — the canonical high-performer.
//
// Composite 92, all sub-scores strong. The explanation should call out
// strengths (especially financial=100 and attendance=95) and remain
// purely descriptive — no action verbs allowed (warn/suspend/fire/etc.).
//
// REQ-agent-scoring · Phase 3 · Wave 0 RED.

import type { ScoreExplainerFixture } from "./index";

export const goldStandard: ScoreExplainerFixture = {
  name: "goldStandard",
  driverId: "drv-fix-01",
  scoreDate: "2026-05-09",
  score: {
    compositeScore: 92,
    attendanceScore: 95,
    deliveryScore: 90,
    financialScore: 100,
    equipmentScore: 100,
    platformScore: 92,
    trend: "STABLE",
    breakdown: {
      attendanceReason: "0 late clock-ins in 14 days",
      deliveryReason: "200 orders / 0 cancellations",
      financialReason: "no outstanding cash",
    },
  },
  recentShifts: [
    { shiftId: "sh-101", date: "2026-05-08", status: "ON_TIME" },
    { shiftId: "sh-102", date: "2026-05-07", status: "ON_TIME" },
    { shiftId: "sh-103", date: "2026-05-06", status: "ON_TIME" },
  ],
  recentViolations: [],
  expectedFacts: ["92", "attendance", "delivery"],
  stubExplanation:
    "Mohamed scores 92 out of 100. Strongest factor is financial at 100/100; attendance is also strong at 95/100. Mohamed completed 200 orders in the last week with no late arrivals and no outstanding cash. Delivery score sits at 90/100 reflecting consistent on-time performance.",
};
