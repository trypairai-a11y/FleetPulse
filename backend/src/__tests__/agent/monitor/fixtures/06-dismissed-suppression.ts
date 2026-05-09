// Gold fixture 06 — repeated proposal SUPPRESSED by 2-day-old dismissal.
//
// Same seed as fixture 01 (3 late clock-ins for drv_xy12) PLUS an
// AgentMemory row dismissed:draftCourierMessage:Driver:drv_xy12 created
// 2 days ago. Per CON-dismiss-suppression-7-day, monitor must skip the
// identical proposal — minProposals=0.
//
// REQ-agent-propose-confirm.

import type { GoldFixture } from "./index";

const TWO_DAYS_AGO = "2026-05-07T10:00:00Z";

export const fixture06: GoldFixture = {
  name: "06 — dismissed 2 days ago (suppression) → 0 proposals",
  tenantId: "t-gold-06",
  seed: {
    drivers: [
      {
        id: "drv_xy12",
        name: "Mohamed Khaled",
        status: "ACTIVE",
        phone: "+96599887766",
      },
    ],
    shifts: [
      {
        driverId: "drv_xy12",
        date: "2026-05-03",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_xy12",
        date: "2026-05-05",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_xy12",
        date: "2026-05-08",
        isLate: true,
        actualHoursMinutes: 240,
      },
    ],
    memoryRows: [
      {
        key: "dismissed:draftCourierMessage:Driver:drv_xy12",
        value: {
          reason: "phone repair, told dispatcher",
          dismissedBy: "user-42",
          dismissedAt: TWO_DAYS_AGO,
        },
        createdAt: TWO_DAYS_AGO,
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
