// Gold fixture 03 — 3+ order rejections in 2 hours → warn.
//
// Driver has been rejecting orders rapidly (3 REJECTED orderLog rows
// inside a 2-hour window). Monitor should flag for review or draft a
// courier message. tier=hot (real-time anomaly).
//
// REQ-agent-action-drafting + REQ-agent-continuous-monitoring.

import type { GoldFixture } from "./index";

export const fixture03: GoldFixture = {
  name: "03 — 3 order rejections in 2 hours (Yousef) → warn",
  tenantId: "t-gold-03",
  seed: {
    drivers: [
      {
        id: "drv_aa11",
        name: "Yousef Al-Rashid",
        status: "ACTIVE",
        phone: "+96597654321",
      },
    ],
    orderLogs: [
      {
        driverId: "drv_aa11",
        status: "REJECTED",
        createdAt: "2026-05-09T06:30:00Z",
      },
      {
        driverId: "drv_aa11",
        status: "REJECTED",
        createdAt: "2026-05-09T07:10:00Z",
      },
      {
        driverId: "drv_aa11",
        status: "REJECTED",
        createdAt: "2026-05-09T08:00:00Z",
      },
    ],
  },
  triggerTier: "hot",
  expect: {
    minProposals: 1,
    requiredToolNames: ["draftCourierMessage"],
    forbiddenToolNames: ["applyPenalty", "suspendDriver"],
    proposalShouldMention: ["rejection", "3"],
  },
};
