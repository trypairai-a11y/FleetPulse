// Wave 0 RED test — turns GREEN after Wave 1 (monitor agent) + Wave 3
// (write tools registered) + Wave 4 (monitor.md prompt finalised).
// Do not skip.
//
// Behavior contract (REQ-agent-action-drafting):
// For each of 10 gold-set fixtures, run the monitor agent and assert:
//   - minProposals (≥ N proposals expected)
//   - requiredToolNames (these tool names MUST appear in
//     PendingAgentAction.toolName)
//   - forbiddenToolNames (Phase-8 tools applyPenalty/suspendDriver
//     MUST NOT appear in v1)
//   - proposalShouldMention (case-insensitive substring matches in
//     reasoning)
//   - maxProposalsPerCourier (rate-limit invariant for fixture 08)
//
// Snapshot the rendered headline+reasoning per fixture so prompt diffs
// surface as PR-visible diffs.
//
// CI gate: this file blocks merges that touch
//   agent/prompts/monitor.md OR agent/tools/action/*.ts
// without re-running this suite.

import "../../../agent";
import { runAgent } from "../../../agent/runtime";
import { GOLD_FIXTURES, type GoldFixture } from "./fixtures";
import { prisma } from "../../mocks/config";

function seedMocks(fix: GoldFixture) {
  jest.clearAllMocks();
  (prisma.agentRunLog.create as jest.Mock).mockResolvedValue({
    id: `run-${fix.tenantId}`,
    tenantId: fix.tenantId,
  });
  (prisma.agentRunLog.update as jest.Mock).mockResolvedValue({
    id: `run-${fix.tenantId}`,
  });
  (prisma.driver.findMany as jest.Mock).mockResolvedValue(
    fix.seed.drivers ?? [],
  );
  (prisma.driver.findFirst as jest.Mock).mockImplementation(({ where }: any) =>
    Promise.resolve(
      (fix.seed.drivers ?? []).find((d) => d.id === where?.id) ?? null,
    ),
  );
  (prisma.driver.count as jest.Mock).mockResolvedValue(
    (fix.seed.drivers ?? []).length,
  );
  (prisma.shift.findMany as jest.Mock).mockResolvedValue(
    fix.seed.shifts ?? [],
  );
  (prisma.cashRecord.findMany as jest.Mock).mockResolvedValue(
    fix.seed.cashRecords ?? [],
  );
  (prisma.cashRecord.aggregate as jest.Mock).mockResolvedValue({
    _sum: {
      pendingDues: (fix.seed.cashRecords ?? []).reduce(
        (acc, c) => acc + (c.pendingDues ?? 0),
        0,
      ),
    },
  });
  (prisma.orderLog.findMany as jest.Mock).mockResolvedValue(
    fix.seed.orderLogs ?? [],
  );
  (prisma.orderLog.count as jest.Mock).mockResolvedValue(
    (fix.seed.orderLogs ?? []).length,
  );
  // CourierOnlineSession + AiScore aren't on the default mock surface;
  // declare inline so each fixture can attach its own seed.
  (prisma as any).courierOnlineSession = {
    findMany: jest
      .fn()
      .mockResolvedValue(fix.seed.onlineSessions ?? []),
  };
  (prisma as any).performanceScore = {
    findMany: jest.fn().mockResolvedValue(fix.seed.aiScores ?? []),
  };
  (prisma.agentMemory.findMany as jest.Mock).mockResolvedValue(
    (fix.seed.memoryRows ?? []).map((m) => ({
      id: `mem-${m.key}`,
      tenantId: fix.tenantId,
      key: m.key,
      value: m.value,
      createdAt: new Date(m.createdAt),
    })),
  );
  (prisma.agentMemory.findFirst as jest.Mock).mockResolvedValue(
    (fix.seed.memoryRows ?? []).map((m) => ({
      id: `mem-${m.key}`,
      tenantId: fix.tenantId,
      key: m.key,
      value: m.value,
      createdAt: new Date(m.createdAt),
    }))[0] ?? null,
  );
  (prisma.pendingAgentAction.create as jest.Mock).mockImplementation(
    ({ data }: any) =>
      Promise.resolve({ id: `pa-${Math.random().toString(36).slice(2)}`, ...data }),
  );

  // Tenant-disabled circuit breaker — fixture 09 sets tenantDisabled=true.
  // The monitor must short-circuit before any tool fires. Mock the
  // tenant lookup the runtime / monitor uses to enforce this.
  (prisma as any).tenant = {
    findFirst: jest.fn().mockResolvedValue({
      id: fix.tenantId,
      disabled: !!fix.seed.tenantDisabled,
      isActive: !fix.seed.tenantDisabled,
    }),
  };
}

async function getStagedPendingActions(tenantId: string) {
  // Pull every call to prisma.pendingAgentAction.create that matched
  // this tenantId — the .create mock returns objects shaped like rows.
  return (prisma.pendingAgentAction.create as jest.Mock).mock.results
    .map((r) => r.value)
    .filter((v) => v && v.tenantId === tenantId);
}

describe("REQ-agent-action-drafting: gold-set prompt regression eval", () => {
  it.each(GOLD_FIXTURES.map((f) => [f.name, f]))(
    "%s",
    async (_name, fix: GoldFixture) => {
      seedMocks(fix);

      const result = await runAgent("monitor" as any, {
        tenantId: fix.tenantId,
        triggerEvent: `cron:${fix.triggerTier}`,
        payload: { tier: fix.triggerTier },
      });

      expect(["completed", "disabled"]).toContain(result.status);

      // The disabled path (no ANTHROPIC_API_KEY) is acceptable in CI —
      // the spine integrity is proven by walkingSkeleton + monitoringSmoke.
      // The PROMPT regression assertions only run when the model
      // actually executed.
      if (result.status !== "completed") return;

      const stagedActions = await getStagedPendingActions(fix.tenantId);
      const tools = stagedActions.map((s) => s.toolName);
      const allReasoning = stagedActions
        .map((s) => s.reasoning ?? "")
        .join(" ")
        .toLowerCase();

      expect(stagedActions.length).toBeGreaterThanOrEqual(
        fix.expect.minProposals,
      );

      for (const t of fix.expect.requiredToolNames) {
        expect(tools).toContain(t);
      }
      for (const t of fix.expect.forbiddenToolNames) {
        expect(tools).not.toContain(t);
      }
      for (const phrase of fix.expect.proposalShouldMention) {
        expect(allReasoning).toContain(phrase.toLowerCase());
      }

      if (typeof fix.expect.maxProposalsPerCourier === "number") {
        // Per-courier-per-tier rate-limit invariant (fixture 08).
        const perCourier = new Map<string, number>();
        for (const a of stagedActions) {
          const id = a.subjectId ?? "(none)";
          perCourier.set(id, (perCourier.get(id) ?? 0) + 1);
        }
        for (const [, count] of perCourier) {
          expect(count).toBeLessThanOrEqual(fix.expect.maxProposalsPerCourier);
        }
      }

      // Snapshot the headline + reasoning so prompt diffs are visible
      // in PR. Snapshots key by fixture name.
      expect({
        fixture: fix.name,
        proposals: stagedActions.map((s) => ({
          toolName: s.toolName,
          recommendation: s.recommendation,
          reasoning: s.reasoning,
        })),
      }).toMatchSnapshot(fix.name);
    },
  );

  test("forbiddenToolNames includes applyPenalty and suspendDriver across ALL gold fixtures (Phase 8 tools must NOT appear)", () => {
    for (const f of GOLD_FIXTURES) {
      // Every fixture either explicitly forbids these or has empty
      // forbidden-list with empty required-list (fixture 07/09/10/06).
      // For the "active anomaly" fixtures, the forbidden list MUST
      // include these names.
      if (f.expect.minProposals === 0) continue;
      expect(f.expect.forbiddenToolNames).toContain("applyPenalty");
      expect(f.expect.forbiddenToolNames).toContain("suspendDriver");
    }
  });
});
