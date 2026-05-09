import { z } from "zod";
import { prisma } from "../../../config";
import { publishEvent } from "../../../services/eventBus";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Narrator Agent tools. Read: cluster alerts/violations/coverage. Write:
 * publishBriefing (SSE-only; persists as AiDigest with type="narrator_briefing"
 * for 48h historical lookback).
 */

const queryAlertsGrouped = defineTool({
  name: "queryAlertsGrouped",
  description:
    "Count active alerts grouped by a dimension (type or severity). Returns rows ordered by descending count. Use for the Narrator Agent's hourly briefing to surface the top alert categories (e.g. 'GPS_GAP=8, LATE_SHIFT=3, CASH_GAP=2') without iterating every alert row. Default lookback 4 hours, max 72. Default dimension 'type'. Tenant-scoped, read-only.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dimension: { type: "string", enum: ["type", "severity"] },
      sinceHours: { type: "number", description: "Default 4" },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({
    dimension: z.enum(["type", "severity"]).optional(),
    sinceHours: z.number().int().min(1).max(72).optional(),
  }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["narrator", "triage", "chat"],
  async execute(ctx, input) {
    const since = new Date(Date.now() - (input.sinceHours ?? 4) * 3600_000);
    const dim = input.dimension ?? "type";
    const rows = await prisma.alert.groupBy({
      by: [dim],
      where: { tenantId: ctx.tenantId, status: "ACTIVE", createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
    });
    return rows.map((r: any) => ({ [dim]: r[dim], count: r._count._all }));
  },
});

const queryViolationsClustered = defineTool({
  name: "queryViolationsClustered",
  description:
    "Cluster recent violations by type+platform and by hour-of-day to surface patterns (e.g. 'all DROP_OFF_IN_ADVANCE violations cluster in Salmiya 18:00-20:00'). Returns total count, breakdown by type:platform key, and breakdown by UTC hour. Use for the Narrator Agent's pattern-detection step before composing a briefing. Default lookback 4 hours, max 72. Tenant-scoped, read-only.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sinceHours: { type: "number" },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({ sinceHours: z.number().int().min(1).max(72).optional() }),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["narrator", "triage", "chat"],
  async execute(ctx, input) {
    const since = new Date(Date.now() - (input.sinceHours ?? 4) * 3600_000);
    const violations = await prisma.violation.findMany({
      where: { tenantId: ctx.tenantId, violationTime: { gte: since } },
      select: { violationType: true, platform: true, violationTime: true },
      take: 500,
    });
    const byTypePlatform: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    for (const v of violations) {
      const k = `${v.platform}:${v.violationType}`;
      byTypePlatform[k] = (byTypePlatform[k] ?? 0) + 1;
      const h = v.violationTime.getUTCHours();
      byHour[h] = (byHour[h] ?? 0) + 1;
    }
    return {
      totalInWindow: violations.length,
      byTypePlatform,
      byHourUtc: byHour,
    };
  },
});

const queryShiftCoverage = defineTool({
  name: "queryShiftCoverage",
  description:
    "Get current shift coverage by zone: a count of online couriers (CourierOnlineSession with isOnline=true) bucketed by area. Use for the Narrator Agent's briefing to point out under-covered zones (e.g. 'Salmiya has 2 online couriers — usual coverage is 8'). Tenant-scoped, no input parameters, read-only. Returns onlineCouriersByZone map and totalOnline count.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({}).strict(),
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["narrator", "triage", "chat"],
  async execute(ctx) {
    const sessions = await prisma.courierOnlineSession.findMany({
      where: { tenantId: ctx.tenantId, isOnline: true },
      select: { area: true },
    });
    const byZone: Record<string, number> = {};
    for (const s of sessions) {
      const k = s.area ?? "UNKNOWN";
      byZone[k] = (byZone[k] ?? 0) + 1;
    }
    return { onlineCouriersByZone: byZone, totalOnline: sessions.length };
  },
});

const publishBriefing = defineTool({
  name: "publishBriefing",
  description:
    "Publish the Narrator Agent's hourly ops briefing. Persists a Notification row (category=BRIEFING, severity=MEDIUM, type=narrator_briefing) AND publishes a 'briefing_published' event over the SSE bus so the Command Centre's briefing card updates in real-time. The summary is a 1-3 sentence narrative; alerts and recommendations are optional bullet lists. Tenant-scoped, sideEffect=notify, auto-execute (no approval needed for descriptive notifications).",
  inputSchema: {
    type: "object" as const,
    properties: {
      summary: { type: "string" },
      alerts: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  inputValidator: z.object({
    summary: z.string().min(10),
    alerts: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
  }),
  sideEffect: "notify",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR"],
  requiresApproval: false,
  allowedAgents: ["narrator"],
  async execute(ctx, input) {
    const content = {
      summary: input.summary,
      alerts: input.alerts ?? [],
      recommendations: input.recommendations ?? [],
      generatedAt: new Date().toISOString(),
    };
    // Persist to Notification table (category=BRIEFING) for 48h lookback.
    const notif = await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        type: "narrator_briefing",
        category: "BRIEFING",
        severity: "MEDIUM",
        title: input.summary.slice(0, 100),
        message: input.summary,
        metadata: content as any,
      },
    });
    await publishEvent({
      type: "briefing_published",
      tenantId: ctx.tenantId,
      timestamp: new Date().toISOString(),
      payload: { briefingId: notif.id, summary: input.summary },
    });
    return { ok: true, briefingId: notif.id };
  },
});

export function registerNarratorTools() {
  toolRegistry.register(queryAlertsGrouped);
  toolRegistry.register(queryViolationsClustered);
  toolRegistry.register(queryShiftCoverage);
  toolRegistry.register(publishBriefing);
}
