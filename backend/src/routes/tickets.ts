import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { getPagination, paginatedResponse } from "../utils/pagination";

const router = Router();
router.use(authMiddleware, tenantScope);

const SLA_HOURS: Record<string, number> = {
  URGENT: 4,
  HIGH: 12,
  MEDIUM: 48,
  LOW: 168,
};

router.get("/", async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { status, priority, category, platform, assignedToId, sort } = req.query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (platform) where.platform = platform;
    if (assignedToId) where.assignedToId = assignedToId;

    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    if (sort === "priority") orderBy = [{ priority: "desc" }, { createdAt: "desc" }];
    if (sort === "sla") orderBy = { slaDeadline: "asc" };

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where, skip, take: limit,
        orderBy,
        include: {
          driver: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        driver: true,
        assignedTo: true,
        company: true,
        vehicle: true,
        submitterDriver: { select: { id: true, name: true } },
        submitterUser: { select: { id: true, name: true } },
      },
    });
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const lastTicket = await prisma.ticket.findFirst({
      where: { tenantId },
      orderBy: { ticketNumber: "desc" },
    });
    const nextNum = lastTicket
      ? parseInt(lastTicket.ticketNumber.replace("TK-", "")) + 1
      : 1;
    const ticketNumber = `TK-${String(nextNum).padStart(4, "0")}`;

    const slaHours = SLA_HOURS[req.body.priority || "MEDIUM"];
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await prisma.ticket.create({
      data: {
        ...req.body,
        tenantId,
        ticketNumber,
        slaDeadline,
      },
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.ticket.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: req.body,
    });
    if (ticket.count === 0) { res.status(404).json({ error: "Ticket not found" }); return; }
    const updated = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/assign", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.ticket.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: { assignedToId: req.body.assignedToId, status: "ASSIGNED" },
    });
    if (ticket.count === 0) { res.status(404).json({ error: "Ticket not found" }); return; }
    res.json({ message: "Ticket assigned" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.ticket.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: {
        status: "RESOLVED",
        resolution: req.body.resolution,
        resolvedAt: new Date(),
      },
    });
    if (ticket.count === 0) { res.status(404).json({ error: "Ticket not found" }); return; }
    res.json({ message: "Ticket resolved" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
