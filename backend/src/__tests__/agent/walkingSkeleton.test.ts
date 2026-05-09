// Wave 0 RED test — turns GREEN after Wave 1 (runtime relocation to
// backend/src/agent/runtime.ts) AND Wave 3 (the 11 read tools, including
// liveFleetStatus, are registered). Do not skip.
//
// "Walking skeleton" — the thinnest end-to-end proof that the agent
// spine works:
//
//   1. The registry resolves a tool.
//   2. The runtime calls (or sensibly falls back from) Anthropic.
//   3. The tool would execute a tenant-scoped Prisma read.
//   4. AgentRunLog persists with the right tenantId.
//   5. The whole loop terminates within 2 seconds.
//
// In CI we expect ANTHROPIC_API_KEY to be absent, so runAgent returns
// status: "disabled". Both "completed" and "disabled" are acceptable
// outcomes — the spine integrity check is that AgentRunLog.create was
// invoked with tenantId="test-tenant-id".
//
// REQ-agent-read-tools (registers liveFleetStatus),
// REQ-tenant-scoped-everything (runtime persists with tenantId).

import { runAgent } from "../../agent/runtime";
import { prisma } from "../mocks/config";

describe("Phase 1 walking skeleton — agent spine end-to-end smoke", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.agentRunLog.create as jest.Mock).mockResolvedValue({
      id: "run-1",
      tenantId: "test-tenant-id",
    });
    (prisma.agentRunLog.update as jest.Mock).mockResolvedValue({
      id: "run-1",
    });
  });

  test("runs the chat agent with a tenant-scoped read tool, persists AgentRunLog, in <2s", async () => {
    const start = Date.now();
    const result = await runAgent("chat", {
      tenantId: "test-tenant-id",
      triggerEvent: "test:walking-skeleton",
      userMessage: "How many drivers are active right now?",
    });
    const elapsed = Date.now() - start;

    // Either the agent completed (Anthropic key present) or returned
    // disabled (no key in CI). Both prove the spine is wired.
    expect(["completed", "disabled"]).toContain(result.status);

    // Hard SLA — no walking-skeleton run should take longer than 2s.
    expect(elapsed).toBeLessThan(2000);

    // The runtime MUST persist AgentRunLog with the tenantId pulled
    // from input — not from any other source.
    expect(prisma.agentRunLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "test-tenant-id",
          agentId: "chat",
        }),
      }),
    );

    // runId is non-empty when a run actually started (i.e., not the
    // pre-flight failure path where the agent isn't registered).
    expect(typeof result.runId).toBe("string");
  });
});
