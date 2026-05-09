// Wave 0 RED test — turns GREEN in Wave 2 when backend/src/routes/
// decisions.ts ships POST /api/decisions/:id/approve. Do not skip.
//
// Behavior contract (CON-audit-row-shape + REQ-agent-propose-confirm):
// The approve route must:
//   1. Reject when PendingAgentAction does not exist (404).
//   2. Reject when PendingAgentAction.resolvedAt is already set (409 —
//      idempotency / replay guard).
//   3. Write an AgentAction row with proposer="Darb",
//      approverId=req.user.userId, originalProposal=pa.input.
//   4. For live tools (Phase 2: only draftCourierMessage), re-invoke
//      the registry with ctx.userId set so the approval-gate falls
//      through to .execute().
//   5. For non-live tools (e.g. flagForReview), write the audit-only
//      row WITHOUT triggering the side effect.
//   6. Concurrency: optimistic-lock pattern via prisma.pendingAgentAction
//      .updateMany({where:{id, resolvedAt: null}, data:{resolvedAt, ...}});
//      if updateMany.count !== 1, return 409.
//
// REQ-agent-propose-confirm.

import request from "supertest";
import express from "express";
import { prisma } from "../mocks/config";
import decisionsRouter from "../../routes/decisions";

// Minimal Express app composing the decisions router with a stubbed
// authMiddleware that injects req.user. Mirrors Phase 1 route-test
// pattern (see __tests__/routes/*).
const TENANT = "tenant-A";
const USER = "user-42";
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = {
      userId: USER,
      tenantId: TENANT,
      role: "ADMIN",
    };
    next();
  });
  app.use("/api/decisions", decisionsRouter);
  return app;
}

const PENDING = {
  id: "pa-1",
  tenantId: TENANT,
  runId: "run-1",
  agentId: "monitor",
  toolName: "draftCourierMessage",
  input: {
    driverId: "drv_xy12",
    body: "Hi Mohamed, please clock in on time.",
  },
  recommendation: "approve",
  reasoning: "3 late clock-ins this week.",
  confidence: 0.85,
  priorityScore: 0.7,
  subjectType: "Driver",
  subjectId: "drv_xy12",
  resolvedAt: null,
  resolution: null,
  overrideReason: null,
  createdAt: new Date("2026-05-09T06:31:00Z"),
};

describe("REQ-agent-propose-confirm: POST /api/decisions/:id/approve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.agentAction.create as jest.Mock).mockResolvedValue({
      id: "action-1",
    });
  });

  test("404 when PendingAgentAction does not exist", async () => {
    (prisma.pendingAgentAction as any).findFirst = jest
      .fn()
      .mockResolvedValue(null);
    const app = makeApp();
    const res = await request(app).post("/api/decisions/missing-id/approve");
    expect(res.status).toBe(404);
  });

  test("409 when PendingAgentAction.resolvedAt is already set (idempotency replay guard)", async () => {
    (prisma.pendingAgentAction as any).findFirst = jest.fn().mockResolvedValue({
      ...PENDING,
      resolvedAt: new Date("2026-05-09T06:35:00Z"),
      resolution: "approved",
    });
    const app = makeApp();
    const res = await request(app).post(`/api/decisions/${PENDING.id}/approve`);
    expect(res.status).toBe(409);
  });

  test("writes AgentAction with proposer='Darb', approverId=req.user.userId, originalProposal=pa.input", async () => {
    (prisma.pendingAgentAction as any).findFirst = jest
      .fn()
      .mockResolvedValue(PENDING);
    (prisma.pendingAgentAction as any).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 1 });
    const app = makeApp();
    await request(app).post(`/api/decisions/${PENDING.id}/approve`);

    expect(prisma.agentAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposer: "Darb",
          approverId: USER,
          tenantId: TENANT,
          toolName: "draftCourierMessage",
          originalProposal: PENDING.input,
        }),
      }),
    );
  });

  test("for live tool draftCourierMessage: re-invokes registry with ctx.userId set, asserts InvokeResult.status='executed'", async () => {
    (prisma.pendingAgentAction as any).findFirst = jest
      .fn()
      .mockResolvedValue(PENDING);
    (prisma.pendingAgentAction as any).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 1 });
    // Side-effect import the registry so we can spy on invoke.
    // Wave 2 will wire the route to call toolRegistry.invoke with
    // ctx.userId === req.user.userId.
    const registry = await import("../../agent/registry");
    const spy = jest
      .spyOn(registry.toolRegistry, "invoke")
      .mockResolvedValue({ status: "executed", output: { sent: true } });

    const app = makeApp();
    const res = await request(app).post(`/api/decisions/${PENDING.id}/approve`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      "draftCourierMessage",
      expect.objectContaining({ userId: USER, tenantId: TENANT }),
      PENDING.input,
      expect.any(Object),
    );
    spy.mockRestore();
  });

  test("for non-live tool flagForReview: writes audit-only row, no side effect, asserts no notification.create call", async () => {
    const audit = { ...PENDING, toolName: "flagForReview" };
    (prisma.pendingAgentAction as any).findFirst = jest
      .fn()
      .mockResolvedValue(audit);
    (prisma.pendingAgentAction as any).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 1 });
    const notificationCreate = jest.fn();
    (prisma as any).notification = { create: notificationCreate };

    const app = makeApp();
    const res = await request(app).post(`/api/decisions/${audit.id}/approve`);
    expect(res.status).toBe(200);
    expect(prisma.agentAction.create).toHaveBeenCalled();
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  test("concurrent approve race: 1st returns 200, 2nd returns 409 via optimistic-lock updateMany", async () => {
    // Two simultaneous approve calls on the same PendingAgentAction.
    // The route must use prisma.pendingAgentAction.updateMany with
    // where {id, resolvedAt: null}; the FIRST writer's update succeeds
    // (count=1 → resolvedAt set), the SECOND's where-clause no longer
    // matches (resolvedAt is now non-null) → count=0 → 409.
    (prisma.pendingAgentAction as any).findFirst = jest
      .fn()
      .mockResolvedValue(PENDING);
    let updateCallCount = 0;
    (prisma.pendingAgentAction as any).updateMany = jest
      .fn()
      .mockImplementation(() => {
        updateCallCount += 1;
        if (updateCallCount === 1) return Promise.resolve({ count: 1 });
        return Promise.resolve({ count: 0 });
      });

    const app = makeApp();
    const [first, second] = await Promise.all([
      request(app).post(`/api/decisions/${PENDING.id}/approve`),
      request(app).post(`/api/decisions/${PENDING.id}/approve`),
    ]);

    const statuses = [first.status, second.status].sort();
    // Exactly one 200 and one 409 — order undefined.
    expect(statuses).toEqual([200, 409]);
  });
});
