import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET / - List notifications for the current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const tenantId = req.user!.tenantId;
    const { unreadOnly, limit = "50", offset = "0" } = req.query;

    const where: any = { tenantId, userId };
    if (unreadOnly === "true") where.read = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ notifications, total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /unread-count - Get unread notification count
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: {
        tenantId: req.user!.tenantId,
        userId: (req.user as any).id,
        read: false,
      },
    });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id/read - Mark a single notification as read
router.put("/:id/read", async (req: Request, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        userId: (req.user as any).id,
      },
      data: { read: true, readAt: new Date() },
    });
    if (result.count === 0) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /read-all - Mark all notifications as read
router.put("/read-all", async (req: Request, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        tenantId: req.user!.tenantId,
        userId: (req.user as any).id,
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });
    res.json({ updated: result.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /rules - List notification rules for this tenant
router.get("/rules", async (req: Request, res: Response) => {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: [{ eventType: "asc" }, { role: "asc" }],
    });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /rules - Upsert a notification rule
router.put("/rules", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { eventType, role, enabled } = req.body;

    const rule = await prisma.notificationRule.upsert({
      where: {
        tenantId_eventType_role: { tenantId, eventType, role },
      },
      update: { enabled },
      create: { tenantId, eventType, role, enabled },
    });
    res.json(rule);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
