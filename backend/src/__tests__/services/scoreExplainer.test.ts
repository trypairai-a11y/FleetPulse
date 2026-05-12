jest.mock("../../config", () => require("../mocks/config"));
jest.mock("../../agent", () => ({
  runAgent: jest.fn(),
  latestMemoryByKey: jest.fn(),
  upsertAgentMemory: jest.fn(),
  listMemoriesByPrefix: jest.fn(),
  listSnapshotsForDriver: jest.fn(),
}));

import { runAgent, latestMemoryByKey, upsertAgentMemory } from "../../agent";
// Wave 1 creates this module — import fails today (RED).
import { explainScore } from "../../services/driverFile/scoreExplainer";

const TENANT = "test-tenant";
const SCORE = {
  compositeScore: 78,
  attendanceScore: 80,
  deliveryScore: 75,
  financialScore: 80,
  equipmentScore: 90,
  platformScore: 70,
  trend: "STABLE" as const,
};
const INPUT = {
  tenantId: TENANT,
  driverId: "d1",
  scoreDate: "2026-05-01",
  score: SCORE,
  recentShifts: [],
  recentViolations: [],
};

describe("scoreExplainer.explainScore (RED — Wave 1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("MISS: calls runAgent('score-explainer', { tenantId, triggerEvent: 'explain_score', payload }) and returns { text, cached: false }", async () => {
    (latestMemoryByKey as jest.Mock).mockResolvedValue(null);
    (runAgent as jest.Mock).mockResolvedValue({
      runId: "r1",
      status: "completed",
      text: "Mohamed scores 78 / 100. Attendance is solid.",
      actionsProposed: 0,
      pendingActionIds: [],
    });
    const out = await explainScore(INPUT);
    expect(runAgent).toHaveBeenCalledTimes(1);
    expect(runAgent).toHaveBeenCalledWith(
      "score-explainer",
      expect.objectContaining({ tenantId: TENANT, triggerEvent: "explain_score" }),
    );
    expect(out.cached).toBe(false);
    expect(out.text).toBeTruthy();
  });

  it("HIT: when latestMemoryByKey returns a row < 1h old with the right cache key, runAgent is NOT called and { text, cached: true } is returned", async () => {
    (latestMemoryByKey as jest.Mock).mockResolvedValue({
      value: { text: "cached text" },
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    });
    const out = await explainScore(INPUT);
    expect(runAgent).not.toHaveBeenCalled();
    expect(out).toEqual({ text: "cached text", cached: true });
  });

  it("DISABLED: when runAgent returns { status: 'disabled' }, explainScore returns { text: 'Score explanation unavailable.', cached: false } and does NOT throw", async () => {
    (latestMemoryByKey as jest.Mock).mockResolvedValue(null);
    (runAgent as jest.Mock).mockResolvedValue({
      runId: "r1",
      status: "disabled",
      actionsProposed: 0,
      pendingActionIds: [],
    });
    const out = await explainScore(INPUT);
    expect(out).toEqual({ text: "Score explanation unavailable.", cached: false });
  });
});
