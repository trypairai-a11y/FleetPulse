import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { upload } from "../utils/upload";
import { parsePendingDuesXlsx } from "../services/xlsxParser";
import XLSX from "xlsx";
import fs from "fs";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { driverId, status, dateFrom, dateTo } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.cashRecord.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),
      prisma.cashRecord.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ledger", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { driverId, month, status } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (month) {
      // Match by month range to handle timezone offsets
      const monthStr = month as string; // "2026-03" or "2026-03-01"
      const parts = monthStr.split("-");
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const startOfMonth = new Date(y, m, 1);
      startOfMonth.setDate(startOfMonth.getDate() - 1); // buffer for timezone
      const endOfMonth = new Date(y, m + 1, 1);
      endOfMonth.setDate(endOfMonth.getDate() + 1); // buffer for timezone
      where.month = { gte: startOfMonth, lt: endOfMonth };
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.pendingDuesLedger.findMany({
        where, skip, take: limit,
        include: { driver: { select: { id: true, name: true, platform: true, platformDriverId: true, status: true } } },
      }),
      prisma.pendingDuesLedger.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/deposit", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { riderId, amount, method, note, platform } = req.body;

    if (!riderId || !amount) {
      res.status(400).json({ error: "riderId and amount are required" });
      return;
    }

    const driver = await prisma.driver.findFirst({
      where: { tenantId, platformDriverId: riderId },
    });

    if (!driver) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }

    const depositMethod = method === "BANK_TRANSFER" ? "BANK_TRANSFER"
      : method === "AL_MUZAINI" ? "AL_MUZAINI"
      : "CASH";

    const record = await prisma.cashRecord.create({
      data: {
        tenantId,
        driverId: driver.id,
        date: new Date(),
        salesAmount: 0,
        collectionAmount: parseFloat(amount),
        depositMethod: depositMethod as any,
        pendingDues: 0,
        status: "SETTLED",
        notes: note || null,
      },
    });

    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/ledger/export", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { month } = req.query;
    const where: any = { tenantId };
    if (month) where.month = new Date(month as string);

    const ledgers = await prisma.pendingDuesLedger.findMany({
      where,
      include: { driver: { select: { name: true, platformDriverId: true, platform: true } } },
    });

    const rows = ledgers.map((l) => ({
      "Rider ID": l.driver.platformDriverId || "",
      "Rider Name": l.driver.name,
      "Platform": l.driver.platform,
      "Opening Balance": Number(l.openingBalance),
      "Total Sales": Number(l.totalSales),
      "Total Collection": Number(l.totalCollection),
      "Cash / Al Muzaini": Number(l.cashDeposits),
      "Bank Transfer": Number(l.bankTransfers),
      "Incentives": Number(l.incentives),
      "Adjustments": Number(l.adjustments),
      "Closing Balance": Number(l.closingBalance),
      "Status": l.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending Dues");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=pending-dues-ledger.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cash Transactions (granular per-order log) ────────────────
// NOTE: These must be above /:id to prevent Express matching "transactions" as an id

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { driverId, dateFrom, dateTo, type } = req.query;
    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      prisma.cashTransaction.findMany({
        where, skip, take: limit,
        orderBy: { date: "desc" },
        include: { driver: { select: { id: true, name: true, platformDriverId: true } } },
      }),
      prisma.cashTransaction.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transactions/daily-summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, dateFrom, dateTo } = req.query;
    if (!driverId) { res.status(400).json({ error: "driverId is required" }); return; }

    const where: any = { tenantId, driverId: driverId as string };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const transactions = await prisma.cashTransaction.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Group by date
    const grouped: Record<string, { date: string; totalCash: number; transactions: any[] }> = {};
    for (const tx of transactions) {
      const dateKey = tx.date.toISOString().split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, totalCash: 0, transactions: [] };
      }
      grouped[dateKey].transactions.push(tx);
      if (tx.type === "COLLECTION") {
        grouped[dateKey].totalCash += Number(tx.amount);
      } else {
        grouped[dateKey].totalCash -= Number(tx.amount);
      }
    }

    const days = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    res.json({ data: days });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.cashRecord.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { driver: true },
    });
    if (!record) { res.status(404).json({ error: "Cash record not found" }); return; }
    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const record = await prisma.cashRecord.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const record = await prisma.cashRecord.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (record.count === 0) { res.status(404).json({ error: "Cash record not found" }); return; }
    const updated = await prisma.cashRecord.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.cashRecord.deleteMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    res.json({ message: "Cash record deleted" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Import pending dues ledger XLSX (shared handler for both route aliases)
async function handleLedgerImport(req: Request, res: Response) {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const tenantId = req.user!.tenantId;
    const { month } = req.body;
    const monthDate = month ? new Date(month as string) : new Date();
    monthDate.setDate(1);
    monthDate.setHours(0, 0, 0, 0);

    const buffer = fs.readFileSync(req.file.path);
    const rows = parsePendingDuesXlsx(buffer);

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        if (!row.riderId) {
          errors.push(`Row missing riderId: ${row.riderName || "unknown"}`);
          continue;
        }

        const driver = await prisma.driver.findFirst({
          where: {
            tenantId,
            platformDriverId: row.riderId,
            platform: "TALABAT",
          },
        });

        if (!driver) {
          errors.push(`Driver not found: ${row.riderId} (${row.riderName || "unknown"})`);
          continue;
        }

        // Each month starts fresh — opening balance is always 0
        const openingBalance = 0;
        const closingBalance = openingBalance
          + (row.totalSales || 0)
          - (row.totalCollection || 0)
          - (row.cashAlMuzaini || 0)
          - (row.bankTransfer || 0)
          - (row.incentives || 0)
          - (row.adjustments || 0);

        await prisma.pendingDuesLedger.upsert({
          where: {
            tenantId_driverId_month: {
              tenantId,
              driverId: driver.id,
              month: monthDate,
            },
          },
          create: {
            tenantId,
            driverId: driver.id,
            month: monthDate,
            openingBalance,
            totalSales: row.totalSales || 0,
            totalCollection: row.totalCollection || 0,
            cashDeposits: row.cashAlMuzaini || 0,
            bankTransfers: row.bankTransfer || 0,
            incentives: row.incentives || 0,
            adjustments: row.adjustments || 0,
            closingBalance,
            dailySales: row.dailyData || {},
            dailyCollections: {},
          },
          update: {
            openingBalance,
            totalSales: row.totalSales || 0,
            totalCollection: row.totalCollection || 0,
            cashDeposits: row.cashAlMuzaini || 0,
            bankTransfers: row.bankTransfer || 0,
            incentives: row.incentives || 0,
            adjustments: row.adjustments || 0,
            closingBalance,
            dailySales: row.dailyData || {},
          },
        });

        imported++;
      } catch (rowErr: any) {
        errors.push(`Error processing ${row.riderId}: ${rowErr.message}`);
      }
    }

    res.json({ imported, errors });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

router.post("/import-ledger", upload.single("file"), handleLedgerImport);
// Alias used by frontend
router.post("/ledger/import", upload.single("file"), handleLedgerImport);

// Upload deposit receipt
router.post("/deposit-receipt", upload.single("receipt"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const { cashRecordId } = req.body;
    if (cashRecordId) {
      await prisma.cashRecord.update({
        where: { id: cashRecordId },
        data: { depositReceiptUrl: `/uploads/${req.file.filename}` },
      });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Ledger update - update daily sales/collections
router.put("/ledger/:id", async (req: Request, res: Response) => {
  try {
    const ledger = await prisma.pendingDuesLedger.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!ledger) { res.status(404).json({ error: "Ledger not found" }); return; }

    const updated = await prisma.pendingDuesLedger.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, date, type, amount, orderNumber, description } = req.body;

    if (!driverId || !type || amount == null) {
      res.status(400).json({ error: "driverId, type, and amount are required" });
      return;
    }

    // Calculate running balance from latest transaction
    const lastTx = await prisma.cashTransaction.findFirst({
      where: { tenantId, driverId },
      orderBy: { date: "desc" },
    });
    const prevBalance = lastTx ? Number(lastTx.runningBalance) : 0;
    const txAmount = Number(amount);
    const runningBalance = type === "COLLECTION"
      ? prevBalance + txAmount
      : prevBalance - txAmount;

    const tx = await prisma.cashTransaction.create({
      data: {
        tenantId,
        driverId,
        date: date ? new Date(date) : new Date(),
        type,
        amount: txAmount,
        orderNumber: orderNumber || null,
        description: description || null,
        runningBalance,
      },
    });
    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/transactions/bulk", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, transactions: txList } = req.body;

    if (!driverId || !Array.isArray(txList) || txList.length === 0) {
      res.status(400).json({ error: "driverId and transactions array are required" });
      return;
    }

    const lastTx = await prisma.cashTransaction.findFirst({
      where: { tenantId, driverId },
      orderBy: { date: "desc" },
    });
    let balance = lastTx ? Number(lastTx.runningBalance) : 0;

    const created = [];
    for (const item of txList) {
      const txAmount = Number(item.amount);
      balance = item.type === "COLLECTION" ? balance + txAmount : balance - txAmount;

      const tx = await prisma.cashTransaction.create({
        data: {
          tenantId,
          driverId,
          date: item.date ? new Date(item.date) : new Date(),
          type: item.type,
          amount: txAmount,
          orderNumber: item.orderNumber || null,
          description: item.description || null,
          runningBalance: balance,
        },
      });
      created.push(tx);
    }
    res.status(201).json({ created: created.length, data: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
