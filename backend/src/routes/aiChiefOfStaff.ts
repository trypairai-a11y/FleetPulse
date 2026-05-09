import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { runAgent } from "../agent";

/**
 * POST /api/ai/cos
 * Chief-of-Staff entry point. Routes the incoming `mode` to a registered
 * agent: "ask" → "chat" agent, anything else → "narrator" agent (which
 * produces briefings, anomaly summaries, and the daily digest).
 *
 * Phase 1 Wave 4 — refactored from AiChiefOfStaffService.run/.dailyBriefing
 * to call runAgent directly (DEC-promote-agent-to-spine, orchestrator
 * resolution #5). Tenant scope flows from the existing auth + tenantScope
 * middleware chain (T-01-W4-03 mitigation: tenantId pulled from req.user!,
 * never req.body).
 */

export type CosMode = "morning_brief" | "anomalies" | "actions" | "ask" | "briefing" | "decide" | "forecast";

const router = Router();
router.use(authMiddleware, tenantScope);

router.post("/", async (req: any, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const mode = (req.body?.mode ?? "ask") as CosMode;
    const message = (req.body?.message ?? req.body?.prompt ?? "") as string;
    const history = (req.body?.history ?? []) as Array<{ role: "user" | "assistant"; content: string }>;
    if (!message && mode === "ask") {
      return res.status(400).json({ error: "prompt required" });
    }
    const agentId = mode === "ask" ? "chat" : "narrator";
    const result = await runAgent(agentId, {
      tenantId,
      triggerEvent: `route:cos:${mode}`,
      userMessage: message || `Run ${mode} for tenant ${tenantId}`,
      history,
    });
    return res.json({
      mode,
      status: result.status,
      text: result.text,
      runId: result.runId,
      actionsProposed: result.actionsProposed,
      pendingActionIds: result.pendingActionIds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "agent_run_failed" });
  }
});

/**
 * GET /api/ai/cos/briefing
 * Convenience endpoint for today's owner briefing. Delegates to the
 * "narrator" agent with a daily-briefing trigger payload.
 */
router.get("/briefing", async (req: any, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const today = new Date().toISOString().split("T")[0];
    const result = await runAgent("narrator", {
      tenantId,
      triggerEvent: "route:cos:briefing",
      payload: { kind: "daily_briefing", date: today },
    });
    return res.json({
      mode: "briefing",
      status: result.status,
      text: result.text,
      runId: result.runId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "briefing_failed" });
  }
});

export default router;
