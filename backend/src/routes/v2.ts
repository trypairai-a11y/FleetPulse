import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

/**
 * v2 aggregation routes used by the Command Centre. One round-trip per page load.
 * These are read-only composites of existing counts — nothing new persisted here.
 */

const router = Router();
router.use(authMiddleware, tenantScope);

// GET /api/v2/pulse — 5 numbers for the pulse strip.
router.get("/pulse", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [onShift, ordersInFlight, cashPendingAgg, openViolations, queuePending] = await Promise.all([
      prisma.courierOnlineSession.count({ where: { tenantId, isOnline: true } }),
      prisma.shift.count({ where: { tenantId, status: "IN_PROGRESS" } }),
      prisma.cashRecord.aggregate({
        where: { tenantId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
        _sum: { pendingDues: true },
      }),
      prisma.violation.count({ where: { tenantId, violationStatus: "ESTABLISHED" } }),
      prisma.pendingAgentAction.count({ where: { tenantId, resolvedAt: null } }),
    ]);

    res.json({
      onShift,
      ordersInFlight,
      cashPendingKd: Number(cashPendingAgg._sum.pendingDues ?? 0),
      openViolations,
      queuePending,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v2/briefing — most recent Narrator briefing (Notification category=BRIEFING).
router.get("/briefing", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const latest = await prisma.notification.findFirst({
      where: { tenantId, category: "BRIEFING", type: "narrator_briefing" },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) return res.json(null);
    const content = (latest.metadata ?? {}) as any;
    res.json({
      summary: content?.summary ?? latest.message,
      alerts: content?.alerts ?? [],
      recommendations: content?.recommendations ?? [],
      generatedAt: latest.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
