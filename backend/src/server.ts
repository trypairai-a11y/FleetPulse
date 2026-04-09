import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./config/swagger";

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
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many auth attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/demo" || req.path === "/refresh" || req.path === "/me",
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
    console.log(`Darb backend running on port ${env.PORT}`);
  });
}

export default app;
