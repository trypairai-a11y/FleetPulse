import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 1 read tool — REQ-agent-read-tools.
 *
 * Wraps Violation.findMany with date range, status, appeal status, courier,
 * and platform filters. Mirrors _legacy/triage::queryOpenViolations but exposes
 * a richer filter surface for agents that need to slice violations differently.
 */
export const violationsList = defineTool({
  name: "violationsList",
  description:
    "List violations matching filters. Returns violation ID, type, platform, driver, violationTime, status, appealStatus, and a short details snippet. Use for 'show me today's violations', 'all open appeals for driver X', operations review, or as raw input for clustering. Optional filters: date range, violationStatus (ESTABLISHED/UNDER_REVIEW/OVERTURNED/EXPIRED), appealStatus, courierId (driverId), platform. Tenant-scoped, default limit 50, max 100.",
  inputSchema: {
    type: "object" as const,
    properties: {
      dateFrom: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      dateTo: { type: "string", description: "ISO date YYYY-MM-DD, inclusive." },
      violationStatus: {
        type: "string",
        enum: ["ESTABLISHED", "UNDER_REVIEW", "OVERTURNED", "EXPIRED"],
        description: "Optional violation status filter.",
      },
      appealStatus: {
        type: "string",
        enum: ["NOT_RAISED", "PENDING", "APPROVED", "REJECTED"],
        description: "Optional appeal status filter.",
      },
      courierId: { type: "string", description: "Optional: scope to one driver." },
      platform: {
        type: "string",
        enum: ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"],
        description: "Optional platform filter.",
      },
      limit: { type: "number", description: "Default 50, max 100." },
    },
    required: [],
    additionalProperties: false,
  },
  inputValidator: z.object({
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    violationStatus: z
      .enum(["ESTABLISHED", "UNDER_REVIEW", "OVERTURNED", "EXPIRED"])
      .optional(),
    appealStatus: z
      .enum(["NOT_RAISED", "PENDING", "APPROVED", "REJECTED"])
      .optional(),
    courierId: z.string().optional(),
    platform: z.enum(["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const limit = Math.min(input.limit ?? 50, 100);
    const dateTo = input.dateTo ? new Date(input.dateTo) : undefined;
    const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
    const rows = await prisma.violation.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(dateFrom || dateTo
          ? {
              violationTime: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(input.violationStatus
          ? { violationStatus: input.violationStatus }
          : {}),
        ...(input.appealStatus ? { appealStatus: input.appealStatus } : {}),
        ...(input.courierId ? { driverId: input.courierId } : {}),
        ...(input.platform ? { platform: input.platform } : {}),
      },
      include: {
        driver: { select: { id: true, name: true, platform: true } },
      },
      orderBy: { violationTime: "desc" },
      take: limit,
    });
    return rows.map((v) => ({
      violationId: v.id,
      type: v.violationType,
      platform: v.platform,
      driverId: v.driver?.id ?? null,
      driverName: v.driver?.name ?? null,
      violationTime: v.violationTime.toISOString(),
      status: v.violationStatus,
      appealStatus: v.appealStatus,
      details: (v.details ?? "").slice(0, 200),
    }));
  },
});

export function registerViolationsListTool() {
  toolRegistry.register(violationsList);
}

registerViolationsListTool();
