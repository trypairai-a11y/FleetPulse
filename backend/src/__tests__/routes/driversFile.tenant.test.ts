// Phase 3 Wave 0 → Wave 1 GREEN. Pitfall 4 / T-03-01.
import request from "supertest";
import express from "express";
import { prisma } from "../mocks/config";

function makeApp(tenantId: string) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { userId: "u1", tenantId, role: "ADMIN" };
    next();
  });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const driversRouter = require("../../routes/drivers").default;
  app.use("/api/drivers", driversRouter);
  return app;
}

describe("GET /api/drivers/:id/file — cross-tenant isolation (Wave 1 GREEN)", () => {
  it("returns 404 (not 403, not 200) when tenant A requests a driver that exists only in tenant B (cross_tenant)", async () => {
    // findFirst is tenant-scoped — returns null when tenantId mismatch.
    (prisma as any).driver.findFirst = jest.fn().mockImplementation((args: any) => {
      if (args?.where?.tenantId === "tenant-a") return Promise.resolve(null);
      return Promise.resolve({ id: "drv-b", tenantId: "tenant-b", name: "Other" });
    });
    const res = await request(makeApp("tenant-a")).get("/api/drivers/drv-b/file");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Driver not found" });
  });
});
