// Wave 0 RED test — turns GREEN in Wave 2 when
// backend/src/services/decisions/cardProjector.ts ships
// projectPendingAction(). Do not skip.
//
// Behavior contract (CON-decisions-card-shape, UI-SPEC §3.1.2):
// projectPendingAction maps a PendingAgentAction row + its driver
// lookup into a DecisionCardData object with:
//   - tag: "Suspend" | "Penalty" | "Cash reminder" | "Warn" | "Promote"
//          | "Review" | "Other"
//   - state: "pending" | "approved" | "dismissed" (derived from
//          resolvedAt + resolution)
//   - toolIsLive: true ONLY for draftCourierMessage in Phase 2 (other
//          tools ship in Phase 8)
//   - driverName loaded via prisma.driver.findFirst with
//          where: { id: subjectId, tenantId: ctx.tenantId }
//
// REQ-decisions-proposal-inbox.

import { projectPendingAction } from "../../services/decisions/cardProjector";
import { prisma } from "../mocks/config";

const TENANT = "tenant-A";

const basePending = {
  id: "pa-1",
  tenantId: TENANT,
  runId: "run-1",
  agentId: "monitor",
  toolName: "draftCourierMessage",
  input: { driverId: "drv_xy12", body: "Hi Mohamed, please clock in on time." },
  recommendation: "approve",
  reasoning:
    "I noticed Mohamed clocked in late 3 times this week. Trend: regression.",
  confidence: 0.85,
  priorityScore: 0.7,
  subjectType: "Driver",
  subjectId: "drv_xy12",
  resolvedAt: null,
  resolution: null,
  overrideReason: null,
  createdAt: new Date("2026-05-09T06:31:00Z"),
};

describe("REQ-decisions-proposal-inbox: projectPendingAction (CON-decisions-card-shape)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.driver.findFirst as jest.Mock).mockResolvedValue({
      id: "drv_xy12",
      tenantId: TENANT,
      name: "Mohamed Khaled",
      phone: "+96599887766",
    });
  });

  test("maps PendingAgentAction.toolName=draftCourierMessage to tag='Warn'", async () => {
    const card = await projectPendingAction(basePending, { tenantId: TENANT });
    expect(card.tag).toBe("Warn");
  });

  test("loads driverName via prisma.driver.findFirst({where:{id:subjectId,tenantId:ctx.tenantId}})", async () => {
    await projectPendingAction(basePending, { tenantId: TENANT });
    expect(prisma.driver.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "drv_xy12",
          tenantId: TENANT,
        }),
      }),
    );
  });

  test("sets toolIsLive=true ONLY for draftCourierMessage in Phase 2", async () => {
    const live = await projectPendingAction(basePending, { tenantId: TENANT });
    expect(live.toolIsLive).toBe(true);

    const phase8 = await projectPendingAction(
      { ...basePending, toolName: "applyPenalty" },
      { tenantId: TENANT },
    );
    expect(phase8.toolIsLive).toBe(false);

    const phase8b = await projectPendingAction(
      { ...basePending, toolName: "suspendDriver" },
      { tenantId: TENANT },
    );
    expect(phase8b.toolIsLive).toBe(false);
  });

  test("computes state from resolvedAt + resolution", async () => {
    const pending = await projectPendingAction(basePending, {
      tenantId: TENANT,
    });
    expect(pending.state).toBe("pending");

    const approved = await projectPendingAction(
      {
        ...basePending,
        resolvedAt: new Date("2026-05-09T06:32:00Z"),
        resolution: "approved",
      },
      { tenantId: TENANT },
    );
    expect(approved.state).toBe("approved");

    const dismissed = await projectPendingAction(
      {
        ...basePending,
        resolvedAt: new Date("2026-05-09T06:33:00Z"),
        resolution: "rejected",
      },
      { tenantId: TENANT },
    );
    expect(dismissed.state).toBe("dismissed");
  });
});
