// Wave 0 RED test — turns GREEN in Wave 2 when backend/src/agent/ledger.ts
// ships with writeAgentAction(). Do not skip.
//
// Behavior contract (CON-audit-row-shape):
// Every fired action writes an AgentAction row carrying:
//   proposer (always "Darb"), approverId (human user id), agentRunId,
//   toolName, originalProposal, modificationsBeforeApproval, outcome,
//   reasoning, modelName, prompt/completion tokens, latencyMs,
//   subjectType, subjectId.
// REQ-data-agent-action.

import { writeAgentAction } from "../../agent/ledger";
import { prisma } from "../mocks/config";

const validRow = {
  tenantId: "tenant-a",
  approverUserId: "user-1",
  agentRunId: "run-1",
  toolName: "applyPenalty",
  originalProposal: { driverId: "driver-1", amountKd: 5 },
  outcome: "success" as const,
  reasoning: "GPS log shows 3232m gap from drop-off to customer.",
  modelName: "claude-sonnet-4-6",
};

describe("writeAgentAction — REQ-data-agent-action / CON-audit-row-shape", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.agentAction.create as jest.Mock).mockResolvedValue({
      id: "action-1",
    });
  });

  test("proposer is always 'Darb' (CON-audit-row-shape)", async () => {
    await writeAgentAction(validRow);
    expect(prisma.agentAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        proposer: "Darb",
        tenantId: "tenant-a",
        approverId: "user-1",
        toolName: "applyPenalty",
        outcome: "success",
      }),
    });
  });

  test("originalProposal and modificationsBeforeApproval persist as JSON", async () => {
    await writeAgentAction({
      ...validRow,
      modificationsBeforeApproval: { amountKd: 7 },
    });
    const arg = (prisma.agentAction.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.originalProposal).toEqual({
      driverId: "driver-1",
      amountKd: 5,
    });
    expect(arg.data.modificationsBeforeApproval).toEqual({ amountKd: 7 });
  });

  test("throws when tenantId is empty string", async () => {
    await expect(
      writeAgentAction({ ...validRow, tenantId: "" }),
    ).rejects.toThrow();
  });

  test("passes through latencyMs, promptTokens, completionTokens, modelName", async () => {
    await writeAgentAction({
      ...validRow,
      promptTokens: 1400,
      completionTokens: 220,
      latencyMs: 850,
    });
    expect(prisma.agentAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modelName: "claude-sonnet-4-6",
        promptTokens: 1400,
        completionTokens: 220,
        latencyMs: 850,
      }),
    });
  });

  test("subjectType and subjectId are persisted when provided", async () => {
    await writeAgentAction({
      ...validRow,
      subjectType: "Driver",
      subjectId: "driver-1",
    });
    expect(prisma.agentAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectType: "Driver",
        subjectId: "driver-1",
      }),
    });
  });
});
