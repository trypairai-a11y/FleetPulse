import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

// GET /api/supervisors?platform=X
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = (req.query.platform as string)?.toUpperCase();

    // Get all users with SUPERVISOR role
    const supervisors = await prisma.user.findMany({
      where: { tenantId, role: "SUPERVISOR", isActive: true },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
    });

    // Count supervised drivers per supervisor (filter by platform if provided)
    const results = await Promise.all(supervisors.map(async (sup) => {
      const driverWhere: any = { tenantId, supervisorId: sup.id };
      if (platform) driverWhere.platform = platform;
      const driversCount = await prisma.driver.count({ where: driverWhere });
      return { ...sup, driversCount };
    }));

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supervisors/bonuses?platform=X&month=4&year=2026
router.get("/bonuses", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const platform = (req.query.platform as string)?.toUpperCase() || "TALABAT";
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Get supervisor targets config
    const settings = await prisma.platformSettings.findUnique({
      where: { tenantId_platform: { tenantId, platform: platform as any } },
      select: { supervisorTargets: true },
    });

    const config: any = settings?.supervisorTargets || {
      enabled: true,
      metric: "darbGradeAvg",
      minDriversRequired: 3,
      tiers: [
        { label: "Bronze", minScore: 60, bonusKD: 50 },
        { label: "Silver", minScore: 75, bonusKD: 100 },
        { label: "Gold", minScore: 90, bonusKD: 200 },
      ],
    };

    if (!config.enabled) {
      return res.json({ enabled: false, config, data: [] });
    }

    // Date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get supervisors with their job grade
    const supervisors = await prisma.user.findMany({
      where: { tenantId, role: "SUPERVISOR", isActive: true },
      select: { id: true, name: true, email: true, jobGrade: true },
      orderBy: { name: "asc" },
    });

    const results = await Promise.all(supervisors.map(async (sup) => {
      // Get supervised drivers for this platform
      const drivers = await prisma.driver.findMany({
        where: { tenantId, supervisorId: sup.id, platform: platform as any, status: "ACTIVE" },
        select: { id: true, name: true },
      });

      if (drivers.length < (config.minDriversRequired || 1)) {
        return {
          supervisor: { id: sup.id, name: sup.name, email: sup.email },
          driversCount: drivers.length,
          teamScore: null,
          tier: null,
          bonusKD: 0,
          qualified: false,
          reason: `Minimum ${config.minDriversRequired} drivers required`,
        };
      }

      const driverIds = drivers.map((d) => d.id);
      let teamScore = 0;

      if (config.metric === "darbGradeAvg") {
        // Use latest AiScore per driver in the month
        const scores = await prisma.aiScore.findMany({
          where: {
            driverId: { in: driverIds },
            date: { gte: startDate, lte: endDate },
          },
          select: { driverId: true, compositeScore: true, date: true },
          orderBy: { date: "desc" },
        });
        // Take latest score per driver
        const byDriver = new Map<string, number>();
        for (const s of scores) {
          if (!byDriver.has(s.driverId)) byDriver.set(s.driverId, s.compositeScore);
        }
        const values = [...byDriver.values()];
        teamScore = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      } else if (config.metric === "attendanceRate") {
        const shifts = await prisma.shift.findMany({
          where: {
            driverId: { in: driverIds },
            date: { gte: startDate, lte: endDate },
          },
          select: { status: true },
        });
        const completed = shifts.filter((s) => s.status === "COMPLETED").length;
        teamScore = shifts.length > 0 ? (completed / shifts.length) * 100 : 0;
      }

      const roundedScore = Math.round(teamScore * 10) / 10;

      // Apply size adjustment — larger teams get a bonus added to their score before tier matching
      const sizeAdjustments: any[] = config.sizeAdjustments || [];
      const bracket = sizeAdjustments
        .filter((a: any) => drivers.length >= a.minDrivers && drivers.length <= (a.maxDrivers ?? Infinity))
        .sort((a: any, b: any) => b.minDrivers - a.minDrivers)[0] || null;
      const scoreAdjustment = bracket?.scoreAdjustment || 0;
      const adjustedScore = Math.min(Math.round((roundedScore + scoreAdjustment) * 10) / 10, 100);

      // Resolve tiers based on supervisor's job grade
      const gradeConfig = (config.grades || []).find((g: any) => g.label === sup.jobGrade);
      const activeTiers = gradeConfig?.tiers || config.tiers || [];
      const sortedTiers = [...activeTiers].sort((a: any, b: any) => b.minScore - a.minScore);
      const matchedTier = sortedTiers.find((t: any) => adjustedScore >= t.minScore) || null;

      return {
        supervisor: { id: sup.id, name: sup.name, email: sup.email, jobGrade: sup.jobGrade },
        driversCount: drivers.length,
        teamScore: roundedScore,
        adjustedScore,
        scoreAdjustment,
        sizeLabel: bracket?.label || "Standard",
        tier: matchedTier?.label || null,
        bonusKD: matchedTier?.bonusKD || 0,
        qualified: !!matchedTier,
      };
    }));

    res.json({ enabled: true, config, data: results, month, year, platform });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
