import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { status, driverId, platform } = req.query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;
    if (platform) where.driver = { platform: platform as string };

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          driver: { select: { id: true, name: true, platform: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const record = await prisma.leaveRequest.create({
      data: { ...req.body, tenantId: req.user!.tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/approve", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!leave) { res.status(404).json({ error: "Leave request not found" }); return; }

    await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: {
        status: "APPROVED",
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: req.body.reviewNotes,
      },
    });

    // Auto-create EXCUSED attendance records for the leave dates
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const records = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      records.push({
        tenantId,
        driverId: leave.driverId,
        date: new Date(d),
        status: "EXCUSED" as const,
        source: "leave_request",
      });
    }
    if (records.length > 0) {
      await prisma.attendanceRecord.createMany({ data: records });
    }

    res.json({ message: "Leave approved" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/reject", async (req: Request, res: Response) => {
  try {
    const leave = await prisma.leaveRequest.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: {
        status: "REJECTED",
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: req.body.reviewNotes,
      },
    });
    if (leave.count === 0) { res.status(404).json({ error: "Leave request not found" }); return; }
    res.json({ message: "Leave rejected" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
