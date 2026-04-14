import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

/**
 * @swagger
 * /api/orders/{id}/flow:
 *   get:
 *     tags: [Order Flow]
 *     summary: Get the step-by-step event timeline for an order
 *     description: Returns chronologically ordered events with elapsed time between each step (e.g. customer placed order, courier picked up, delivered).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order flow with steps array, each containing action, description, timestamp, and elapsed time from previous step
 */
router.get("/orders/:id/flow", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const orderId = req.params.id;

    const events = await prisma.orderEvent.findMany({
      where: { tenantId, orderId },
      orderBy: { timestamp: "asc" },
    });

    // Compute elapsed time between consecutive events
    const steps = events.map((event, i) => {
      const prev = i > 0 ? events[i - 1] : null;
      const elapsedMs = prev
        ? new Date(event.timestamp).getTime() - new Date(prev.timestamp).getTime()
        : 0;
      const elapsedSeconds = Math.round(elapsedMs / 1000);

      return {
        id: event.id,
        action: event.action,
        description: event.description,
        operator: event.operator,
        operatorId: event.operatorId,
        timestamp: event.timestamp,
        metadata: event.metadata,
        elapsedSeconds,
        elapsedFormatted: formatElapsed(elapsedSeconds),
      };
    });

    res.json({ orderId, steps, totalEvents: steps.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default router;
