/**
 * Wave 0 RED test — turns GREEN in Wave 2 when
 * backend/src/middleware/agentRateLimit.ts ships agentLocationRateLimit
 * (200 reqs / 5 min, keyed by deviceId).
 */

import express from "express";
import request from "supertest";

// Importing before Wave 2 → MODULE_NOT_FOUND → RED.
const { agentLocationRateLimit } = require("../../middleware/agentRateLimit");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(agentLocationRateLimit);
  app.post("/x", (_req, res) => res.json({ ok: true }));
  return app;
}

describe("agentLocationRateLimit — Wave 0 RED scaffolding", () => {
  test("permits 200 in 5min, blocks 201st", async () => {
    const app = makeApp();
    for (let i = 0; i < 200; i++) {
      const r = await request(app).post("/x").send({ deviceId: "dev1" });
      expect(r.status).toBe(200);
    }
    const blocked = await request(app).post("/x").send({ deviceId: "dev1" });
    expect(blocked.status).toBe(429);
  }, 30000);

  test("keyGenerator scopes by deviceId — different deviceIds have independent buckets", async () => {
    const app = makeApp();
    for (let i = 0; i < 200; i++) {
      await request(app).post("/x").send({ deviceId: "dev2" });
    }
    const r = await request(app).post("/x").send({ deviceId: "dev3" });
    expect(r.status).toBe(200);
  }, 30000);
});
