import { z } from "zod";
import { prisma } from "../../../config";
import { publishEvent } from "../../eventBus";
import { defineTool, toolRegistry } from "../toolRegistry";

/**
 * Narrator Agent tools. Read: cluster alerts/violations/coverage. Write:
 * publishBriefing (SSE-only; persists as AiDigest with type="narrator_briefing"
 * for 48h historical lookback).
 */

const queryAlertsGrouped = defineTool({
  name: "queryAlertsGrouped",
  description:
    "Count active alerts grouped by a dimension (type | severity | zone). Default: type.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dimension: { type: "string", enum: ["type", "severity"] },
      sinceHours: { type: "number", description: "Default 4" },
    },
    required: [],
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
    "Cluster recent violations by type + platform with a time bucket (hour/day). Returns counts for identifying patterns.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sinceHours: { type: "number" },
    },
    required: [],
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
    "Get current shift coverage by zone: number of on-shift couriers vs target. Useful for pointing out under-covered zones.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  inputValidator: z.object({}).passthrough(),
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
    "Publish the Narrator's hourly briefing. Pushes to Command Centre via SSE AND persists to AiDigest (TTL 48h) for historical lookback.",
  inputSchema: {
    type: "object" as const,
    properties: {
      summary: { type: "string" },
      alerts: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } },
    },
    required: ["summary"],
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
