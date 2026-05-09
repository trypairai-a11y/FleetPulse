// Phase 2 Wave 0 — Gold-set fixtures aggregator.
//
// 10 hand-graded anomaly fixtures used by promptRegression.test.ts to
// guard against silent prompt regressions. Each fixture seeds a known
// state and asserts (a) min number of proposals, (b) which write-tool
// names MUST appear, (c) which MUST NOT appear (Phase 8 tools), and
// (d) phrases the reasoning should mention.
//
// Adding a new fixture: place file under fixtures/, export a single
// `GoldFixture`, then add it to GOLD_FIXTURES below.
//
// REQ-agent-action-drafting / REQ-agent-propose-confirm.

export interface GoldFixture {
  /** Human-readable name — appears in the it() title. */
  name: string;
  /** tenantId used to seed mocks AND passed to runAgent("monitor"). */
  tenantId: string;
  /** Pre-seeded data state — mocked via the prisma stub in mocks/config. */
  seed: {
    drivers?: Array<{
      id: string;
      name: string;
      status: string;
      phone?: string;
    }>;
    shifts?: Array<{
      driverId: string;
      date: string;
      isLate: boolean;
      actualHoursMinutes?: number;
    }>;
    cashRecords?: Array<{
      driverId: string;
      salesAmount: number;
      collectionAmount: number;
      pendingDues: number;
      date: string;
    }>;
    onlineSessions?: Array<{
      driverId: string;
      isOnline: boolean;
      lastGpsAt: string | null;
    }>;
    aiScores?: Array<{
      driverId: string;
      date: string;
      compositeScore: number;
      trend: string;
    }>;
    /** Pre-existing AgentMemory rows (used for dismiss-suppression). */
    memoryRows?: Array<{ key: string; value: unknown; createdAt: string }>;
    /** When true, the tenant is disabled — monitor must propose 0. */
    tenantDisabled?: boolean;
    /** OrderLog rows (used for rejection-cluster fixture). */
    orderLogs?: Array<{
      driverId: string;
      status: string;
      createdAt: string;
    }>;
  };
  /** Which monitoring tier this fixture is exercised against. */
  triggerTier: "hot" | "warm" | "cold";
  expect: {
    /** Min number of proposals expected. 0 = suppression / empty / disabled. */
    minProposals: number;
    /** Tool names that MUST appear in PendingAgentAction.toolName. */
    requiredToolNames: string[];
    /** Tool names that MUST NOT appear (e.g. Phase 8 applyPenalty/suspendDriver). */
    forbiddenToolNames: string[];
    /** Substrings the reasoning text must contain (case-insensitive). */
    proposalShouldMention: string[];
    /** Optional: cap on proposals per courier per tier (rate-limit invariant). */
    maxProposalsPerCourier?: number;
  };
}

import { fixture01 } from "./01-late-clockins";
import { fixture02 } from "./02-gps-stale";
import { fixture03 } from "./03-rejection-cluster";
import { fixture04 } from "./04-cash-mismatch";
import { fixture05 } from "./05-perf-regression";
import { fixture06 } from "./06-dismissed-suppression";
import { fixture07 } from "./07-empty-state";
import { fixture08 } from "./08-multi-anomaly-courier";
import { fixture09 } from "./09-disabled-tenant";
import { fixture10 } from "./10-deleted-courier";

export const GOLD_FIXTURES: GoldFixture[] = [
  fixture01,
  fixture02,
  fixture03,
  fixture04,
  fixture05,
  fixture06,
  fixture07,
  fixture08,
  fixture09,
  fixture10,
];
