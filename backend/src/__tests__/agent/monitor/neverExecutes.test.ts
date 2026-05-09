// Wave 0 RED test — turns GREEN after Wave 1 (monitor agent) + Wave 3
// (draftCourierMessage write tool with requiresApproval=true). Do not
// skip.
//
// Behavior contract (the propose-and-confirm INVARIANT):
// In Phase 2, the monitor agent NEVER executes a write-tool side
// effect. Specifically:
//   1. The tool-loop with the late-clockin fixture must NEVER call
//      prisma.notification.create (or any other write delegate of a
//      live-fire tool).
//   2. ctx.userId must be undefined for the entire monitor run; if
//      a write tool's execute body sees ctx.userId set, fail (this
//      asserts the registry's approval gate is the ONLY path through
//      which a write-tool side-effect runs).
//
// REQ-agent-propose-confirm — this is the trust mechanism. If a single
// write-tool side effect leaks from the monitor's run, the design
// partner's morning ritual is broken.

// Side-effect import: registers monitor agent + write tools.
import "../../../agent";
import { runAgent } from "../../../agent/runtime";
import { fixture01 } from "./fixtures/01-late-clockins";
import { prisma } from "../../mocks/config";

describe("REQ-agent-propose-confirm: monitor never executes write tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.agentRunLog.create as jest.Mock).mockResolvedValue({
      id: "run-monitor-1",
      tenantId: fixture01.tenantId,
    });
    (prisma.agentRunLog.update as jest.Mock).mockResolvedValue({
      id: "run-monitor-1",
    });
    (prisma.driver.findMany as jest.Mock).mockResolvedValue(
      fixture01.seed.drivers ?? [],
    );
    (prisma.shift.findMany as jest.Mock).mockResolvedValue(
      fixture01.seed.shifts ?? [],
    );
    (prisma.pendingAgentAction.create as jest.Mock).mockResolvedValue({
      id: "pa-monitor-1",
    });
    // notification.create exists on the live prisma — mock it inline so
    // we can assert it's never called. Keeping it on the prisma mock
    // surface here proves the test would catch a regression.
    (prisma as any).notification = { create: jest.fn() };
  });

  test("monitor's tool-loop never calls prisma.notification.create (only pendingAgentAction.create)", async () => {
    const result = await runAgent("monitor" as any, {
      tenantId: fixture01.tenantId,
      triggerEvent: "cron:warm",
      payload: { tier: "warm" },
    });
    expect(["completed", "disabled"]).toContain(result.status);

    // The KEY assertion: zero side effects against the live world from
    // the monitor's run. Pending actions are fine; notifications are not.
    expect((prisma as any).notification.create).not.toHaveBeenCalled();
  });

  test("registry rejects write-tool .execute() path during monitor (ctx.userId is undefined)", async () => {
    // We spy on toolRegistry.invoke and assert that when the monitor
    // fires a write tool, the ctx passed to invoke has userId === undefined.
    // The registry's approval gate guarantees execute() is NOT reached
    // when ctx.userId is undefined AND requiresApproval=true.
    const registry = await import("../../../agent/registry");
    const invokeSpy = jest.spyOn(registry.toolRegistry, "invoke");

    await runAgent("monitor" as any, {
      tenantId: fixture01.tenantId,
      triggerEvent: "cron:warm",
      payload: { tier: "warm" },
    });

    // Every invoke call by the monitor — read OR write — must pass a
    // ctx whose userId is undefined.
    for (const call of invokeSpy.mock.calls) {
      const [, ctx] = call;
      expect((ctx as any).userId).toBeUndefined();
    }
    invokeSpy.mockRestore();
  });
});
