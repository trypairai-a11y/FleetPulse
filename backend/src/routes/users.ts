import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { rbac } from "../middleware/rbac";
import { getPagination, paginatedResponse } from "../utils/pagination";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authMiddleware, tenantScope);

// ─── List Users ─────────────────────────────────────────────────────────────

router.get("/", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
  try {
    const { skip, limit, page } = getPagination(req);
    const tenantId = req.user!.tenantId;
    const { role, search, isActive } = req.query;

    const where: any = { tenantId };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, name: true, phone: true,
          role: true, isActive: true, lastLoginAt: true, createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Single User ────────────────────────────────────────────────────────

router.get("/:id", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Invite (Create) User ───────────────────────────────────────────────────

router.post("/", rbac("ADMIN"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { email, name, phone, role, password } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: "email, name, and password are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ error: "Email already in use" }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone: phone || null,
        role: role || "VIEWER",
        passwordHash,
        tenantId,
      },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, isActive: true, createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Update User (role, name, phone) ────────────────────────────────────────

router.put("/:id", rbac("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { name, phone, role } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;

    const result = await prisma.user.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      data: updateData,
    });
    if (result.count === 0) { res.status(404).json({ error: "User not found" }); return; }

    const updated = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, isActive: true, createdAt: true,
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Toggle Active Status ───────────────────────────────────────────────────

router.put("/:id/toggle-active", rbac("ADMIN"), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Prevent deactivating yourself
    if (user.id === req.user!.userId) {
      res.status(400).json({ error: "Cannot deactivate yourself" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, isActive: true, createdAt: true,
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
