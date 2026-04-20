import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { initSentry } from "./config/sentry";
import { errorHandler } from "./middleware/errorHandler";
import { requestId } from "./middleware/requestId";
import { swaggerSpec } from "./config/swagger";

initSentry();

import authRoutes from "./routes/auth";
import driverRoutes from "./routes/drivers";
import companyRoutes from "./routes/companies";
import vehicleRoutes from "./routes/vehicles";
import shiftRoutes from "./routes/shifts";
import orderRoutes from "./routes/orders";
import cashRoutes from "./routes/cash";
import deviceRoutes from "./routes/devices";
import alertRoutes from "./routes/alerts";
import recruitmentRoutes from "./routes/recruitment";
import ticketRoutes from "./routes/tickets";
import attendanceRoutes from "./routes/attendance";
import leaveRequestRoutes from "./routes/leaveRequests";
import agentRoutes from "./routes/agent";
import aiRoutes from "./routes/ai";
import talabatRoutes from "./routes/talabat";
import americanaRoutes from "./routes/americana";
import keetaRoutes from "./routes/keeta";
import analyticsRoutes from "./routes/analytics";
import userRoutes from "./routes/users";
import deliverooRoutes from "./routes/deliveroo";
import kpiRoutes from "./routes/kpis";
import platformSettingsRoutes from "./routes/platformSettings";
import platformOverviewRoutes from "./routes/platformOverview";
import notificationRoutes from "./routes/notifications";
import driverRestrictionRoutes from "./routes/driverRestrictions";
import insightsRoutes from "./routes/insights";
import supervisorRoutes from "./routes/supervisors";
import dashboardRoutes from "./routes/dashboard";
import eventRoutes from "./routes/events";
import violationRoutes from "./routes/violations";
import penaltyRoutes from "./routes/penalties";
import keetaMonitorRoutes from "./routes/keetaMonitor";
import orderFlowRoutes from "./routes/orderFlow";
import aiInsightsRoutes from "./routes/aiInsights";
import keetaOperationCentreRoutes from "./routes/keetaOperationCentre";
import keetaCourierDetailsRoutes from "./routes/keetaCourierDetails";
import keetaShiftMonitorRoutes from "./routes/keetaShiftMonitor";
import keetaAvailableShiftsRoutes, { createAvailableShiftsRouter } from "./routes/keetaAvailableShifts";
import keetaReportsRoutes from "./routes/keetaReports";
import incentivesRoutes from "./routes/incentives";
import financialRoutes from "./routes/financial";
import queueRoutes from "./routes/queue";
import v2Routes from "./routes/v2";
import { startAnomalyScheduler } from "./services/anomalyScheduler";
import { startGpsMonitorScheduler } from "./services/gpsMonitorService";
import { startKeetaPortalScraperScheduler } from "./queues/keetaPortalScraperWorker";
import { startInsightsScheduler } from "./services/insightsScheduler";
import { startShiftComplianceScheduler } from "./queues/shiftComplianceWorker";
import "./services/agents"; // registers agents as a side-effect
import { startAgentScheduler } from "./services/agents/agentScheduler";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3003",
  "http://localhost:3006",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ requestId: (req as any).id }),
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    // Quiet health checks — they're polled every few seconds
    autoLogging: { ignore: (req) => req.url === "/api/health" || req.url === "/" },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rate limiting
// NOTE: uses in-memory store — broken across Vercel cold starts. Install
// `rate-limit-redis` and pass `store: new RedisStore({ sendCommand: ... })`
// to make this durable. /auth/demo and /auth/refresh are included (were skipped).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 20 : 500,
  message: { error: "Too many auth attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/me",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/recruitment", recruitmentRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/talabat", talabatRoutes);
app.use("/api/americana", americanaRoutes);
app.use("/api/keeta", keetaRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/deliveroo", deliverooRoutes);
app.use("/api/kpi", kpiRoutes);
app.use("/api/platform-settings", platformSettingsRoutes);
app.use("/api/platform-overview", platformOverviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/driver-restrictions", driverRestrictionRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/penalties", penaltyRoutes);
app.use("/api/keeta/monitor", keetaMonitorRoutes);
app.use("/api/order-flow", orderFlowRoutes);
app.use("/api/ai-insights", aiInsightsRoutes);
app.use("/api/keeta/operation-centre", keetaOperationCentreRoutes);
app.use("/api/keeta/courier-details", keetaCourierDetailsRoutes);
app.use("/api/keeta/shift-monitor", keetaShiftMonitorRoutes);
app.use("/api/keeta/available-shifts", keetaAvailableShiftsRoutes);
app.use("/api/talabat/available-shifts", createAvailableShiftsRouter("TALABAT"));
app.use("/api/keeta/reports", keetaReportsRoutes);
app.use("/api/incentives", incentivesRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/v2", v2Routes);

// API Documentation (Swagger UI — available at /api-docs)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Darb API Docs",
  swaggerOptions: { persistAuthorization: true },
}));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// Root & health check
app.get("/", (_req, res) => {
  res.json({ name: "Darb API", status: "ok", timestamp: new Date().toISOString(), docs: "/api-docs" });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

if (process.env.VERCEL !== "1") {
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Darb backend running");
    startAnomalyScheduler();
    startGpsMonitorScheduler();
    startKeetaPortalScraperScheduler();
    startInsightsScheduler();
    startShiftComplianceScheduler();
    // v2 agent runtime — no-op when ANTHROPIC_API_KEY is unset
    void startAgentScheduler();
  });
}

export default app;
