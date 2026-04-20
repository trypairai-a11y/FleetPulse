import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { CourierSuggestionEngine } from "../services/courierSuggestionEngine";

const router = Router();
router.use(authMiddleware, tenantScope);

/**
 * GET /api/courier/:driverId/suggestions
 * Returns ranked, bilingual AI suggestions for the courier app.
 */
router.get("/:driverId/suggestions", async (req: any, res) => {
  try {
    const max = Math.min(Number(req.query.max ?? 3), 5);
    const out = await CourierSuggestionEngine.forCourier(
      req.tenantId,
      req.params.driverId,
      max
    );
    res.json({ suggestions: out, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
