// Gold fixture 05 — performance regression (week-over-week) → warn.
//
// Driver Khalid's compositeScore dropped from 88 to 75 over the last
// week. trend="DOWN" + ≥8 point drop. Monitor should flag for review or
// draft a coaching message. tier=cold.
//
// REQ-agent-action-drafting.

import type { GoldFixture } from "./index";

export const fixture05: GoldFixture = {
  name: "05 — performance regression (Khalid) → warn",
  tenantId: "t-gold-05",
  seed: {
    drivers: [
      {
        id: "drv_c8d3",
        name: "Khalid Al-Sabah",
        status: "ACTIVE",
        phone: "+96595432109",
      },
    ],
    aiScores: [
      {
        driverId: "drv_c8d3",
        date: "2026-05-01",
        compositeScore: 88,
        trend: "STABLE",
      },
      {
        driverId: "drv_c8d3",
        date: "2026-05-08",
        compositeScore: 75,
        trend: "DOWN",
      },
    ],
  },
  triggerTier: "cold",
  expect: {
    minProposals: 1,
    requiredToolNames: ["draftCourierMessage"],
    forbiddenToolNames: ["applyPenalty", "suspendDriver"],
    proposalShouldMention: ["score", "down"],
  },
};
