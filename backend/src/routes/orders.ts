import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { upload } from "../utils/upload";
import fs from "fs";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { platform, driverId, dateFrom, dateTo, source } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (driverId) where.driverId = driverId;
    if (source) where.source = source;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.orderLog.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.orderLog.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform, dateFrom, dateTo } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const agg = await prisma.orderLog.aggregate({
      where,
      _sum: {
        orderCount: true,
        distanceKm: true,
        tips: true,
        cashCollected: true,
      },
    });

    res.json({
      totalDeliveries: agg._sum.orderCount || 0,
      totalDistanceKm: Number(agg._sum.distanceKm || 0),
      totalTipsKd: Number(agg._sum.tips || 0),
      totalCashKd: Number(agg._sum.cashCollected || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await prisma.orderLog.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true, shift: true },
    });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const order = await prisma.orderLog.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const order = await prisma.orderLog.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (order.count === 0) { res.status(404).json({ error: "Order not found" }); return; }
    const updated = await prisma.orderLog.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.orderLog.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Order deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Upload screenshot for OCR processing
router.post("/upload-screenshot", upload.single("screenshot"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const { platform, driverId, date } = req.body;
    const tenantId = req.user!.tenantId;

    // Attempt OCR via AI service
    let ocrResult = null;
    let orderRecord = null;

    try {
      const { AiOcrService } = await import("../services/aiOcrService");
      const imageBuffer = fs.readFileSync(req.file.path);
      ocrResult = await AiOcrService.processScreenshot(imageBuffer, platform || "KEETA");
    } catch {
      res.json({
        message: "OCR requires ANTHROPIC_API_KEY to be configured.",
        file: req.file.filename,
        platform,
        driverId,
      });
      return;
    }

    if (!ocrResult) {
      res.json({
        message: "OCR requires ANTHROPIC_API_KEY to be configured.",
        file: req.file.filename,
        platform,
        driverId,
      });
      return;
    }

    // Create an OrderLog record from the parsed OCR data
    if (driverId) {
      const orderCount =
        "deliveryCount" in ocrResult ? (ocrResult.deliveryCount ?? 0) :
        "deliveries" in ocrResult ? (ocrResult.deliveries ?? 0) :
        "totalOrders" in ocrResult ? (ocrResult.totalOrders ?? 0) : 0;

      const distanceKm =
        "distanceKm" in ocrResult ? (ocrResult.distanceKm ?? undefined) : undefined;

      const cashCollected =
        "cashCollectedKD" in ocrResult ? (ocrResult.cashCollectedKD ?? undefined) :
        "cashKD" in ocrResult ? (ocrResult.cashKD ?? undefined) :
        "totalAmountKWD" in ocrResult ? (ocrResult.totalAmountKWD ?? undefined) : undefined;

      const tips =
        "tipsKD" in ocrResult ? (ocrResult.tipsKD ?? undefined) : undefined;

      const orderDate = ocrResult.platform !== "AMERICANA" && "date" in ocrResult && ocrResult.date
        ? new Date(ocrResult.date)
        : date ? new Date(date) : new Date();

      orderRecord = await prisma.orderLog.create({
        data: {
          tenantId,
          driverId,
          date: orderDate,
          platform: platform || ocrResult.platform,
          orderCount: orderCount || 0,
          distanceKm,
          cashCollected,
          tips,
          screenshotUrl: req.file.filename,
          source: "SCREENSHOT_OCR",
          rawData: ocrResult as any,
        },
      });
    }

    res.json({
      message: "Screenshot processed successfully.",
      file: req.file.filename,
      parsed: ocrResult,
      order: orderRecord,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Import Keeta XLSX
router.post("/import-keeta", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    // XLSX parsing will be implemented with actual column mapping
    res.json({ message: "Keeta XLSX import received", file: req.file.filename });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Import Americana XLSX
router.post("/import-americana", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    res.json({ message: "Americana XLSX import received", file: req.file.filename });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
