/**
 * Phase 4 Wave 4 — /api/pinned-views CRUD + /:id/refresh.
 *
 * All endpoints require authMiddleware + tenantScope. Operations are
 * additionally scoped by req.user.userId so a foreign user inside the same
 * tenant cannot read or mutate pins they don't own (T-04-W4-04
 * mitigation — defense-in-depth on top of pinnedView.ts service primitives
 * which already scope by id+tenantId+userId via find-then-delete).
 *
 *   POST   /                — create pin (returns existing pin if dedup match)
 *   GET    /                — list user's pins ordered by sortOrder asc
 *   PATCH  /:id             — update title/description/sortOrder/refreshFrequency
 *   DELETE /:id             — hard delete (no soft-archive — pins are easy to recreate)
 *   POST   /:id/refresh     — re-runs the source spec via runAgent; updates spec in-place
 *
 * Soft cap warning at 24 (UI-SPEC §9) — backend returns `warnSoftCap: true`
 * field, frontend surfaces a toast. Dedup key per RESEARCH "Anti-Patterns":
 * (userId, sourceMessageId, viewType, title) — repeat pin returns existing
 * record with `deduplicated: true`.
 *
 * REQ-data-pinned-view, REQ-chat-generated-dashboards.
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { prisma } from "../config";
import {
  createPinnedView,
  listPinsForUser,
  removePinnedView,
  type PinnedViewType,
} from "../agent/pinnedView";
import { runAgent } from "../agent";
import { logger } from "../config/logger";

const router = Router();
router.use(authMiddleware, tenantScope);

const SOFT_CAP = 24;
const VALID_REFRESH = new Set(["on_open", "live", "static"] as const);

// ─── POST / — create pin ─────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { userId: string }).userId;
    const tenantId = req.user!.tenantId;
    const {
      viewType,
      spec,
      title,
      description,
      sortOrder = 0,
      refreshFrequency = "on_open",
      sourceThreadId,
      sourceMessageId,
    } = (req.body ?? {}) as Record<string, unknown>;

    if (!viewType || !spec || !title) {
      res.status(400).json({ error: "viewType, spec, title required" });
      return;
    }
    if (typeof title !== "string") {
      res.status(400).json({ error: "title must be a string" });
      return;
    }

    // Soft cap check (warning only — does not block).
    const existing = await prisma.pinnedView.count({ where: { tenantId, userId } });
    const warnSoftCap = existing >= SOFT_CAP;

    // Dedup: same (userId, sourceMessageId, viewType, title) returns existing pin.
    if (typeof sourceMessageId === "string" && sourceMessageId.length > 0) {
      const dup = await prisma.pinnedView.findFirst({
        where: {
          tenantId,
          userId,
          sourceMessageId,
          viewType: viewType as string,
          title: title as string,
        },
      });
      if (dup) {
        res.json({ pinnedView: dup, deduplicated: true, warnSoftCap });
        return;
      }
    }

    const created = await createPinnedView({
      tenantId,
      userId,
      viewType: viewType as PinnedViewType,
      spec: spec as object,
      title: title as string,
      description: typeof description === "string" ? description : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      refreshFrequency: VALID_REFRESH.has(refreshFrequency as never)
        ? (refreshFrequency as "on_open" | "live" | "static")
        : "on_open",
      sourceThreadId:
        typeof sourceThreadId === "string" ? sourceThreadId : undefined,
      sourceMessageId:
        typeof sourceMessageId === "string" ? sourceMessageId : undefined,
    });

    const full = await prisma.pinnedView.findFirst({
      where: { id: created.id, tenantId, userId },
    });
    res.json({ pinnedView: full, warnSoftCap });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create failed";
    logger.warn({ err }, "POST /api/pinned-views failed");
    res.status(400).json({ error: msg });
  }
});

// ─── GET / — list user's pins ────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { userId: string }).userId;
    const tenantId = req.user!.tenantId;
    const pinnedViews = await listPinsForUser(tenantId, userId);
    res.json({ pinnedViews });
  } catch (err) {
    logger.warn({ err }, "GET /api/pinned-views failed");
    res.status(500).json({ error: "list failed" });
  }
});

// ─── PATCH /:id — update mutable fields ──────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { userId: string }).userId;
    const tenantId = req.user!.tenantId;
    const { title, description, sortOrder, refreshFrequency } = (req.body ??
      {}) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (typeof title === "string") data.title = title.slice(0, 200);
    if (typeof description === "string") data.description = description;
    if (typeof sortOrder === "number") data.sortOrder = sortOrder;
    if (
      typeof refreshFrequency === "string" &&
      VALID_REFRESH.has(refreshFrequency as never)
    ) {
      data.refreshFrequency = refreshFrequency;
    }

    const result = await prisma.pinnedView.updateMany({
      where: { id: req.params.id, tenantId, userId },
      data,
    });
    if (result.count === 0) {
      res.status(404).json({ error: "PinnedView not found" });
      return;
    }
    const full = await prisma.pinnedView.findFirst({
      where: { id: req.params.id, tenantId, userId },
    });
    res.json({ pinnedView: full });
  } catch (err) {
    logger.warn({ err }, "PATCH /api/pinned-views failed");
    res.status(400).json({ error: "patch failed" });
  }
});

// ─── DELETE /:id — hard delete (scoped) ──────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { userId: string }).userId;
    const tenantId = req.user!.tenantId;
    const { removed } = await removePinnedView(req.params.id, tenantId, userId);
    if (!removed) {
      res.status(404).json({ error: "PinnedView not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.warn({ err }, "DELETE /api/pinned-views failed");
    res.status(500).json({ error: "delete failed" });
  }
});

// ─── POST /:id/refresh — re-run via runAgent ─────────────────────────────────
router.post("/:id/refresh", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { userId: string }).userId;
    const tenantId = req.user!.tenantId;
    const pin = await prisma.pinnedView.findFirst({
      where: { id: req.params.id, tenantId, userId },
    });
    if (!pin) {
      res.status(404).json({ error: "PinnedView not found" });
      return;
    }

    // Refresh requires a sourceMessageId to recover the original prompt.
    const sourceMsg = pin.sourceMessageId
      ? await prisma.chatMessage.findFirst({
          where: { id: pin.sourceMessageId, tenantId },
        })
      : null;
    if (!sourceMsg) {
      res.json({ pinnedView: pin, refreshedSpec: pin.spec });
      return;
    }
    // The user message that originated this pin sits BEFORE the assistant
    // message that emitted the view.
    const userMsg = await prisma.chatMessage.findFirst({
      where: {
        threadId: sourceMsg.threadId,
        tenantId,
        role: "user",
        createdAt: { lt: sourceMsg.createdAt },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!userMsg) {
      res.json({ pinnedView: pin, refreshedSpec: pin.spec });
      return;
    }

    const result = await runAgent("chat", {
      tenantId,
      triggerEvent: "route:pinned-views:refresh",
      userMessage: userMsg.content,
    });
    const fresh = (result.views ?? []).find(
      (v) =>
        (v as { type?: string } | null)?.type === pin.viewType ||
        (v as { viewType?: string } | null)?.viewType === pin.viewType,
    );
    if (!fresh) {
      res.json({
        pinnedView: pin,
        refreshedSpec: pin.spec,
        note: "no matching view in re-run",
      });
      return;
    }

    await prisma.pinnedView.update({
      where: { id: pin.id },
      data: {
        spec: fresh as object,
        lastViewedAt: new Date(),
      },
    });
    const updated = await prisma.pinnedView.findFirst({
      where: { id: pin.id, tenantId, userId },
    });
    res.json({ pinnedView: updated, refreshedSpec: fresh });
  } catch (err) {
    logger.warn({ err }, "POST /api/pinned-views/:id/refresh failed");
    res.status(500).json({ error: "refresh failed" });
  }
});

export default router;
