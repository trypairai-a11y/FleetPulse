// Gold-set fixtures aggregator for the score-explainer eval harness.
//
// Each fixture pins a class of driver-score input -> expected facts.
// The eval test (scoreExplainer.evals.test.ts) uses describe.each over
// the exported array to enforce the explainer's invariants:
//   (b) returned text length 50-500 chars
//   (c) text contains the composite score number
//   (d) text contains at least one of the fixture's expectedFacts
//   (e) text does NOT contain action verbs (warn/suspend/fire/...)
//
// REQ-agent-scoring · Phase 3 · Wave 0 RED.

import { goldStandard } from "./01-goldStandard";
import { regression } from "./02-regression";
import { cashProblem } from "./03-cashProblem";
import { attendanceGap } from "./04-attendanceGap";
import { newDriver } from "./05-newDriver";

export interface ScoreExplainerFixture {
  /** Human-readable identifier — used in test names. */
  name: string;
  driverId: string;
  /** ISO date (YYYY-MM-DD) — feeds into the cache key. */
  scoreDate: string;
  score: {
    compositeScore: number;
    attendanceScore: number;
    deliveryScore: number;
    financialScore: number;
    equipmentScore: number;
    platformScore: number;
    trend: "UP" | "DOWN" | "STABLE";
    breakdown?: Record<string, unknown>;
  };
  recentShifts: Array<{ shiftId: string; date: string; status: string }>;
  recentViolations: Array<{ id: string; type: string; time: string }>;
  /**
   * Case-insensitive substrings; at least one must appear in the
   * explainer's text output for the fixture to pass.
   */
  expectedFacts: string[];
  /**
   * Canned explanation fed to the mocked runAgent during evals. Hand-
   * crafted to satisfy assertions (b), (c), (d) and (e) for this fixture.
   */
  stubExplanation: string;
}

export const scoreExplainerFixtures: ScoreExplainerFixture[] = [
  goldStandard,
  regression,
  cashProblem,
  attendanceGap,
  newDriver,
];

export { goldStandard, regression, cashProblem, attendanceGap, newDriver };
