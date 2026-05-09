// Gold fixture 09 — disabled tenant → 0 proposals.
//
// Tenant is disabled (subscription paused, trial expired, or admin
// suspension). Monitor MUST short-circuit before invoking any tool —
// no proposals, no Anthropic spend.
//
// REQ-agent-continuous-monitoring (cost guard) + Pitfall 3 (per-tenant
// circuit breaker).

import type { GoldFixture } from "./index";

export const fixture09: GoldFixture = {
  name: "09 — disabled tenant → 0 proposals (cost guard)",
  tenantId: "t-gold-09",
  seed: {
    tenantDisabled: true,
    drivers: [
      {
        id: "drv_e6f7",
        name: "Disabled-Tenant Driver",
        status: "ACTIVE",
      },
    ],
    shifts: [
      {
        driverId: "drv_e6f7",
        date: "2026-05-03",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_e6f7",
        date: "2026-05-05",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_e6f7",
        date: "2026-05-08",
        isLate: true,
        actualHoursMinutes: 240,
      },
    ],
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
