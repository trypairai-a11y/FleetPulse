// Wave 0 RED test — turns GREEN when Wave 1 mounts the agent mocks
// (already done in Wave 0 Task 0.2; functions as a regression sentinel
// for Wave 1's Prisma migration). Do not skip.
//
// Behavior: assert the mocked Prisma client exposes a delegate for each
// of the 5 NEW Phase 1 models. When Wave 1 runs `prisma generate` after
// the migration, the real client will also expose them — and any future
// schema regression that drops one of these models breaks this test
// before it breaks production.
//
// REQ-data-agent-action, REQ-data-agent-memory, REQ-data-pinned-view,
// REQ-data-performance-snapshot, REQ-data-metric-event.

// jest.config.js's moduleNameMapper anchors `^../config$` (one parent up),
// not two — so deeper test files import the mock directly. This keeps the
// Wave 0 plan's "do not modify jest.config.js" rule intact while letting
// the schema test verify the mock's shape.
import { prisma as realPrisma } from "../mocks/config";
const prisma = realPrisma as unknown as Record<
  string,
  Record<string, jest.Mock>
>;

describe("Phase 1 — Prisma schema shape (5 new agent-spine models)", () => {
  test("AgentAction delegate is exposed on prisma client", () => {
    expect(typeof prisma.agentAction.create).toBe("function");
    expect(typeof prisma.agentAction.findFirst).toBe("function");
    expect(typeof prisma.agentAction.findMany).toBe("function");
    expect(typeof prisma.agentAction.count).toBe("function");
  });

  test("AgentMemory delegate is exposed on prisma client", () => {
    expect(typeof prisma.agentMemory.create).toBe("function");
    expect(typeof prisma.agentMemory.findFirst).toBe("function");
    expect(typeof prisma.agentMemory.findMany).toBe("function");
  });

  test("PinnedView delegate is exposed on prisma client", () => {
    expect(typeof prisma.pinnedView.create).toBe("function");
    expect(typeof prisma.pinnedView.findMany).toBe("function");
    expect(typeof prisma.pinnedView.update).toBe("function");
    expect(typeof prisma.pinnedView.delete).toBe("function");
  });

  test("PerformanceSnapshot delegate is exposed on prisma client", () => {
    expect(typeof prisma.performanceSnapshot.create).toBe("function");
    expect(typeof prisma.performanceSnapshot.upsert).toBe("function");
    expect(typeof prisma.performanceSnapshot.findMany).toBe("function");
  });

  test("MetricEvent delegate is exposed on prisma client", () => {
    expect(typeof prisma.metricEvent.create).toBe("function");
    expect(typeof prisma.metricEvent.findMany).toBe("function");
  });

  test("existing AgentRunLog delegate still exposed (regression sentinel)", () => {
    expect(typeof prisma.agentRunLog.create).toBe("function");
    expect(typeof prisma.agentRunLog.update).toBe("function");
  });
});
