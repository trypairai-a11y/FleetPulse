import { z } from "zod";
import { defineTool, toolRegistry } from "../../registry";
import * as agent from "../..";

/**
 * Phase 3 Wave 1 read tool — REQ-agent-scoring / REQ-driver-file.
 *
 * Returns the 90-day (default) performance trend for one driver, sourced from
 * the PerformanceSnapshot table that the daily writer (Phase 1 Wave 2) keeps
 * up to date. Used by the Driver File 90-day trend chart, by the agent's
 * "why is this driver's score dropping" reasoning, and (later) by the
 * generated mini-dashboards in Phase 4 chat.
 *
 * Tenant-scoped via ctx.tenantId; daysBack clamps to [1, 365] with a default
 * of 90 so a single agent call to "show me the trend" returns the canonical
 * window without parameter tuning.
 */
export const performanceTrend = defineTool({
  name: "performanceTrend",
  description:
    "Return the composite-performance trend for ONE driver over the last N days (default 90, max 365). Each row carries snapshotDate + compositeScore + the five sub-scores (attendance, delivery, financial, equipment, platform) sourced from the daily PerformanceSnapshot writer. Use this tool when the agent needs to see a driver's trajectory (improving, stable, regressing) or to back up a score-explanation with a multi-week view. Tenant-scoped — the calling tenant only sees its own drivers; mismatched tenantId returns an empty array. Daily resolution — no intra-day granularity. Read-only.",
  inputSchema: {
    type: "object" as const,
    properties: {
      driverId: { type: "string", description: "Driver.id (uuid). Tenant scope enforced via ctx.tenantId — cross-tenant requests return []." },
      daysBack: { type: "number", description: "Trailing window in days. Defaults to 90 when omitted. Values >365 are clamped to 365." },
    },
    required: ["driverId"],
    additionalProperties: false,
  },
  inputValidator: z.object({
    driverId: z.string().min(1),
    daysBack: z.number().int().positive().optional(),
  }),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["*"],
  async execute(ctx, input) {
    const requested = input.daysBack ?? 90;
    const daysBack = Math.min(requested, 365);
    return agent.listSnapshotsForDriver(ctx.tenantId, input.driverId, daysBack);
  },
});

toolRegistry.register(performanceTrend);
