// Phase 2 Wave 2 — Audit Log API.
//
// /api/audit/agent-actions/* — read access to AgentAction (the canonical
// CON-audit-row-shape ledger) plus a rollback endpoint scoped to the
// Phase-2 reversible tools.
//
// Endpoints (all authMiddleware + tenantScope; ACCOUNTANT + VIEWER may
// read; rollback restricted to ADMIN + OPS_MANAGER per UI-SPEC §11 Q3):
//
//   GET  /agent-actions          — paginated AgentAction[] with filters
//   GET  /agent-actions/:id      — full row + joined approver + run
//   POST /agent-actions/:id/rollback  — Phase-2 only the
//                                       draftCourierMessage tool ships a
//                                       reversible side effect; other
//                                       tools 400 with "ships in a later
//                                       phase".
//
// REQ-decisions-proposal-inbox audit trail / T-02-15 / T-02-16.

import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { rbac } from "../middleware/rbac";
import { publishEvent } from "../services/eventBus";

const router = Router();
router.use(authMiddleware, tenantScope);

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function parsePagination(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawLimit =
    Number.parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ─── GET /agent-actions ──────────────────────────────────────────────────
//
// ACCOUNTANT + VIEWER allowed (read-only audit trail per UI-SPEC §11 Q3).
router.get(
  "/agent-actions",
  rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { page, limit, skip } = parsePagination(req);

      const dateFrom = parseDate(req.query.dateFrom);
      const dateTo = parseDate(req.query.dateTo);
      const toolName =
        typeof req.query.toolName === "string" ? req.query.toolName : undefined;
      const outcome =
        typeof req.query.outcome === "string" ? req.query.outcome : undefined;
      const approverId =
        typeof req.query.approverId === "string"
          ? req.query.approverId
          : undefined;
      const subjectType =
        typeof req.query.subjectType === "string"
          ? req.query.subjectType
          : undefined;
      const subjectId =
        typeof req.query.subjectId === "string" ? req.query.subjectId : undefined;

      // Build where progressively, dropping undefined keys so Prisma
      // doesn't see `key: undefined`.
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = dateFrom;
      if (dateTo) createdAt.lte = dateTo;

      const where = {
        tenantId,
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
        ...(toolName ? { toolName } : {}),
        ...(outcome ? { outcome } : {}),
        ...(approverId ? { approverId } : {}),
        ...(subjectType ? { subjectType } : {}),
        ...(subjectId ? { subjectId } : {}),
      };

      const [rows, total] = await Promise.all([
        prisma.agentAction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.agentAction.count({ where }),
      ]);

      return res.json({
        rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  },
);

// ─── GET /agent-actions/:id ──────────────────────────────────────────────
router.get(
  "/agent-actions/:id",
  rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const row = await prisma.agentAction.findFirst({
        where: { id: req.params.id, tenantId },
        include: {
          approver: { select: { id: true, name: true, email: true } },
          agentRun: {
            select: {
              id: true,
              agentId: true,
              model: true,
              startedAt: true,
              finishedAt: true,
              promptTokens: true,
              completionTokens: true,
            },
          },
        },
      });
      if (!row) return res.status(404).json({ error: "Audit row not found" });
      return res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  },
);

// ─── POST /agent-actions/:id/rollback ────────────────────────────────────
//
// Phase 2 ships the rollback handler ONLY for the draftCourierMessage
// tool — the only Phase-2 LIVE tool, and the only one whose side effect
// is a single Notification row that we can soft-rollback by mutating
// the type and message rather than deleting (preserves audit trail).
//
// Other tools 400 with a clear "ships in a later phase" message so the
// front-end can render an explanation.
//
// RBAC restricted to ADMIN + OPS_MANAGER (UI-SPEC §11 Q3). T-02-15:
// undo-by-time inside POST /api/decisions/:id/undo handles the 5-minute
// window; this endpoint handles older approvals via owner authorisation.
router.post(
  "/agent-actions/:id/rollback",
  rbac("ADMIN", "OPS_MANAGER"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const reason = (req.body?.reason ?? "").toString().trim();
      if (!reason) {
        return res.status(400).json({ error: "reason required" });
      }

      const audit = await prisma.agentAction.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!audit) {
        return res.status(404).json({ error: "Audit row not found" });
      }
      if (audit.outcome !== "success") {
        return res
          .status(409)
          .json({ error: `Cannot rollback row with outcome=${audit.outcome}` });
      }
      if (audit.rolledBackAt) {
        return res.status(409).json({ error: "Already rolled back" });
      }

      if (audit.toolName !== "draftCourierMessage") {
        return res.status(400).json({
          error: `Rollback for ${audit.toolName} ships in a later phase`,
        });
      }

      // Soft rollback: mark the spawned Notification rows so the UI/audit
      // trail shows them as reverted but the historical record is preserved.
      // Match by the metadata.drafterRunId == audit.agentRunId (set when
      // draftCourierMessage's execute body fired). Skip if no agentRunId
      // (defensive — the live tool should always carry one).
      if (audit.agentRunId) {
        // Prisma JSON path filter — uses the mongo-like operator. Tenant-
        // scope is the dominant filter; metadata path narrows further.
        await prisma.notification.updateMany({
          where: {
            tenantId,
            metadata: {
              path: ["drafterRunId"],
              equals: audit.agentRunId,
            },
          },
          data: {
            type: "AGENT_DRAFT_ROLLED_BACK",
          },
        });
      }

      await prisma.agentAction.update({
        where: { id: audit.id },
        data: {
          rolledBackAt: new Date(),
          rolledBackById: userId,
          rollbackReason: reason,
          outcome: "rolled_back",
        },
      });

      await publishEvent({
        type: "agent_action_resolved",
        tenantId,
        timestamp: new Date().toISOString(),
        payload: {
          agentActionId: audit.id,
          resolution: "rolled_back",
          reason,
        },
      });

      return res.json({
        agentActionId: audit.id,
        rolledBackAt: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: msg });
    }
  },
);

export default router;
