// Phase 2 Wave 4 — admin router aggregator.
// Mounted at /api/admin in server.ts. All sub-routers themselves apply
// authMiddleware + requireSuperAdmin (NOT tenantScope; admin handlers
// extract tenantId from req.params explicitly).

import { Router } from "express";
import onboardingRouter from "./onboarding";
import billingRouter from "./billing";

const adminRouter = Router();
adminRouter.use("/onboarding", onboardingRouter);
adminRouter.use("/billing", billingRouter);

export default adminRouter;
