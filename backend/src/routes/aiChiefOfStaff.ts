import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { AiChiefOfStaffService, CosMode } from "../services/aiChiefOfStaffService";

const router = Router();
router.use(authMiddleware, tenantScope);

/**
 * POST /api/ai/cos
 * Body: { mode: 'ask' | 'decide' | 'forecast' | 'briefing', prompt: string, history?: [...] }
 */
router.post("/", async (req: any, res) => {
  try {
    const { mode = "ask", prompt, history = [] } = req.body ?? {};
    if (!prompt && mode !== "briefing") {
      return res.status(400).json({ error: "prompt required" });
    }
    const out = await AiChiefOfStaffService.run(
      req.tenantId,
      mode as CosMode,
      prompt ?? "",
      history
    );
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ai/cos/briefing
 * Returns today's auto-generated owner briefing (bilingual).
 * Cache via Redis upstream; this endpoint always re-runs unless ?cached=1.
 */
router.get("/briefing", async (req: any, res) => {
  try {
    const out = await AiChiefOfStaffService.dailyBriefing(req.tenantId);
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
