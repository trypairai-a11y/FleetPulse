// Wave 0 RED test — turns GREEN in Wave 4 when
// backend/src/routes/admin/onboarding.ts ships GET
// /backwash-status?jobId=. Do not skip.
//
// Behavior contract (REQ-gtm-onboarding step 4):
// GET /api/admin/onboarding/tenants/:tid/backwash-status?jobId=X
// returns:
//   { state: "active"|"completed"|"failed",
//     progress: { step, totalSteps, message } }

import request from "supertest";
import express from "express";
import onboardingRouter from "../../routes/admin/onboarding";

const SUPER_USER = "super-1";
const TENANT = "t-onb-1";
const JOB_ID = "job-42";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = {
      userId: SUPER_USER,
      isSuperAdmin: true,
      role: "ADMIN",
    };
    next();
  });
  app.use("/api/admin/onboarding", onboardingRouter);
  return app;
}

// Mock the BullMQ job lookup the route uses.
jest.mock("../../queues/onboardingBackwashWorker", () => ({
  __esModule: true,
  getBackwashJob: jest.fn().mockResolvedValue({
    id: "job-42",
    state: "active",
    progress: {
      step: 4,
      totalSteps: 12,
      message: "Pulling KEETA orders 2026-04-15..2026-04-20",
    },
  }),
  runBackwashJob: jest.fn(),
}));

describe("REQ-gtm-onboarding: backwash status polling", () => {
  test("GET /api/admin/onboarding/tenants/:tid/backwash-status?jobId=X returns {state, progress:{step, totalSteps, message}}", async () => {
    const app = makeApp();
    const res = await request(app).get(
      `/api/admin/onboarding/tenants/${TENANT}/backwash-status?jobId=${JOB_ID}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        state: expect.any(String),
        progress: expect.objectContaining({
          step: expect.any(Number),
          totalSteps: expect.any(Number),
          message: expect.any(String),
        }),
      }),
    );
  });
});
