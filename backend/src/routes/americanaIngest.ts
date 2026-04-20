import fs from "fs";
import path from "path";
import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { upload } from "../utils/upload";
import { parseAmericanaDailyXlsx } from "../services/americanaDailyParser";
import { processIngestionRows } from "../queues/americanaIngestWorker";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET /api/americana/ingest — list recent ingestions
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status } = req.query;
    const where: any = { tenantId };
    if (status) where.status = status as string;
    const rows = await prisma.americanaDailyIngestion.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      take: 100,
      select: {
        id: true, source: true, status: true, ingestDate: true,
        rowCount: true, capturedAt: true, approvedAt: true,
        approvedBy: true, rejectedReason: true, rawFileUrl: true, errorLog: true,
      },
    });
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/americana/ingest/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const row = await prisma.americanaDailyIngestion.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!row) { res.status(404).json({ error: "Ingestion not found" }); return; }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/americana/ingest/manual-upload (multipart: file=xlsx)
router.post("/manual-upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const tenantId = req.user!.tenantId;
    const buffer = fs.readFileSync(req.file.path);
    const { rows, ingestDate } = parseAmericanaDailyXlsx(buffer);
    if (rows.length === 0) {
      res.status(400).json({ error: "No data rows found in file" });
      return;
    }
    const rel = `/uploads/${path.basename(req.file.path)}`;
    const staged = await prisma.americanaDailyIngestion.create({
      data: {
        tenantId,
        source: "MANUAL_UPLOAD",
        rawFileUrl: rel,
        ingestDate: ingestDate ?? new Date(),
        status: "PENDING_REVIEW",
        parsedRows: rows as any,
        rowCount: rows.length,
      },
    });
    res.status(201).json(staged);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/americana/ingest/:id/approve
router.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const ingestion = await prisma.americanaDailyIngestion.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!ingestion) { res.status(404).json({ error: "Ingestion not found" }); return; }
    if (ingestion.status !== "PENDING_REVIEW") {
      res.status(400).json({ error: `Cannot approve ingestion with status ${ingestion.status}` });
      return;
    }
    await prisma.americanaDailyIngestion.update({
      where: { id: ingestion.id },
      data: { approvedBy: req.user!.userId, approvedAt: new Date() },
    });
    const result = await processIngestionRows(ingestion.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/americana/ingest/:id/reject
router.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { reason } = req.body;
    const result = await prisma.americanaDailyIngestion.updateMany({
      where: { id: req.params.id, tenantId, status: "PENDING_REVIEW" },
      data: { status: "REJECTED", rejectedReason: reason || null },
    });
    if (result.count === 0) { res.status(404).json({ error: "Ingestion not found or not pending" }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
