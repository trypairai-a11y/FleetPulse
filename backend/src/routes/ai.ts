import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { upload } from "../utils/upload";
import fs from "fs";

const router = Router();
router.use(authMiddleware, tenantScope);

// AI Chat
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory } = req.body;
    const tenantId = req.user!.tenantId;

    // Dynamic import to handle missing API key gracefully
    try {
      const { AiChatService } = await import("../services/aiChatService");
      const result = await AiChatService.chat(tenantId, message, conversationHistory || []);
      res.json(result);
    } catch {
      res.json({
        response: "AI chat requires ANTHROPIC_API_KEY to be configured. Please set it in your .env file.",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Digest
router.get("/digest", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const digest = await prisma.aiDigest.findFirst({
      where: { tenantId },
      orderBy: { date: "desc" },
    });
    res.json(digest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Digest - generate
router.post("/digest/generate", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    try {
      const { AiDigestService } = await import("../services/aiDigestService");
      const digest = await AiDigestService.generateDailyDigest(tenantId);
      res.json(digest);
    } catch {
      res.json({ message: "AI digest requires ANTHROPIC_API_KEY" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Screenshot OCR
router.post("/ocr", upload.single("screenshot"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const { platform } = req.body;

    try {
      const { AiOcrService } = await import("../services/aiOcrService");
      const imageBuffer = fs.readFileSync(req.file.path);
      const result = await AiOcrService.processScreenshot(imageBuffer, platform || "KEETA");
      res.json({ parsed: result, file: req.file.filename });
    } catch {
      res.json({
        message: "OCR requires ANTHROPIC_API_KEY",
        file: req.file.filename,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Driver scores
router.get("/scores", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, dateFrom, dateTo } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const scores = await prisma.aiScore.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
      include: { driver: { select: { id: true, name: true, platform: true } } },
    });
    res.json(scores);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Alerts (anomaly-generated)
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const alerts = await prisma.alert.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { driver: { select: { id: true, name: true, platform: true } } },
    });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
