// Wave 0 RED test — turns GREEN in Wave 2 when backend/src/routes/
// decisions.ts ships POST /api/decisions/:id/dismiss. Do not skip.
//
// Behavior contract:
//   1. Writes AgentMemory with key=`dismissed:${toolName}:${subjectType}:${subjectId}`
//      and value{reason, dismissedBy, dismissedAt, originalProposal,
//      pendingActionId}.
//   2. Updates the PendingAgentAction row: resolvedAt=now,
//      resolution="rejected", overrideReason=reason.
//   3. Returns 400 when reason is missing or empty string.
//
// REQ-agent-propose-confirm.

import request from "supertest";
import express from "express";
import { prisma } from "../mocks/config";
import decisionsRouter from "../../routes/decisions";

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

describe("REQ-agent-propose-confirm: POST /api/decisions/:id/dismiss", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.pendingAgentAction as any).findFirst = jest
      .fn()
      .mockResolvedValue(PENDING);
    (prisma.pendingAgentAction as any).updateMany = jest
      .fn()
      .mockResolvedValue({ count: 1 });
    (prisma.agentMemory.create as jest.Mock).mockResolvedValue({
      id: "mem-1",
    });
  });

  test("writes AgentMemory with key='dismissed:${toolName}:${subjectType}:${subjectId}' carrying reason metadata", async () => {
    const app = makeApp();
    const res = await request(app)
      .post(`/api/decisions/${PENDING.id}/dismiss`)
      .send({ reason: "phone repair, told dispatcher" });

    expect(res.status).toBe(200);
    expect(prisma.agentMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT,
          key: "dismissed:draftCourierMessage:Driver:drv_xy12",
          value: expect.objectContaining({
            reason: "phone repair, told dispatcher",
            dismissedBy: USER,
            originalProposal: PENDING.input,
            pendingActionId: PENDING.id,
          }),
        }),
      }),
    );
  });

  test("updates PendingAgentAction.resolvedAt + resolution='rejected' + overrideReason=reason", async () => {
    const app = makeApp();
    await request(app)
      .post(`/api/decisions/${PENDING.id}/dismiss`)
      .send({ reason: "false positive" });

    expect((prisma.pendingAgentAction as any).updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: PENDING.id,
          resolvedAt: null,
        }),
        data: expect.objectContaining({
          resolution: "rejected",
          overrideReason: "false positive",
        }),
      }),
    );
  });

  test("400 when reason is missing or empty string", async () => {
    const app = makeApp();
    const noReason = await request(app)
      .post(`/api/decisions/${PENDING.id}/dismiss`)
      .send({});
    expect(noReason.status).toBe(400);

    const empty = await request(app)
      .post(`/api/decisions/${PENDING.id}/dismiss`)
      .send({ reason: "" });
    expect(empty.status).toBe(400);
  });
});
