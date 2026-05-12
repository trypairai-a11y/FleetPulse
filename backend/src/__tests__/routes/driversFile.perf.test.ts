import request from "supertest";

jest.mock("../../config", () => require("../mocks/config"));
jest.mock("../../middleware/auth", () => require("../mocks/auth"));
jest.mock("../../middleware/tenantScope", () => require("../mocks/tenantScope"));

describe("GET /api/drivers/:id/file — performance budget (RED — Wave 1 + perf gate)", () => {
  const seeded = process.env.FIXTURE_SEEDED === "true";

  (seeded ? it : it.skip)(
    "server-time p50 < 300ms across 5 sequential requests against design-partner-1 fixture",
    async () => {
      if (!seeded) {
        // eslint-disable-next-line no-console
        console.info("set FIXTURE_SEEDED=true after running npm run seed:design-partner-fixture");
      }
      const serverModule = require("../../server");
      const app = serverModule.default || serverModule.app || serverModule;
      const latencies: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        await request(app).get("/api/drivers/dp1-driver-1/file").set("x-tenant-id", "design-partner-1");
        const end = process.hrtime.bigint();
        latencies.push(Number(end - start) / 1_000_000); // → ms
      }
      latencies.sort((a, b) => a - b);
      const p50 = latencies[2];
      expect(p50).toBeLessThan(300);
    }
  );
});
