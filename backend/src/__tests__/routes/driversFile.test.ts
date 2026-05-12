import request from "supertest";

jest.mock("../../config", () => require("../mocks/config"));
jest.mock("../../middleware/auth", () => require("../mocks/auth"));
jest.mock("../../middleware/tenantScope", () => require("../mocks/tenantScope"));

const TENANT = "test-tenant";

describe("GET /api/drivers/:id/file (RED — Wave 1 implements)", () => {
  let app: any;
  let listSnapshotsSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.resetModules();
    const agent = require("../../agent");
    listSnapshotsSpy = jest.spyOn(agent, "listSnapshotsForDriver").mockResolvedValue([]);
    const serverModule = require("../../server");
    app = serverModule.default || serverModule.app || serverModule;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 10 top-level keys: profile, liveStatus, score, scoreExplanation, snapshots90d, attendance, cash, violations, agentNotes, decisionAuditLog", async () => {
    const res = await request(app)
      .get("/api/drivers/d1/file")
      .set("x-tenant-id", TENANT);
    expect(res.status).toBe(200);
    const keys = Object.keys(res.body);
    [
      "profile", "liveStatus", "score", "scoreExplanation",
      "snapshots90d", "attendance", "cash", "violations",
      "agentNotes", "decisionAuditLog"
    ].forEach(k => expect(keys).toContain(k));
  });

  it("snapshots90d is sourced from listSnapshotsForDriver, NOT recomputed from AiScore on every request", async () => {
    await request(app).get("/api/drivers/d1/file").set("x-tenant-id", TENANT);
    expect(listSnapshotsSpy).toHaveBeenCalledTimes(1);
  });

  it("decisionAuditLog.approved filters AgentAction by subjectType='Driver' AND subjectId=driverId AND tenantId=ctx.tenantId", async () => {
    const { prisma } = require("../mocks/config");
    const spy = jest.spyOn(prisma.agentAction, "findMany");
    await request(app).get("/api/drivers/d1/file").set("x-tenant-id", TENANT);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: TENANT,
        subjectType: "Driver",
        subjectId: "d1",
      }),
    }));
  });

  it("decisionAuditLog.pending filters PendingAgentAction with createdAt >= now-30d", async () => {
    const { prisma } = require("../mocks/config");
    const spy = jest.spyOn(prisma.pendingAgentAction, "findMany");
    await request(app).get("/api/drivers/d1/file").set("x-tenant-id", TENANT);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        subjectType: "Driver",
        subjectId: "d1",
        createdAt: expect.objectContaining({ gte: expect.any(Date) }),
      }),
    }));
  });

  it("agentNotes is sourced from listMemoriesByPrefix(tenantId, 'note:driver:<id>:')", async () => {
    const agent = require("../../agent");
    const spy = jest.spyOn(agent, "listMemoriesByPrefix").mockResolvedValue([]);
    await request(app).get("/api/drivers/d1/file").set("x-tenant-id", TENANT);
    expect(spy).toHaveBeenCalledWith(TENANT, "note:driver:d1:", expect.any(Number));
  });

  it("when latestScore is null the response includes scoreExplanation: { text: 'Score not yet available.', cached: false }", async () => {
    const res = await request(app).get("/api/drivers/d1/file").set("x-tenant-id", TENANT);
    expect(res.body.scoreExplanation).toEqual({ text: "Score not yet available.", cached: false });
  });

  (process.env.FIXTURE_SEEDED === "true" ? it : it.skip)(
    "returns 200 with a populated 10-key body for a known seeded driver under FIXTURE_SEEDED=true",
    async () => {
      const res = await request(app).get("/api/drivers/dp1-driver-1/file").set("x-tenant-id", TENANT);
      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
    }
  );

  it("returns 404 with body { error: 'Driver not found' } when no driver matches (id, tenantId)", async () => {
    const res = await request(app).get("/api/drivers/nonexistent/file").set("x-tenant-id", TENANT);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Driver not found" });
  });
});
