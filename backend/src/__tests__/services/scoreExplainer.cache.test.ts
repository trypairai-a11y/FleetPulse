jest.mock("../../config", () => require("../mocks/config"));
jest.mock("../../agent", () => ({
  runAgent: jest.fn(),
  latestMemoryByKey: jest.fn(),
  upsertAgentMemory: jest.fn(),
}));

import { runAgent, latestMemoryByKey } from "../../agent";
// Wave 1 creates this module — import fails today (RED).
import { explainScore } from "../../services/driverFile/scoreExplainer";

describe("scoreExplainer cache invalidation by compositeScore (RED — Wave 1, Pitfall 2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (latestMemoryByKey as jest.Mock).mockResolvedValue(null); // always miss for this contract test
    (runAgent as jest.Mock).mockResolvedValue({
      runId: "r1",
      status: "completed",
      text: "explanation",
      actionsProposed: 0,
      pendingActionIds: [],
    });
  });

  it("cache key invalidates when compositeScore changes within the same scoreDate — second call misses cache (compositeScore in key)", async () => {
    const base = {
      tenantId: "t",
      driverId: "d1",
      scoreDate: "2026-05-01",
      recentShifts: [],
      recentViolations: [],
    };
    await explainScore({ ...base, score: { compositeScore: 78, attendanceScore: 80, deliveryScore: 75, financialScore: 80, equipmentScore: 90, platformScore: 70, trend: "STABLE" } });
    await explainScore({ ...base, score: { compositeScore: 72, attendanceScore: 80, deliveryScore: 75, financialScore: 80, equipmentScore: 90, platformScore: 70, trend: "DOWN" } });
    // Two distinct cache keys → two runAgent invocations
    expect(runAgent).toHaveBeenCalledTimes(2);
    // The cache-lookup call must include compositeScore in its key
    const lookupCalls = (latestMemoryByKey as jest.Mock).mock.calls;
    expect(lookupCalls[0][1]).toContain("78");
    expect(lookupCalls[1][1]).toContain("72");
  });
});
