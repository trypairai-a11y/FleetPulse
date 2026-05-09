// Wave 0 RED test — turns GREEN in Wave 2 when monitor reads
// listMemoriesByPrefix("dismissed:") before proposing. Do not skip.
//
// Behavior contract (CON-dismiss-suppression-7-day):
// When an AgentMemory row exists with key
//   `dismissed:${toolName}:${subjectType}:${subjectId}`
// AND its createdAt is within the last 7 days, the monitor's NEXT run
// must SKIP proposing the same action against the same subject.
//
// Tests:
//   1. Fixture 06 (prior dismissal 2 days ago, same anomaly) →
//      minProposals=0.
//   2. Fixture 06 with prior dismissal 8 days ago → ≥1 proposal
//      (suppression window is exactly 7 days).
//
// REQ-agent-propose-confirm.

import "../../../agent";
import { runAgent } from "../../../agent/runtime";
import { fixture06 } from "./fixtures/06-dismissed-suppression";
import { prisma } from "../../mocks/config";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setupSeed(memoryAgeDays: number) {
  jest.clearAllMocks();
  (prisma.agentRunLog.create as jest.Mock).mockResolvedValue({
    id: "run-1",
    tenantId: fixture06.tenantId,
  });
  (prisma.agentRunLog.update as jest.Mock).mockResolvedValue({
    id: "run-1",
  });
  (prisma.driver.findMany as jest.Mock).mockResolvedValue(
    fixture06.seed.drivers ?? [],
  );
  (prisma.shift.findMany as jest.Mock).mockResolvedValue(
    fixture06.seed.shifts ?? [],
  );

  const memoryCreatedAt = new Date(Date.now() - memoryAgeDays * 24 * 60 * 60 * 1000);
  (prisma.agentMemory.findMany as jest.Mock).mockResolvedValue([
    {
      id: "mem-dismiss-1",
      tenantId: fixture06.tenantId,
      key: "dismissed:draftCourierMessage:Driver:drv_xy12",
      value: (fixture06.seed.memoryRows ?? [])[0]?.value ?? {},
      createdAt: memoryCreatedAt,
    },
  ]);
  (prisma.agentMemory.findFirst as jest.Mock).mockResolvedValue({
    id: "mem-dismiss-1",
    tenantId: fixture06.tenantId,
    key: "dismissed:draftCourierMessage:Driver:drv_xy12",
    value: (fixture06.seed.memoryRows ?? [])[0]?.value ?? {},
    createdAt: memoryCreatedAt,
  });
  (prisma.pendingAgentAction.create as jest.Mock).mockResolvedValue({
    id: "pa-1",
  });
}

describe("REQ-agent-propose-confirm: 7-day dismiss suppression window", () => {
  test("prior dismissal 2 days ago → 0 proposals (within suppression window)", async () => {
    setupSeed(2);

    const result = await runAgent("monitor" as any, {
      tenantId: fixture06.tenantId,
      triggerEvent: "cron:warm",
      payload: { tier: "warm" },
    });

    expect(["completed", "disabled"]).toContain(result.status);
    if (result.status === "completed") {
      // The monitor must read the dismiss memory BEFORE proposing.
      expect(
        (prisma.agentMemory.findMany as jest.Mock).mock.calls.length +
          (prisma.agentMemory.findFirst as jest.Mock).mock.calls.length,
      ).toBeGreaterThan(0);
      // And not propose the same action.
      expect(prisma.pendingAgentAction.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toolName: "draftCourierMessage",
            subjectId: "drv_xy12",
          }),
        }),
      );
    }
  });

  test("prior dismissal 8 days ago → suppression window expired, ≥1 proposal", async () => {
    setupSeed(8);

    const result = await runAgent("monitor" as any, {
      tenantId: fixture06.tenantId,
      triggerEvent: "cron:warm",
      payload: { tier: "warm" },
    });

    expect(["completed", "disabled"]).toContain(result.status);
    if (result.status === "completed") {
      expect(prisma.pendingAgentAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toolName: "draftCourierMessage",
            subjectId: "drv_xy12",
          }),
        }),
      );
    }
  });
});

void SEVEN_DAYS_MS; // anchor — referenced for future-author orientation
