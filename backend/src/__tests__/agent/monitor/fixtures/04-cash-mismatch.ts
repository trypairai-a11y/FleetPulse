// Gold fixture 04 — cash mismatch > KD 5 → cash reminder.
//
// Driver Saad has KD 28.500 of pending dues from yesterday's settlement.
// Monitor should propose a cash reminder via draftCourierMessage.
// tier=cold (cash reconciliation runs hourly, not minutely).
//
// REQ-agent-action-drafting.

import type { GoldFixture } from "./index";

export const fixture04: GoldFixture = {
  name: "04 — cash mismatch KD 28.500 (Saad) → reminder",
  tenantId: "t-gold-04",
  seed: {
    drivers: [
      {
        id: "drv_b9f2",
        name: "Saad Mahmoud",
        status: "ACTIVE",
        phone: "+96596543210",
      },
    ],
    cashRecords: [
      {
        driverId: "drv_b9f2",
        salesAmount: 152.0,
        collectionAmount: 123.5,
        pendingDues: 28.5,
        date: "2026-05-08",
      },
    ],
  },
  triggerTier: "cold",
  expect: {
    minProposals: 1,
    // Either draftCourierMessage (Phase 2 live tool) OR a future
    // proposeCashReminder tool. Phase 2 ships only draftCourierMessage,
    // so the regression test must accept the live tool.
    requiredToolNames: ["draftCourierMessage"],
    forbiddenToolNames: ["applyPenalty", "suspendDriver"],
    proposalShouldMention: ["cash", "KD"],
  },
};
