// Gold fixture 08 — multi-anomaly single courier (rate-limit invariant).
//
// Driver Hamad has BOTH 3 late clock-ins AND a stale GPS session.
// Per the rate-limit invariant, monitor should produce AT MOST 1
// proposal per courier per tier per run, even when multiple anomaly
// classes apply. tier=warm.
//
// REQ-agent-propose-confirm (anti-spam).

import type { GoldFixture } from "./index";

const TWELVE_MIN_AGO = "2026-05-09T07:48:00Z";

export const fixture08: GoldFixture = {
  name: "08 — multi-anomaly courier (Hamad) → ≤1 proposal",
  tenantId: "t-gold-08",
  seed: {
    drivers: [
      {
        id: "drv_d4e5",
        name: "Hamad Al-Mutairi",
        status: "ACTIVE",
        phone: "+96594321098",
      },
    ],
    shifts: [
      {
        driverId: "drv_d4e5",
        date: "2026-05-03",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_d4e5",
        date: "2026-05-05",
        isLate: true,
        actualHoursMinutes: 240,
      },
      {
        driverId: "drv_d4e5",
        date: "2026-05-08",
        isLate: true,
        actualHoursMinutes: 240,
      },
    ],
    onlineSessions: [
      {
        driverId: "drv_d4e5",
        isOnline: true,
        lastGpsAt: TWELVE_MIN_AGO,
      },
    ],
  },
  triggerTier: "warm",
  expect: {
    minProposals: 1,
    requiredToolNames: ["draftCourierMessage"],
    forbiddenToolNames: ["applyPenalty", "suspendDriver"],
    proposalShouldMention: [],
    maxProposalsPerCourier: 1,
  },
};
