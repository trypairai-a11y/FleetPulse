/**
 * Jest mocks for the 5 NEW Phase 1 Prisma models PLUS the existing
 * `agentRunLog` (used by ledger.test.ts which links AgentAction rows
 * back to a run via FK).
 *
 * Lifted into `__tests__/mocks/config.ts` via spread so tests that
 * `import { prisma } from "../config"` (the route mock pattern) get
 * mocked agent delegates automatically.
 *
 * Per-test reset:
 *   beforeEach(() => { jest.clearAllMocks(); });
 *
 * REQ-data-agent-action, REQ-data-agent-memory, REQ-data-pinned-view,
 * REQ-data-performance-snapshot, REQ-data-metric-event.
 */

export function makeAgentMocks() {
  return {
    agentAction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    agentMemory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    pinnedView: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    performanceSnapshot: {
      create: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    metricEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    // existing — required so the walking-skeleton + ledger tests can
    // assert against AgentRunLog writes (the runtime persists one row
    // per agent invocation and ledger entries link via runId FK).
    agentRunLog: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
}
