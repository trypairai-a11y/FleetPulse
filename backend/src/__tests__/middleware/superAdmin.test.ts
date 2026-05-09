// Wave 0 RED test — turns GREEN in Wave 4 when
// backend/src/middleware/superAdmin.ts ships requireSuperAdmin. Do not
// skip.
//
// Behavior contract:
//   - User.isSuperAdmin === false  → 403
//   - User.isSuperAdmin === true   → next()
//   - no req.user                  → 401 (auth precondition)
//
// The middleware must be composed AFTER authMiddleware so req.user is
// populated. (V4 Access Control — see 02-RESEARCH.md §Security Domain.)

import express from "express";
import request from "supertest";
import { requireSuperAdmin } from "../../middleware/superAdmin";

function makeApp(injectUser?: { isSuperAdmin: boolean; userId?: string }) {
  const app = express();
  app.use(express.json());
  if (injectUser) {
    app.use((req: any, _res, next) => {
      req.user = injectUser;
      next();
    });
  }
  app.get("/admin/test", requireSuperAdmin, (_req, res) => res.json({ ok: true }));
  return app;
}

describe("admin route gate: requireSuperAdmin", () => {
  test("User.isSuperAdmin=false → 403", async () => {
    const app = makeApp({ isSuperAdmin: false, userId: "u-1" });
    const res = await request(app).get("/admin/test");
    expect(res.status).toBe(403);
  });

  test("User.isSuperAdmin=true → next() called (200 ok)", async () => {
    const app = makeApp({ isSuperAdmin: true, userId: "super-1" });
    const res = await request(app).get("/admin/test");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("no req.user → 401 (auth precondition)", async () => {
    const app = makeApp(); // no injection
    const res = await request(app).get("/admin/test");
    expect(res.status).toBe(401);
  });
});
