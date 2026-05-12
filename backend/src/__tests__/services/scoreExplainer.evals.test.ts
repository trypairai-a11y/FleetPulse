jest.mock("../../config", () => require("../mocks/config"));
jest.mock("../../agent", () => ({
  runAgent: jest.fn(),
  latestMemoryByKey: jest.fn().mockResolvedValue(null),
  upsertAgentMemory: jest.fn(),
}));

import { runAgent } from "../../agent";
// Wave 1 creates this module — import fails today (RED).
import { explainScore } from "../../services/driverFile/scoreExplainer";
import { scoreExplainerFixtures } from "./scoreExplainer/fixtures";

const FORBIDDEN_ACTION_VERBS = /\b(warn|suspend|fire|promote|penalty|penalize|terminate)\b/i;

describe.each(scoreExplainerFixtures)(
  "scoreExplainer gold-set eval — $name (RED — Wave 1)",
  (fixture) => {
    beforeEach(() => {
      jest.clearAllMocks();
      (runAgent as jest.Mock).mockResolvedValue({
        runId: "r1",
        status: "completed",
        text: fixture.stubExplanation,
        actionsProposed: 0,
        pendingActionIds: [],
      });
    });

    it("explanation length is 50-500 chars", async () => {
      const out = await explainScore({
        tenantId: "t",
        driverId: fixture.driverId,
        scoreDate: fixture.scoreDate,
        score: fixture.score,
        recentShifts: fixture.recentShifts,
        recentViolations: fixture.recentViolations,
      });
      expect(out.text.length).toBeGreaterThanOrEqual(50);
      expect(out.text.length).toBeLessThanOrEqual(500);
    });

    it("contains the composite score number as a substring", async () => {
      const out = await explainScore({
        tenantId: "t",
        driverId: fixture.driverId,
        scoreDate: fixture.scoreDate,
        score: fixture.score,
        recentShifts: fixture.recentShifts,
        recentViolations: fixture.recentViolations,
      });
      expect(out.text).toContain(String(fixture.score.compositeScore));
    });

    it("contains AT LEAST ONE of the fixture's expectedFacts (case-insensitive)", async () => {
      const out = await explainScore({
        tenantId: "t",
        driverId: fixture.driverId,
        scoreDate: fixture.scoreDate,
        score: fixture.score,
        recentShifts: fixture.recentShifts,
        recentViolations: fixture.recentViolations,
      });
      const lower = out.text.toLowerCase();
      const hit = fixture.expectedFacts.some((f) => lower.includes(f.toLowerCase()));
      expect(hit).toBe(true);
    });

    it("does NOT contain forbidden action verbs (warn|suspend|fire|promote|penalty|penalize|terminate)", async () => {
      const out = await explainScore({
        tenantId: "t",
        driverId: fixture.driverId,
        scoreDate: fixture.scoreDate,
        score: fixture.score,
        recentShifts: fixture.recentShifts,
        recentViolations: fixture.recentViolations,
      });
      expect(out.text).not.toMatch(FORBIDDEN_ACTION_VERBS);
    });
  },
);
