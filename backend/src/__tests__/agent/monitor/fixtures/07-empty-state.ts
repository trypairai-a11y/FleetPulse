// Gold fixture 07 — empty state (no anomalies) → 0 proposals.
//
// No drivers, no anomalies. Monitor must NOT hallucinate work.
//
// REQ-agent-propose-confirm (no false-positive proposals).

import type { GoldFixture } from "./index";

export const fixture07: GoldFixture = {
  name: "07 — empty fleet → 0 proposals",
  tenantId: "t-gold-07",
  seed: {
    drivers: [],
    shifts: [],
    cashRecords: [],
    onlineSessions: [],
  },
  triggerTier: "hot",
  expect: {
    minProposals: 0,
    requiredToolNames: [],
    forbiddenToolNames: [
      "applyPenalty",
      "suspendDriver",
      "draftCourierMessage",
    ],
    proposalShouldMention: [],
  },
};
