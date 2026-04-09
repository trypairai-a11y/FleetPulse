import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { validateBody, createLeaveRequestSchema } from "../utils/validate";
import { isKuwaitWeekend, getDayOfWeekInTz } from "../utils/timezone";

const router = Router();
router.use(authMiddleware, tenantScope);

/**
 * @swagger
 * /api/leave-requests:
 *   get:
 *     tags: [Leave Requests]
 *     summary: List leave requests with optional filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *       - in: query
 *         name: driverId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [TALABAT, KEETA, DELIVEROO, AMERICANA] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated leave request list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *   post:
 *     tags: [Leave Requests]
 *     summary: Submit a leave request for a driver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId, startDate, endDate, type]
 *             properties:
 *               driverId: { type: string, format: uuid }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               type: { type: string, enum: [ANNUAL, SICK, UNPAID, EMERGENCY, HAJJ] }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Leave request created with PENDING status
 *       422:
 *         description: Validation error
 */
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

router.post("/", validateBody(createLeaveRequestSchema), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, startDate, endDate, type } = req.body;

    // ── Day-off validation rules ──────────────────────────────────────────────
    if (type === "PERSONAL") {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      // Rule 1: Must be submitted at least 7 days before the first off day
      const daysUntilStart = Math.floor((start.getTime() - now.getTime()) / 86400000);
      if (daysUntilStart < 7) {
        res.status(400).json({ error: "Day-off requests must be submitted at least 1 week in advance." });
        return;
      }

      // Rule 2: Cannot apply for off on weekends (Thu/Fri/Sat in Kuwait timezone)
      const weekendDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const invalidDays: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (isKuwaitWeekend(d)) {
          invalidDays.push(weekendDayNames[getDayOfWeekInTz(d)]);
        }
      }
      if (invalidDays.length > 0) {
        res.status(400).json({ error: `Day-off cannot be on weekends (Thu/Fri/Sat). Invalid days: ${invalidDays.join(", ")}.` });
        return;
      }

      // Rule 3: Max 2 personal day-offs per calendar month
      if (driverId) {
        const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
        const usedLeaves = await prisma.leaveRequest.count({
          where: {
            tenantId,
            driverId,
            type: "PERSONAL",
            status: { in: ["PENDING", "APPROVED"] },
            startDate: { gte: monthStart, lte: monthEnd },
          },
        });
        if (usedLeaves >= 2) {
          res.status(400).json({ error: "Monthly day-off quota reached (max 2 per month)." });
          return;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const record = await prisma.leaveRequest.create({
      data: { ...req.body, tenantId },
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
    const tenantId = req.user!.tenantId;

    // Fetch the leave before updating so we know the date range and driver
    const leaveRecord = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!leaveRecord) { res.status(404).json({ error: "Leave request not found" }); return; }

    await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: {
        status: "REJECTED",
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: req.body.reviewNotes,
      },
    });

    // Delete EXCUSED attendance records that were created when this leave was approved
    const start = new Date(leaveRecord.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(leaveRecord.endDate);
    end.setHours(23, 59, 59, 999);

    await prisma.attendanceRecord.deleteMany({
      where: {
        tenantId,
        driverId: leaveRecord.driverId,
        status: "EXCUSED",
        source: "leave_request",
        date: { gte: start, lte: end },
      },
    });

    res.json({ message: "Leave rejected" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
