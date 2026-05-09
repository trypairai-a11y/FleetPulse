// Gold fixture 10 — courier deleted mid-run (graceful skip).
//
// Edge case: shifts and onlineSessions reference a driverId that no
// longer exists in the Driver table (deleted concurrently or soft-
// deleted). Monitor must skip cleanly — no thrown errors, no
// proposals against a missing courier.
//
// REQ-agent-continuous-monitoring (Pitfall 3 — graceful degradation).

import type { GoldFixture } from "./index";

export const fixture10: GoldFixture = {
  name: "10 — deleted courier mid-run → 0 proposals (graceful)",
  tenantId: "t-gold-10",
  seed: {
    drivers: [], // empty — driverId in shifts is orphaned
    shifts: [
      {
        driverId: "drv_ghost_xx",
        date: "2026-05-03",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_ghost_xx",
        date: "2026-05-05",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_ghost_xx",
        date: "2026-05-08",
        isLate: true,
        actualHoursMinutes: 240,
      },
    ],
  },
  triggerTier: "warm",
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
