import { z } from "zod";
import { prisma } from "../../../config";
import { publishEvent } from "../../eventBus";
import { defineTool, toolRegistry } from "../toolRegistry";

/**
 * Triage Agent tools. Read tools return compact JSON suitable for Claude's
 * context (no heavy joins). Write tools are gated by `requiresApproval: true`
 * by default — the runtime enqueues a PendingAgentAction row for a human to
 * approve unless auto-execute criteria are met.
 */

// ─── Read tools ──────────────────────────────────────────────────────────────

const queryOpenAppeals = defineTool({
  name: "queryOpenAppeals",
  description:
    "List appeals with status PENDING. Returns appeal ID, violation ID, driver name + platform, appeal level, channel, reason (truncated), and appealedAt timestamp.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: { type: "number", description: "Max results (default 20, max 50)" },
    },
    required: [],
  },
  inputValidator: z.object({ limit: z.number().int().min(1).max(50).optional() }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["triage", "chat"],
  async execute(ctx, input) {
    const limit = Math.min(input.limit ?? 20, 50);
    const appeals = await prisma.appeal.findMany({
      where: { tenantId: ctx.tenantId, appealStatus: "PENDING" },
      include: {
        violation: {
          select: {
            id: true,
            violationType: true,
            platform: true,
            violationTime: true,
            driver: { select: { id: true, name: true, platform: true } },
          },
        },
      },
      orderBy: { appealedAt: "asc" },
      take: limit,
    });
    return appeals.map((a) => ({
      appealId: a.id,
      appealLevel: a.appealLevel,
      channel: a.channel,
      reason: (a.reason ?? "").slice(0, 300),
      appealedAt: a.appealedAt.toISOString(),
      violationId: a.violation.id,
      violationType: a.violation.violationType,
      platform: a.violation.platform,
      violationTime: a.violation.violationTime.toISOString(),
      driverId: a.violation.driver?.id ?? null,
      driverName: a.violation.driver?.name ?? null,
    }));
  },
});

const queryOpenViolations = defineTool({
  name: "queryOpenViolations",
  description:
    "List violations with status ESTABLISHED. Returns violation ID, type, platform, driver, time, and a short details snippet.",
  inputSchema: {
    type: "object" as const,
    properties: {
      platform: { type: "string", enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"] },
      violationType: { type: "string" },
      limit: { type: "number" },
    },
    required: [],
  },
  inputValidator: z.object({
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"]).optional(),
    violationType: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["triage", "chat"],
  async execute(ctx, input) {
    const limit = Math.min(input.limit ?? 20, 50);
    const violations = await prisma.violation.findMany({
      where: {
        tenantId: ctx.tenantId,
        violationStatus: "ESTABLISHED",
        ...(input.platform ? { platform: input.platform as any } : {}),
        ...(input.violationType ? { violationType: input.violationType as any } : {}),
      },
      include: { driver: { select: { id: true, name: true, platform: true } } },
      orderBy: { violationTime: "desc" },
      take: limit,
    });
    return violations.map((v) => ({
      violationId: v.id,
      type: v.violationType,
      platform: v.platform,
      violationTime: v.violationTime.toISOString(),
      details: (v.details ?? "").slice(0, 200),
      driverId: v.driver?.id ?? null,
      driverName: v.driver?.name ?? null,
      appealStatus: v.appealStatus,
    }));
  },
});

const queryCashMismatches = defineTool({
  name: "queryCashMismatches",
  description:
    "List CashRecord rows where salesAmount != collectionAmount + pendingDues. Each row includes driver, date, amounts in KD (3 decimals), and the gap.",
  inputSchema: {
    type: "object" as const,
    properties: {
      daysBack: { type: "number", description: "How many days back to search (default 7, max 30)" },
      limit: { type: "number" },
    },
    required: [],
  },
  inputValidator: z.object({
    daysBack: z.number().int().min(1).max(30).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"],
  requiresApproval: false,
  allowedAgents: ["triage", "reconciliation", "chat"],
  async execute(ctx, input) {
    const daysBack = input.daysBack ?? 7;
    const limit = Math.min(input.limit ?? 30, 100);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - daysBack);

    const records = await prisma.cashRecord.findMany({
      where: { tenantId: ctx.tenantId, date: { gte: since } },
      include: { driver: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: 500,
    });
    const mismatches = records
      .map((r) => {
        const sales = Number(r.salesAmount);
        const collected = Number(r.collectionAmount);
        const pending = Number(r.pendingDues);
        const gap = +(sales - collected - pending).toFixed(3);
        return { record: r, gap };
      })
      .filter((m) => Math.abs(m.gap) >= 0.001)
      .slice(0, limit)
      .map(({ record, gap }) => ({
        cashRecordId: record.id,
        driverId: record.driver.id,
        driverName: record.driver.name,
        date: record.date.toISOString(),
        sales: Number(record.salesAmount).toFixed(3),
        collected: Number(record.collectionAmount).toFixed(3),
        pending: Number(record.pendingDues).toFixed(3),
        gapKd: gap.toFixed(3),
        status: record.status,
      }));
    return mismatches;
  },
});

const getDriverHistory = defineTool({
  name: "getDriverHistory",
  description:
    "Get a driver's recent performance: violation count by type, appeal outcomes, latest score + trend. Use when ranking an item that depends on whether the driver is a repeat offender.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string" },
      windowDays: { type: "number", description: "Days of history (default 30, max 90)" },
    },
    required: ["driverId"],
  },
  inputValidator: z.object({
    driverId: z.string(),
    windowDays: z.number().int().min(1).max(90).optional(),
  }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["triage", "reconciliation", "narrator", "chat"],
  async execute(ctx, input) {
    const windowDays = input.windowDays ?? 30;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - windowDays);

    const [driver, violations, appeals, latestScore] = await Promise.all([
      prisma.driver.findFirst({
        where: { id: input.driverId, tenantId: ctx.tenantId },
        select: { id: true, name: true, platform: true, status: true },
      }),
      prisma.violation.groupBy({
        by: ["violationType", "violationStatus"],
        where: { driverId: input.driverId, tenantId: ctx.tenantId, violationTime: { gte: since } },
        _count: { _all: true },
      }),
      prisma.appeal.groupBy({
        by: ["appealStatus"],
        where: { tenantId: ctx.tenantId, violation: { driverId: input.driverId }, appealedAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.aiScore.findFirst({
        where: { driverId: input.driverId, tenantId: ctx.tenantId },
        orderBy: { date: "desc" },
        select: { compositeScore: true, trend: true, date: true },
      }),
    ]);

    if (!driver) return { error: "Driver not found" };
    return {
      driver,
      windowDays,
      violationBreakdown: violations.map((v) => ({
        type: v.violationType,
        status: v.violationStatus,
        count: v._count._all,
      })),
      appealBreakdown: appeals.map((a) => ({ status: a.appealStatus, count: a._count._all })),
      latestScore: latestScore
        ? {
            composite: latestScore.compositeScore,
            trend: latestScore.trend,
            date: latestScore.date.toISOString(),
          }
        : null,
    };
  },
});

const queryStaleAlerts = defineTool({
  name: "queryStaleAlerts",
  description:
    "List active alerts older than N hours. Useful for ranking issues that have been festering.",
  inputSchema: {
    type: "object" as const,
    properties: {
      olderThanHours: { type: "number", description: "Default 24" },
      limit: { type: "number" },
    },
    required: [],
  },
  inputValidator: z.object({
    olderThanHours: z.number().int().min(1).max(168).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["triage", "narrator", "chat"],
  async execute(ctx, input) {
    const olderThanHours = input.olderThanHours ?? 24;
    const limit = Math.min(input.limit ?? 20, 50);
    const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
    const alerts = await prisma.alert.findMany({
      where: { tenantId: ctx.tenantId, status: "ACTIVE", createdAt: { lte: cutoff } },
      include: { driver: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return alerts.map((a) => ({
      alertId: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: (a.message ?? "").slice(0, 200),
      driverId: a.driver?.id ?? null,
      driverName: a.driver?.name ?? null,
      ageHours: Math.round((Date.now() - a.createdAt.getTime()) / 3600_000),
      createdAt: a.createdAt.toISOString(),
    }));
  },
});

// ─── Write tools ─────────────────────────────────────────────────────────────

const proposeAppealDecision = defineTool({
  name: "proposeAppealDecision",
  description:
    "Recommend a decision on an appeal. Defaults to human approval. Include a data-grounded reasoning sentence and confidence 0.0–1.0.",
  inputSchema: {
    type: "object" as const,
    properties: {
      appealId: { type: "string" },
      decision: { type: "string", enum: ["approve", "reject", "escalate"] },
      reasoning: { type: "string" },
      confidence: { type: "number" },
      priorityScore: { type: "number", description: "0.0–1.0 urgency" },
    },
    required: ["appealId", "decision", "reasoning", "confidence"],
  },
  inputValidator: z.object({
    appealId: z.string(),
    decision: z.enum(["approve", "reject", "escalate"]),
    reasoning: z.string().min(5),
    confidence: z.number().min(0).max(1),
    priorityScore: z.number().min(0).max(1).optional(),
  }),
  sideEffect: "write",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: true,
  allowedAgents: ["triage"],
  async execute(ctx, input) {
    // Only reached when a human approves the pending action.
    const appeal = await prisma.appeal.findFirst({
      where: { id: input.appealId, tenantId: ctx.tenantId },
      include: { violation: true },
    });
    if (!appeal) return { error: "Appeal not found" };

    const newStatus =
      input.decision === "approve" ? "APPROVED" : input.decision === "reject" ? "REJECTED" : "PENDING";

    await prisma.appeal.update({
      where: { id: appeal.id },
      data: {
        appealStatus: newStatus as any,
        reviewedAt: new Date(),
        reviewedBy: ctx.userId,
        rejectionNote: input.decision === "reject" ? input.reasoning : null,
      },
    });

    if (input.decision === "approve") {
      // Overturn the violation
      await prisma.violation.update({
        where: { id: appeal.violationId },
        data: { violationStatus: "OVERTURNED", appealStatus: "APPROVED" as any },
      });
    } else if (input.decision === "reject") {
      await prisma.violation.update({
        where: { id: appeal.violationId },
        data: { appealStatus: "REJECTED" as any },
      });
    }

    return { ok: true, appealId: appeal.id, newStatus };
  },
});

const snoozeAlert = defineTool({
  name: "snoozeAlert",
  description:
    "Acknowledge an alert and mark it handled. Use for low-value stale alerts the Triage Agent judges safe to clear (e.g. a self-resolved GPS gap). Auto-execute allowed for LOW severity.",
  inputSchema: {
    type: "object" as const,
    properties: {
      alertId: { type: "string" },
      notes: { type: "string" },
    },
    required: ["alertId"],
  },
  inputValidator: z.object({ alertId: z.string(), notes: z.string().optional() }),
  sideEffect: "write",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: true,
  allowedAgents: ["triage"],
  async execute(ctx, input) {
    const alert = await prisma.alert.findFirst({
      where: { id: input.alertId, tenantId: ctx.tenantId },
    });
    if (!alert) return { error: "Alert not found" };
    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedById: ctx.userId,
        acknowledgedAt: new Date(),
      },
    });
    return { ok: true, alertId: alert.id };
  },
});

const proposeCoachingMessage = defineTool({
  name: "proposeCoachingMessage",
  description:
    "Propose a coaching message for a driver (e.g. 'You have 3 late-delivery violations this week; most are in Salmiya 18:00-20:00 — consider leaving earlier'). Sends as Notification after human approval.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
    },
    required: ["driverId", "title", "body"],
  },
  inputValidator: z.object({
    driverId: z.string(),
    title: z.string().min(3).max(120),
    body: z.string().min(10).max(1000),
  }),
  sideEffect: "write",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: true,
  allowedAgents: ["triage"],
  async execute(ctx, input) {
    const driver = await prisma.driver.findFirst({
      where: { id: input.driverId, tenantId: ctx.tenantId },
    });
    if (!driver) return { error: "Driver not found" };
    const notification = await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        type: "AGENT_RECOMMENDATION_COACHING",
        category: "OPS_TODO",
        title: input.title,
        message: input.body,
        severity: "MEDIUM",
        sourceId: driver.id,
        metadata: { driverId: driver.id, recommendedBy: "triage-agent", runId: ctx.runId },
      },
    });
    await publishEvent({
      type: "notification",
      tenantId: ctx.tenantId,
      timestamp: new Date().toISOString(),
      payload: { notificationId: notification.id, driverId: driver.id },
    });
    return { ok: true, notificationId: notification.id };
  },
});

// ─── Register all ────────────────────────────────────────────────────────────

export function registerTriageTools() {
  toolRegistry.register(queryOpenAppeals);
  toolRegistry.register(queryOpenViolations);
  toolRegistry.register(queryCashMismatches);
  toolRegistry.register(getDriverHistory);
  toolRegistry.register(queryStaleAlerts);
  toolRegistry.register(proposeAppealDecision);
  toolRegistry.register(snoozeAlert);
  toolRegistry.register(proposeCoachingMessage);
}
