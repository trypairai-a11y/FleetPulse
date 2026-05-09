import { z } from "zod";
import { prisma } from "../../../config";
import { defineTool, toolRegistry } from "../../registry";

/**
 * Phase 2 — `listAgentMemory`. The 12th read tool.
 *
 * Prefix scan over the `AgentMemory` table, tenant-scoped. Used by the
 * monitor agent at the top of every tick to read recent dismissals so it
 * can apply the 7-day suppression contract (CON-dismiss-suppression-7-day):
 *
 *   prefix = "dismissed:"  →  rows shaped like
 *     dismissed:<toolName>:<subjectType>:<subjectId>
 *
 *   For every row whose `createdAt` is within the last 7 days, the
 *   `<toolName> + <subjectType> + <subjectId>` triple is silenced for the
 *   monitor's current run. This prevents re-pinging operators on the same
 *   issue they already chose to dismiss.
 *
 * Other prefixes the same scan supports (used in later phases / by other
 * agents): `learning:`, `pinned:`, `recent_action:`. Tenant-scoped, no
 * cross-tenant leak. Read-only, no approval gate.
 *
 * REQ-data-agent-memory + REQ-agent-propose-confirm.
 */
export const listAgentMemory = defineTool({
  name: "listAgentMemory",
  description:
    "Prefix-scan the AgentMemory table for the current tenant and return the matching rows ordered newest-first. Used by the monitor agent at the top of every tick to read recent dismissals (prefix='dismissed:') so it can apply the 7-day suppression contract — re-proposing an action against a subject the operator dismissed within the last 7 days erodes trust. Also usable for other prefixes (learning:, pinned:, recent_action:). Tenant-scoped, no approval gate; default limit 200, max 500.",
  inputSchema: {
    type: "object" as const,
    properties: {
      prefix: {
        type: "string",
        description: "Key prefix to scan (e.g. 'dismissed:' or 'learning:').",
      },
      limit: {
        type: "number",
        description: "Max rows to return (default 200, max 500).",
      },
    },
    required: ["prefix"],
    additionalProperties: false,
  },
  inputValidator: z
    .object({
      prefix: z.string().min(1).max(100),
      limit: z.number().int().min(1).max(500).optional(),
    })
    .strict(),
  strict: true,
  sideEffect: "read",
  requiredRole: ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"],
  requiresApproval: false,
  allowedAgents: ["monitor", "triage", "narrator", "chat", "reconciliation"],
  async execute(ctx, input) {
    const limit = Math.min(input.limit ?? 200, 500);
    const rows = await prisma.agentMemory.findMany({
      where: {
        tenantId: ctx.tenantId,
        key: { startsWith: input.prefix },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        key: true,
        value: true,
        confidence: true,
        source: true,
        createdAt: true,
      },
    });

    return (rows ?? []).map((r) => ({
      id: r.id,
      key: r.key,
      value: r.value,
      confidence: r.confidence,
      source: r.source ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));
  },
});

export function registerListAgentMemoryTool() {
  toolRegistry.register(listAgentMemory);
}

registerListAgentMemoryTool();
