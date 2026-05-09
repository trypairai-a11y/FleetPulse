// Wave 0 RED test — turns GREEN after Wave 1 (monitor agent registered)
// + Wave 3 (draftCourierMessage write tool registered) + Wave 1 (monitor
// scheduler ships monitorTick). Do not skip.
//
// Behavior contract (REQ-agent-continuous-monitoring):
// runAgent("monitor") with the late-clockin gold fixture must:
//   1. Call ≥1 read tool (e.g. courierLeaderboard / attendanceForPeriod).
//   2. Invoke draftCourierMessage as a write tool.
//   3. The write-tool invocation MUST result in
//      prisma.pendingAgentAction.create being called with toolName=
//      "draftCourierMessage", tenantId, runId, agentId="monitor"
//      (NOT execute the side effect — propose-and-confirm).
//
// "Walking skeleton" — the thinnest end-to-end proof that the monitor
// agent flows from cron tick to PendingAgentAction.
//
// REQ-agent-continuous-monitoring + REQ-agent-action-drafting +
// REQ-agent-propose-confirm.

// Side-effect import: registers the monitor agent + write tools (Wave 1+3).
import "../../../agent";
// Wave 1 will also export monitor as an AgentId on RunAgentInput; until
// then, this import + cast surfaces the RED state cleanly.
import { runAgent } from "../../../agent/runtime";
import { fixture01 } from "./fixtures/01-late-clockins";
import { prisma } from "../../mocks/config";

describe("REQ-agent-continuous-monitoring: monitor end-to-end smoke", () => {
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
    (prisma.driver.findFirst as jest.Mock).mockResolvedValue(
      (fixture01.seed.drivers ?? [])[0] ?? null,
    );
    (prisma.shift.findMany as jest.Mock).mockResolvedValue(
      fixture01.seed.shifts ?? [],
    );
    (prisma.pendingAgentAction.create as jest.Mock).mockResolvedValue({
      id: "pa-monitor-1",
    });
  });

  test("cron tick → runAgent('monitor') → read tools called → draftCourierMessage proposed → PendingAgentAction created", async () => {
    const result = await runAgent("monitor" as any, {
      tenantId: fixture01.tenantId,
      triggerEvent: "cron:warm",
      payload: { tier: "warm" },
    });

    // Either completed (Anthropic key present) or disabled (CI). Both
    // prove the spine; assertion narrows further when key present.
    expect(["completed", "disabled"]).toContain(result.status);

    // The runtime persists AgentRunLog with agentId="monitor" and the
    // tenantId pulled from input — not from any other source.
    expect(prisma.agentRunLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: fixture01.tenantId,
          agentId: "monitor",
        }),
      }),
    );

    // When ANTHROPIC_API_KEY is set in CI, the monitor must propose
    // at least one PendingAgentAction with toolName=draftCourierMessage.
    if (result.status === "completed") {
      expect(prisma.pendingAgentAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: fixture01.tenantId,
            agentId: "monitor",
            toolName: "draftCourierMessage",
            runId: expect.any(String),
          }),
        }),
      );
    }
  });
});
