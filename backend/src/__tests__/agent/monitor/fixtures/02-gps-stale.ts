// Gold fixture 02 — GPS stale > 10 min → ping.
//
// Driver Ali is online but his last GPS update was 12 min ago. Monitor
// should propose a check-in / ping. tier=hot (1-min cadence) — GPS
// staleness is the canonical hot-tier anomaly.
//
// REQ-agent-action-drafting + REQ-agent-continuous-monitoring.

import type { GoldFixture } from "./index";

const NOW = "2026-05-09T08:00:00Z";
const TWELVE_MIN_AGO = "2026-05-09T07:48:00Z";

export const fixture02: GoldFixture = {
  name: "02 — GPS stale 12 min (Ali) → ping",
  tenantId: "t-gold-02",
  seed: {
    drivers: [
      {
        id: "drv_z73",
        name: "Ali Hassan",
        status: "ACTIVE",
        phone: "+96598765432",
      },
    ],
    onlineSessions: [
      {
        driverId: "drv_z73",
        isOnline: true,
        lastGpsAt: TWELVE_MIN_AGO,
      },
    ],
    // shifts kept to anchor "active today"
    shifts: [
      {
        driverId: "drv_z73",
        date: "2026-05-09",
        isLate: false,
        actualHoursMinutes: 180,
      },
    ],
  },
  triggerTier: "hot",
  expect: {
    minProposals: 1,
    requiredToolNames: ["draftCourierMessage"],
    forbiddenToolNames: ["applyPenalty", "suspendDriver"],
    proposalShouldMention: ["GPS", "stale"],
  },
};

void NOW; // anchor — fixture cited NOW for clarity
