import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { upload } from "../utils/upload";
import { parseLocalDate } from "../utils/date";
import { enqueueContractOcr } from "../queues/americanaContractOcrWorker";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET /api/americana/contracts
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const contracts = await prisma.americanaContract.findMany({
      where: { tenantId },
      orderBy: { signedDate: "desc" },
      include: { rates: true },
    });
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/americana/contracts/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const contract = await prisma.americanaContract.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        rates: { include: { chain: { select: { id: true, name: true } } } },
      },
    });
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }
    res.json(contract);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/americana/contracts/upload  (multipart: file=PDF)
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const tenantId = req.user!.tenantId;
    const { contractRef, signedDate, effectiveFrom, effectiveTo, notes } = req.body;
    if (!contractRef || !signedDate || !effectiveFrom) {
      res.status(400).json({ error: "contractRef, signedDate, effectiveFrom required" });
      return;
    }
    const contract = await prisma.americanaContract.create({
      data: {
        tenantId,
        contractRef,
        signedDate: parseLocalDate(signedDate),
        effectiveFrom: parseLocalDate(effectiveFrom),
        effectiveTo: effectiveTo ? parseLocalDate(effectiveTo) : null,
        originalFileUrl: `/uploads/${req.file.filename}`,
        ocrStatus: "PENDING",
        notes: notes || null,
      },
    });
    // fire-and-forget OCR enqueue (no-op when API key is missing)
    enqueueContractOcr(contract.id).catch(() => {});
    res.status(201).json(contract);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/americana/contracts/:id/save-rates
// Accepts: { rates: [{ chainId, vehicleType, ratePerOrder }] }
router.post("/:id/save-rates", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const contract = await prisma.americanaContract.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }
    const { rates } = req.body;
    if (!Array.isArray(rates)) {
      res.status(400).json({ error: "rates array required" });
      return;
    }
    const created = await prisma.$transaction(
      rates.map((r: any) =>
        prisma.americanaChainRate.create({
          data: {
            tenantId,
            chainId: r.chainId,
            vehicleType: r.vehicleType,
            ratePerOrder: r.ratePerOrder,
            effectiveFrom: contract.effectiveFrom,
            effectiveTo: contract.effectiveTo,
            contractId: contract.id,
            createdBy: req.user!.userId,
          },
        })
      )
    );
    res.status(201).json({ count: created.length, rates: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/americana/contracts/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const data: any = { ...req.body };
    if (data.signedDate) data.signedDate = parseLocalDate(data.signedDate);
    if (data.effectiveFrom) data.effectiveFrom = parseLocalDate(data.effectiveFrom);
    if (data.effectiveTo !== undefined) data.effectiveTo = data.effectiveTo ? parseLocalDate(data.effectiveTo) : null;
    const result = await prisma.americanaContract.updateMany({
      where: { id: req.params.id, tenantId },
      data,
    });
    if (result.count === 0) { res.status(404).json({ error: "Contract not found" }); return; }
    const updated = await prisma.americanaContract.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
