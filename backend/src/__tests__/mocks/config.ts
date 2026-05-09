// Mock Prisma and Redis for unit tests
import { makeAgentMocks } from "./agentMocks";

// Spread agent-model mocks into the prisma stub. The 5 NEW Phase 1 models
// covered by makeAgentMocks() are:
//   - agentAction         (REQ-data-agent-action — audit ledger)
//   - agentMemory         (REQ-data-agent-memory — append-only key/value)
//   - pinnedView          (REQ-data-pinned-view — per-user saved views)
//   - performanceSnapshot (REQ-data-performance-snapshot — daily score snapshot)
//   - metricEvent         (REQ-data-metric-event — in-product analytics)
// Plus the existing agentRunLog (used by ledger.test.ts FK assertions).
// Exported separately so tests can grab the same instances:
//   import { agentMocks, prisma } from "../mocks/config";
export const agentMocks = makeAgentMocks();

export const prisma = {
  ...agentMocks,
  alert: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  talabatViolationEvent: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  driver: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  driverInventory: {
    createMany: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  orderLog: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  shift: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  cashRecord: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  pendingDuesLedger: {
    findMany: jest.fn(),
  },
  talabatSession: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  attendanceRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  platformSettings: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  leaveRequest: {
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

export const redis = null;
export const env = { PORT: 3001, JWT_SECRET: "test", JWT_REFRESH_SECRET: "test", REDIS_URL: "" };
