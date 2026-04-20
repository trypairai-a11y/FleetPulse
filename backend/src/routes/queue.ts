import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { rbac } from "../middleware/rbac";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { toolRegistry } from "../services/agents/toolRegistry";
import type { ToolContext } from "../services/agents/toolRegistry";
import { publishEvent } from "../services/eventBus";

/**
 * Queue routes — the human-approval surface for agent recommendations.
 *
 *   GET  /api/queue            → list PendingAgentAction rows (ranked by priorityScore)
 *   GET  /api/queue/:id        → single row with run metadata
 *   POST /api/queue/:id/decision  → approve | reject (with optional overrideReason)
 *   GET  /api/queue/counts     → { pending, approvedToday, rejectedToday }
 */

const router = Router();
router.use(authMiddleware, tenantScope);

// List pending queue items, newest/highest-priority first.
router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { agentId, resolved } = req.query;
    const where: any = { tenantId };
    if (agentId) where.agentId = agentId;
    if (resolved === "true") where.resolvedAt = { not: null };
    else if (resolved === "false" || resolved === undefined) where.resolvedAt = null;

    const [data, total] = await Promise.all([
      prisma.pendingAgentAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      }),
      prisma.pendingAgentAction.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lightweight counts for the Command Centre badge + pulse strip.
router.get("/counts", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [pending, approvedToday, rejectedToday] = await Promise.all([
      prisma.pendingAgentAction.count({ where: { tenantId, resolvedAt: null } }),
      prisma.pendingAgentAction.count({
        where: { tenantId, resolvedAt: { gte: startOfDay }, resolution: "approved" },
      }),
      prisma.pendingAgentAction.count({
        where: { tenantId, resolvedAt: { gte: startOfDay }, resolution: "rejected" },
      }),
    ]);
    res.json({ pending, approvedToday, rejectedToday });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const row = await prisma.pendingAgentAction.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        run: {
          select: {
            id: true,
            agentId: true,
            triggerEvent: true,
            model: true,
            startedAt: true,
            finishedAt: true,
            status: true,
            toolCalls: {
              select: { id: true, toolName: true, executedAt: true, durationMs: true, error: true },
              orderBy: { executedAt: "asc" },
            },
          },
        },
      },
    });
    if (!row) return res.status(404).json({ error: "Queue item not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve or reject a pending action.
// On approve, the underlying tool is re-invoked bound to the approving user's ID.
router.post(
  "/:id/decision",
  rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { decision, overrideReason } = req.body as {
        decision: "approve" | "reject";
        overrideReason?: string;
      };
      if (decision !== "approve" && decision !== "reject") {
        return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
      }

      const pending = await prisma.pendingAgentAction.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!pending) return res.status(404).json({ error: "Queue item not found" });
      if (pending.resolvedAt) {
        return res.status(409).json({ error: "Already resolved", resolution: pending.resolution });
      }

      if (decision === "reject") {
        await prisma.pendingAgentAction.update({
          where: { id: pending.id },
          data: {
            resolvedAt: new Date(),
            resolution: "rejected",
            overrideReason: overrideReason ?? null,
            resolvedBy: userId,
          },
        });
        await prisma.agentRunLog.update({
          where: { id: pending.runId },
          data: { actionsRejected: { increment: 1 } },
        });
        await publishEvent({
          type: "agent_action_resolved",
          tenantId,
          timestamp: new Date().toISOString(),
          payload: { pendingActionId: pending.id, resolution: "rejected" },
        });
        return res.json({ ok: true, resolution: "rejected" });
      }

      // approve → invoke the underlying tool, bound to the approving user
      const ctx: ToolContext = {
        tenantId,
        agentId: pending.agentId,
        runId: pending.runId,
        actorRole: req.user!.role as any,
        userId,
      };
      const result = await toolRegistry.invoke(
        pending.toolName,
        ctx,
        pending.input as unknown,
        {} // already staged once — second invoke executes since userId is set
      );

      if (result.status !== "executed") {
        return res.status(400).json({
          error: result.error ?? `Tool returned status: ${result.status}`,
        });
      }

      await prisma.pendingAgentAction.update({
        where: { id: pending.id },
        data: {
          resolvedAt: new Date(),
          resolution: "approved",
          overrideReason: overrideReason ?? null,
          resolvedBy: userId,
        },
      });
      await prisma.agentRunLog.update({
        where: { id: pending.runId },
        data: { actionsApproved: { increment: 1 } },
      });
      await publishEvent({
        type: "agent_action_resolved",
        tenantId,
        timestamp: new Date().toISOString(),
        payload: { pendingActionId: pending.id, resolution: "approved", output: result.output },
      });

      res.json({ ok: true, resolution: "approved", output: result.output });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
