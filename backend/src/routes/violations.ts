import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { parseLocalDate, parseLocalDateEnd } from "../utils/date";
import { createViolationNotifications, getViolationSeverity } from "../services/notificationService";
import { ViolationType, ViolationStatus, AppealStatus } from "../generated/prisma";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET / - List violations with filters, paginated
router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { violationType, violationStatus, appealStatus, driverId, platform, dateFrom, dateTo, search } = req.query;

    const where: any = { tenantId };
    if (violationType) where.violationType = violationType as string;
    if (violationStatus) where.violationStatus = violationStatus as string;
    if (appealStatus) where.appealStatus = appealStatus as string;
    if (driverId) where.driverId = driverId as string;
    if (platform) where.platform = platform as string;
    if (search) where.driver = { name: { contains: search as string, mode: "insensitive" } };
    if (dateFrom || dateTo) {
      where.violationTime = {};
      if (dateFrom) where.violationTime.gte = parseLocalDate(dateFrom as string);
      if (dateTo) where.violationTime.lte = parseLocalDateEnd(dateTo as string);
    }

    const [data, total] = await Promise.all([
      prisma.violation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { violationTime: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true, vehicleType: true, platformDriverId: true } },
        },
      }),
      prisma.violation.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /summary - Aggregate counts by type, status, appeal status
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { platform } = req.query;
    const summaryWhere: any = { tenantId };
    if (platform) summaryWhere.platform = platform as string;

    const [byType, byStatus, pendingAppeals, total] = await Promise.all([
      prisma.violation.groupBy({
        by: ["violationType"],
        where: summaryWhere,
        _count: { id: true },
      }),
      prisma.violation.groupBy({
        by: ["violationStatus"],
        where: summaryWhere,
        _count: { id: true },
      }),
      prisma.violation.count({ where: { ...summaryWhere, appealStatus: "PENDING" } }),
      prisma.violation.count({ where: summaryWhere }),
    ]);

    res.json({
      total,
      byType: byType.map((t) => ({ type: t.violationType, count: t._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.violationStatus, count: s._count.id })),
      pendingAppeals,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id - Single violation with penalties and appeals
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const violation = await prisma.violation.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        driver: { select: { id: true, name: true, platform: true, vehicleType: true, platformDriverId: true, phone: true } },
        penalties: true,
        appeals: { orderBy: { appealedAt: "desc" } },
      },
    });
    if (!violation) { res.status(404).json({ error: "Violation not found" }); return; }
    res.json(violation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST / - Create violation (manual or automated)
router.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, platform, violationType, violationTime, details, metadata, taskId } = req.body;

    const violation = await prisma.violation.create({
      data: {
        tenantId,
        driverId,
        platform,
        violationType,
        violationTime: new Date(violationTime),
        details,
        metadata,
        taskId,
      },
      include: { driver: { select: { id: true, name: true } } },
    });

    // Fire notifications
    await createViolationNotifications({
      tenantId,
      eventType: violationType,
      severity: getViolationSeverity(violationType),
      title: violationType.replace(/_/g, " "),
      message: details || violationType,
      sourceId: violation.id,
      metadata: { driverName: (violation as any).driver?.name },
    });

    res.status(201).json(violation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id - Update violation status
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { violationStatus } = req.body;

    const result = await prisma.violation.updateMany({
      where: { id: req.params.id, tenantId },
      data: { violationStatus },
    });
    if (result.count === 0) { res.status(404).json({ error: "Violation not found" }); return; }

    const updated = await prisma.violation.findUnique({
      where: { id: req.params.id },
      include: { driver: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /:id/appeal - Submit an appeal for a violation
router.post("/:id/appeal", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const violationId = req.params.id;
    const { channel, reason } = req.body;

    // Verify the violation belongs to this tenant
    const violation = await prisma.violation.findFirst({
      where: { id: violationId, tenantId },
    });
    if (!violation) { res.status(404).json({ error: "Violation not found" }); return; }

    const [appeal] = await Promise.all([
      prisma.appeal.create({
        data: { tenantId, violationId, channel, reason },
      }),
      prisma.violation.update({
        where: { id: violationId },
        data: { appealStatus: "PENDING" },
      }),
    ]);

    res.status(201).json(appeal);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id/appeal/:appealId - Review an appeal (approve/reject)
router.put("/:id/appeal/:appealId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: violationId, appealId } = req.params;
    const { appealStatus, rejectionNote } = req.body;

    if (!["APPROVED", "REJECTED"].includes(appealStatus)) {
      res.status(400).json({ error: "appealStatus must be APPROVED or REJECTED" });
      return;
    }

    // Verify appeal belongs to this tenant's violation
    const appeal = await prisma.appeal.findFirst({
      where: { id: appealId, violationId, tenant: { id: tenantId } },
    });
    if (!appeal) { res.status(404).json({ error: "Appeal not found" }); return; }

    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        appealStatus,
        rejectionNote: appealStatus === "REJECTED" ? rejectionNote : null,
        reviewedAt: new Date(),
        reviewedBy: req.user!.userId,
      },
    });

    // Update the violation's appeal status accordingly
    await prisma.violation.update({
      where: { id: violationId },
      data: {
        appealStatus,
        ...(appealStatus === "APPROVED" ? { violationStatus: "OVERTURNED" as ViolationStatus } : {}),
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
