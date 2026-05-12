// Phase 3 Wave 0 RED → Wave 1 GREEN. REQ-driver-file.
import request from "supertest";
import express from "express";
import { prisma } from "../mocks/config";

const TENANT = "tenant-A";
const USER = "user-42";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { userId: USER, tenantId: TENANT, role: "ADMIN" };
    next();
  });
  // Mount AFTER req.user middleware so authMiddleware shortcut (no-op in tests) is satisfied.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const driversRouter = require("../../routes/drivers").default;
  app.use("/api/drivers", driversRouter);
  return app;
}

const DRIVER = {
  id: "drv-1",
  name: "Mohamed Khaled",
  photoUrl: null,
  status: "ACTIVE",
  platform: "KEETA",
  platformDriverId: "K-123",
  phone: "+96599887766",
  vehicleType: "MOTORCYCLE",
  civilIdStatus: "VALID",
};

function stubPrismaForExistingDriver() {
  const p = prisma as any;
  p.driver.findFirst = jest.fn().mockResolvedValue(DRIVER);
  p.aiScore = p.aiScore || {};
  p.aiScore.findFirst = jest.fn().mockResolvedValue(null);
  p.attendanceRecord.findMany = jest.fn().mockResolvedValue([]);
  p.cashRecord.findMany = jest.fn().mockResolvedValue([]);
  p.cashRecord.aggregate = jest.fn().mockResolvedValue({ _sum: { pendingDues: 0 } });
  p.violation = p.violation || {};
  p.violation.findMany = jest.fn().mockResolvedValue([]);
  p.courierOnlineSession = p.courierOnlineSession || {};
  p.courierOnlineSession.findFirst = jest.fn().mockResolvedValue(null);
  p.agentAction.findMany = jest.fn().mockResolvedValue([]);
  p.pendingAgentAction.findMany = jest.fn().mockResolvedValue([]);
  p.agentMemory.findMany = jest.fn().mockResolvedValue([]);
}

describe("GET /api/drivers/:id/file (Wave 1 GREEN)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 10 top-level keys: profile, liveStatus, score, scoreExplanation, snapshots90d, attendance, cash, violations, agentNotes, decisionAuditLog", async () => {
    stubPrismaForExistingDriver();
    const res = await request(makeApp()).get("/api/drivers/drv-1/file");
    expect(res.status).toBe(200);
    const keys = Object.keys(res.body);
    [
      "profile", "liveStatus", "score", "scoreExplanation",
      "snapshots90d", "attendance", "cash", "violations",
      "agentNotes", "decisionAuditLog"
    ].forEach((k) => expect(keys).toContain(k));
  });

  it("snapshots90d returns an array (sourced from listSnapshotsForDriver via the agent module)", async () => {
    stubPrismaForExistingDriver();
    const res = await request(makeApp()).get("/api/drivers/drv-1/file");
    expect(Array.isArray(res.body.snapshots90d)).toBe(true);
  });

  it("decisionAuditLog.approved is queried with subjectType='Driver' AND subjectId=driverId AND tenantId=ctx.tenantId", async () => {
    stubPrismaForExistingDriver();
    await request(makeApp()).get("/api/drivers/drv-1/file");
    expect((prisma as any).agentAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          subjectType: "Driver",
          subjectId: "drv-1",
        }),
      }),
    );
  });

  it("decisionAuditLog.pending filters PendingAgentAction with createdAt >= now-30d", async () => {
    stubPrismaForExistingDriver();
    await request(makeApp()).get("/api/drivers/drv-1/file");
    expect((prisma as any).pendingAgentAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subjectType: "Driver",
          subjectId: "drv-1",
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  it("agentNotes.observations is sourced from AgentMemory with key prefix 'note:driver:<id>:'", async () => {
    stubPrismaForExistingDriver();
    await request(makeApp()).get("/api/drivers/drv-1/file");
    expect((prisma as any).agentMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          key: expect.objectContaining({ startsWith: "note:driver:drv-1:" }),
        }),
      }),
    );
  });

  it("when latestScore is null the response includes scoreExplanation: { text: 'Score not yet available.', cached: false }", async () => {
    stubPrismaForExistingDriver();
    const res = await request(makeApp()).get("/api/drivers/drv-1/file");
    expect(res.body.scoreExplanation).toEqual({ text: "Score not yet available.", cached: false });
  });

  it("returns 404 with body { error: 'Driver not found' } when no driver matches (id, tenantId)", async () => {
    (prisma as any).driver.findFirst = jest.fn().mockResolvedValue(null);
    const res = await request(makeApp()).get("/api/drivers/nonexistent/file");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Driver not found" });
  });
});
