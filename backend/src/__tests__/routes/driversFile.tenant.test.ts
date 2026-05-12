import request from "supertest";

jest.mock("../../config", () => require("../mocks/config"));
jest.mock("../../middleware/auth", () => require("../mocks/auth"));
jest.mock("../../middleware/tenantScope", () => require("../mocks/tenantScope"));

describe("GET /api/drivers/:id/file — cross-tenant isolation (RED — Wave 1)", () => {
  let app: any;
  beforeEach(() => {
    jest.resetModules();
    const serverModule = require("../../server");
    app = serverModule.default || serverModule.app || serverModule;
  });

  it("returns 404 (not 403, not 200) when tenant A user requests a driver that exists only in tenant B (cross_tenant)", async () => {
    const { prisma } = require("../mocks/config");
    // Driver belongs to tenant B; request comes from tenant A — must 404, never 200/403
    jest.spyOn(prisma.driver, "findFirst").mockImplementation((args: any) => {
      if (args?.where?.tenantId === "tenant-a") return Promise.resolve(null);
      return Promise.resolve({ id: "drv-b", tenantId: "tenant-b" });
    });
    const res = await request(app).get("/api/drivers/drv-b/file").set("x-tenant-id", "tenant-a");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Driver not found" });
  });
});
