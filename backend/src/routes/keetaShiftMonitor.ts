import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";
import { rbac } from "../middleware/rbac";

const router = Router();
router.use(authMiddleware, tenantScope);

router.get("/rollup", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const dateParam = req.query.date ? new Date(req.query.date as string) : new Date();
    const start = new Date(dateParam); start.setHours(0, 0, 0, 0);
    const end = new Date(dateParam); end.setHours(23, 59, 59, 999);

    const config = await prisma.shiftComplianceConfig.findUnique({ where: { tenantId } });
    const underHours = config?.underShiftHours ?? 10;

    const shifts = await prisma.shift.findMany({
      where: { tenantId, date: { gte: start, lte: end }, platform: "KEETA" },
      include: { driver: { select: { id: true, name: true, companyId: true, company: { select: { name: true } } } } },
    });

    // Group by driver; sum scheduled hours
    const perDriver = new Map<string, { driverId: string; name: string; companyId: string; branch: string; hours: number; registered: boolean; }>();
    for (const s of shifts) {
      const hoursMin = s.plannedHoursMinutes
        ?? Math.round((s.scheduledEnd.getTime() - s.scheduledStart.getTime()) / 60000);
      const existing = perDriver.get(s.driverId);
      if (existing) existing.hours += hoursMin / 60;
      else perDriver.set(s.driverId, {
        driverId: s.driverId,
        name: s.driver.name,
        companyId: s.driver.companyId,
        branch: s.driver.company.name,
        hours: hoursMin / 60,
        registered: true,
      });
    }

    const perBranch = new Map<string, any>();
    for (const d of perDriver.values()) {
      let b = perBranch.get(d.companyId);
      if (!b) {
        b = { branchId: d.companyId, branchName: d.branch, totalRegistered: 0, scheduled: 0, notOnShift: 0, scheduledGte10h: 0 };
        perBranch.set(d.companyId, b);
      }
      b.totalRegistered += 1;
      b.scheduled += 1;
      if (d.hours >= underHours) b.scheduledGte10h += 1;
    }

    const underShiftDrivers = Array.from(perDriver.values())
      .filter((d) => d.hours < underHours)
      .map((d) => ({ driverId: d.driverId, name: d.name, branch: d.branch, hours: Number(d.hours.toFixed(2)) }));

    res.json({
      date: dateParam.toISOString().slice(0, 10),
      threshold: underHours,
      perBranch: Array.from(perBranch.values()),
      underShift: underShiftDrivers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/config", async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const config = await prisma.shiftComplianceConfig.findUnique({ where: { tenantId } });
  res.json(config ?? { tenantId, underShiftHours: 10, evaluateCron: "0 6 * * *" });
});

router.put("/config", rbac("ADMIN", "OPS_MANAGER"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { underShiftHours, evaluateCron } = req.body || {};
  const data: any = {};
  if (typeof underShiftHours === "number") data.underShiftHours = underShiftHours;
  if (typeof evaluateCron === "string") data.evaluateCron = evaluateCron;
  const config = await prisma.shiftComplianceConfig.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, ...data },
  });
  res.json(config);
});

export default router;
