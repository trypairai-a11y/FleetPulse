import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { AiRealtimeInsights } from "../services/aiRealtimeInsights";
import { AiInsightsEngine } from "../services/aiInsightsEngine";

const router = Router();
router.use(authMiddleware, tenantScope);

// ── GET /api/ai-insights/contextual ──────────────────────────────────────────
// Fetch pre-computed insights for a specific page context
router.get("/contextual", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const context = (req.query.context as string) ?? "dashboard";
    const platform = req.query.platform as string | undefined;
    const driverId = req.query.driverId as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    const now = new Date();

    const where: any = {
      tenantId,
      expiresAt: { gt: now },
    };

    // Match context exactly or "dashboard" (global insights)
    if (context !== "all") {
      where.OR = [{ context }, { context: "dashboard" }];
    }

    if (platform) where.platform = platform;
    if (driverId) where.driverId = driverId;
    if (category) where.category = category;

    const insights = await prisma.aiInsight.findMany({
      where,
      orderBy: { score: "desc" },
      take: limit,
    });

    // Get metadata
    const counts = await prisma.aiInsight.groupBy({
      by: ["category"],
      where: { tenantId, expiresAt: { gt: now } },
      _count: true,
    });

    const severityCounts = await prisma.aiInsight.groupBy({
      by: ["severity"],
      where: { tenantId, expiresAt: { gt: now } },
      _count: true,
    });

    res.json({
      insights,
      meta: {
        totalByCategory: Object.fromEntries(counts.map((c) => [c.category, c._count])),
        totalBySeverity: Object.fromEntries(severityCounts.map((s) => [s.severity, s._count])),
        context,
      },
    });
  } catch (err: any) {
    console.error("[aiInsights] contextual error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai-insights/realtime/idle-positioning ───────────────────────────
// Real-time restaurant recommendation for idle drivers
router.get("/realtime/idle-positioning", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const driverId = req.query.driverId as string;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const platform = (req.query.platform as string) ?? "KEETA";

    if (!driverId) {
      return res.status(400).json({ error: "driverId is required" });
    }

    const result = await AiRealtimeInsights.getIdleDriverRecommendation(
      tenantId,
      driverId,
      isNaN(lat) ? 0 : lat,
      isNaN(lng) ? 0 : lng,
      platform
    );

    res.json(result);
  } catch (err: any) {
    console.error("[aiInsights] idle-positioning error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai-insights/realtime/zone-capacity ──────────────────────────────
// Real-time zone staffing levels vs demand
router.get("/realtime/zone-capacity", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = (req.query.platform as string) ?? "KEETA";

    const result = await AiRealtimeInsights.getZoneCapacity(tenantId, platform);

    res.json({ zones: result });
  } catch (err: any) {
    console.error("[aiInsights] zone-capacity error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ai-insights/summary ─────────────────────────────────────────────
// Counts by category + severity for nav badge
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const now = new Date();

    const [byCategory, bySeverity, total] = await Promise.all([
      prisma.aiInsight.groupBy({
        by: ["category"],
        where: { tenantId, expiresAt: { gt: now } },
        _count: true,
      }),
      prisma.aiInsight.groupBy({
        by: ["severity"],
        where: { tenantId, expiresAt: { gt: now } },
        _count: true,
      }),
      prisma.aiInsight.count({
        where: { tenantId, expiresAt: { gt: now } },
      }),
    ]);

    res.json({
      total,
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count])),
      bySeverity: Object.fromEntries(bySeverity.map((s) => [s.severity, s._count])),
    });
  } catch (err: any) {
    console.error("[aiInsights] summary error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai-insights/:id/dismiss ────────────────────────────────────────
// Remove an insight the user doesn't want to see
router.post("/:id/dismiss", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    await prisma.aiInsight.deleteMany({
      where: { id, tenantId },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[aiInsights] dismiss error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai-insights/:id/feedback ───────────────────────────────────────
// Track whether an insight was useful (for future algorithm tuning)
router.post("/:id/feedback", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const useful = req.query.useful === "true";

    const insight = await prisma.aiInsight.findFirst({
      where: { id, tenantId },
    });

    if (!insight) {
      return res.status(404).json({ error: "Insight not found" });
    }

    // Store feedback in the data JSON
    const currentData = (insight.data as Record<string, unknown>) ?? {};
    await prisma.aiInsight.update({
      where: { id },
      data: {
        data: { ...currentData, feedback: useful, feedbackAt: new Date().toISOString() },
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[aiInsights] feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai-insights/generate ───────────────────────────────────────────
// Manually trigger insight generation (admin only)
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const count = await AiInsightsEngine.computeAllInsights(tenantId);
    res.json({ success: true, insightsGenerated: count });
  } catch (err: any) {
    console.error("[aiInsights] generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
