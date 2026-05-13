// Phase 4 Wave 5 — Scheduled briefings REST CRUD.
//
// GET    /api/scheduled-briefings
// POST   /api/scheduled-briefings    body: { name, cron, prompt, recipients?, channels?, type? }
// PATCH  /api/scheduled-briefings/:id  body: partial { active, name, cron, prompt }
// DELETE /api/scheduled-briefings/:id
//
// All routes tenant + user scoped via authMiddleware + tenantScope.
// Cron whitelist enforced by service layer (T-04-W5-01 mitigation).
// REQ-chat-scheduled-jobs.

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import * as svc from "../services/scheduledBriefingsService";

const router = Router();
router.use(authMiddleware, tenantScope);

function ctx(req: Request) {
  const user = req.user as any;
  return {
    tenantId: user?.tenantId as string,
    userId: (user?.id ?? user?.userId) as string,
    userRole: (user?.role ?? "VIEWER") as string,
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = ctx(req);
    const briefings = await svc.listBriefings(tenantId, userId);
    res.json({ briefings });
  } catch (err) {
    const msg = (err as Error).message || "Failed to list briefings";
    res.status(500).json({ error: msg });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, userRole } = ctx(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const briefing = await svc.createBriefing({
      tenantId,
      userId,
      userRole,
      name: String(body.name ?? ""),
      cron: String(body.cron ?? ""),
      prompt: String(body.prompt ?? ""),
      recipients: Array.isArray(body.recipients)
        ? (body.recipients as string[])
        : undefined,
      channels: Array.isArray(body.channels) ? (body.channels as string[]) : undefined,
      type:
        body.type === "standing_rule_v3" || body.type === "briefing"
          ? (body.type as "briefing" | "standing_rule_v3")
          : undefined,
    });
    res.json({ briefing });
  } catch (err) {
    const msg = (err as Error).message || "Failed to create briefing";
    res.status(400).json({ error: msg });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, userRole } = ctx(req);
    const patch = (req.body ?? {}) as Partial<{
      active: boolean;
      name: string;
      cron: string;
      prompt: string;
    }>;
    const briefing = await svc.patchBriefing(
      req.params.id,
      tenantId,
      userId,
      userRole,
      patch,
    );
    res.json({ briefing });
  } catch (err) {
    const e = err as Error & { code?: string };
    const status = e.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = ctx(req);
    await svc.deleteBriefing(req.params.id, tenantId, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
