import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";
import { validateBody, createLeaveRequestSchema } from "../utils/validate";
import { rbac } from "../middleware/rbac";
import { validatePersonalLeave, createLeaveAttendanceRecords, removeLeaveAttendanceRecords } from "../services/leaveService";

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

    if (type === "PERSONAL" && driverId) {
      const validation = await validatePersonalLeave(tenantId, driverId, startDate, endDate);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }
    }

    const record = await prisma.leaveRequest.create({
      data: { ...req.body, tenantId },
    });
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/approve", rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR"), async (req: Request, res: Response) => {
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

    await createLeaveAttendanceRecords(tenantId, leave.driverId, leave.startDate, leave.endDate);
    res.json({ message: "Leave approved" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/reject", rbac("ADMIN", "OPS_MANAGER", "SUPERVISOR"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const leave = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!leave) { res.status(404).json({ error: "Leave request not found" }); return; }

    await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: {
        status: "REJECTED",
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: req.body.reviewNotes,
      },
    });

    await removeLeaveAttendanceRecords(tenantId, leave.driverId, leave.startDate, leave.endDate);
    res.json({ message: "Leave rejected" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
