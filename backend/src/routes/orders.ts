import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { upload } from "../utils/upload";
import { parseWhatsAppMessages } from "../services/whatsappParser";
import fs from "fs";

const router = Router();
router.use(authMiddleware, tenantScope);

import { parseLocalDate, parseLocalDateEnd } from "../utils/date";

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { platform, driverId, dateFrom, dateTo, source, zone, search } = req.query;
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    if (driverId) where.driverId = driverId;
    if (source) where.source = source;
    if (zone) where.driver = { ...where.driver, zone: zone as string };
    if (search) where.driver = { ...where.driver, name: { contains: search as string, mode: "insensitive" } };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.date.lte = parseLocalDateEnd(dateTo as string);
    }

    let [data, total] = await Promise.all([
      prisma.orderLog.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true, zone: true } } },
      }),
      prisma.orderLog.count({ where }),
    ]);

    // Smart date fallback: if no data for the requested date, find most recent date
    if (data.length === 0 && (dateFrom || dateTo) && !driverId) {
      const fallbackWhere: any = { tenantId };
      if (platform) fallbackWhere.platform = platform;
      const latest = await prisma.orderLog.findFirst({
        where: fallbackWhere,
        orderBy: { date: "desc" },
        select: { date: true },
      });
      if (latest) {
        const latestDate = new Date(latest.date);
        latestDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(latestDate);
        nextDay.setDate(nextDay.getDate() + 1);
        fallbackWhere.date = { gte: latestDate, lt: nextDay };
        if (zone) fallbackWhere.driver = { ...fallbackWhere.driver, zone: zone as string };
        if (search) fallbackWhere.driver = { ...fallbackWhere.driver, name: { contains: search as string, mode: "insensitive" } };
        [data, total] = await Promise.all([
          prisma.orderLog.findMany({
            where: fallbackWhere, skip, take: limit,
            orderBy: { date: "desc" },
            include: { driver: { select: { id: true, name: true, platform: true, zone: true } } },
          }),
          prisma.orderLog.count({ where: fallbackWhere }),
        ]);
      }
    }

    const enriched = data.map((o: any) => ({
      ...o,
      zone: o.driver?.zone || null,
      deliveriesCount: o.orderCount,
      cashCollectedKd: o.cashCollected ? Number(o.cashCollected) : null,
    }));

    res.json(paginatedResponse(enriched, total, page, limit));
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
      if (dateFrom) where.date.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.date.lte = parseLocalDateEnd(dateTo as string);
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

    // Calculate orders per hour from TalabatSession actual hours
    let ordersPerHour = 0;
    if (platform === "TALABAT") {
      const sessionAgg = await prisma.talabatSession.aggregate({
        where: {
          tenantId,
          ...(dateFrom || dateTo
            ? { date: { ...(dateFrom ? { gte: parseLocalDate(dateFrom as string) } : {}), ...(dateTo ? { lte: parseLocalDateEnd(dateTo as string) } : {}) } }
            : {}),
        },
        _sum: { deliveries: true, actualHours: true },
      });
      const totalHours = Number(sessionAgg._sum.actualHours || 0);
      const totalDel = Number(sessionAgg._sum.deliveries || 0);
      ordersPerHour = totalHours > 0 ? Math.round((totalDel / totalHours) * 10) / 10 : 0;
    }

    res.json({
      totalDeliveries: agg._sum.orderCount || 0,
      totalDistanceKm: Number(agg._sum.distanceKm || 0),
      totalTipsKd: Number(agg._sum.tips || 0),
      totalCashKd: Number(agg._sum.cashCollected || 0),
      ordersPerHour,
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

// Parse WhatsApp messages (preview only, no save)
router.post("/parse-whatsapp", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    const parsed = parseWhatsAppMessages(text);
    res.json({ orders: parsed, count: parsed.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Save parsed WhatsApp orders
router.post("/whatsapp-import", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { orders, platform, driverId } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({ error: "No orders to import" });
      return;
    }

    const created = [];
    for (const order of orders) {
      const orderDate = order.date ? new Date(order.date) : new Date();
      let arrivalTime: Date | null = null;
      if (order.date && order.arrivalTime) {
        arrivalTime = new Date(`${order.date}T${order.arrivalTime}:00`);
      }

      const record = await prisma.orderLog.create({
        data: {
          tenantId,
          driverId: order.driverId || driverId,
          date: orderDate,
          platform: platform || "TALABAT",
          orderCount: 1,
          orderNumber: order.orderNumber || null,
          paymentSource: order.paymentSource || null,
          arrivalTime,
          cashCollected: order.cashCollected != null ? order.cashCollected : null,
          source: "WHATSAPP",
          rawData: { whatsapp: order.rawText, driverName: order.driverName },
        },
      });
      created.push(record);
    }

    res.status(201).json({
      message: `${created.length} order(s) imported from WhatsApp`,
      orders: created,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
