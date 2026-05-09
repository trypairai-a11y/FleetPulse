// Gold fixture 01 — 3 late clock-ins → warn.
//
// Driver Mohamed has 3 isLate=true shifts in the past 7 days. The
// monitor agent should propose at least one warn-style action (drafted
// via draftCourierMessage) and MUST NOT use applyPenalty / suspendDriver
// (those are Phase 8 tools).
//
// REQ-agent-action-drafting.

import type { GoldFixture } from "./index";

export const fixture01: GoldFixture = {
  name: "01 — 3 late clock-ins (Mohamed) → warn",
  tenantId: "t-gold-01",
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
  },
  triggerTier: "warm",
  expect: {
    minProposals: 1,
    requiredToolNames: ["draftCourierMessage"],
    forbiddenToolNames: ["applyPenalty", "suspendDriver"],
    proposalShouldMention: ["3", "late", "this week"],
  },
};
