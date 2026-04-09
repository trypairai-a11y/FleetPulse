import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

const OFF_DAYS_PER_MONTH = 2;

/**
 * Ensure the driver's monthly off-day counter is reset if we're in a new calendar month.
 * Returns the current used count after any reset.
 */
async function getOrResetOffDays(
  driverId: string,
  now: Date
): Promise<number> {
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const driver = await prisma.driver.findUniqueOrThrow({ where: { id: driverId } });

  if (driver.offDaysResetMonth !== monthKey) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { monthlyOffDaysUsed: 0, offDaysResetMonth: monthKey },
    });
    return 0;
  }
  return driver.monthlyOffDaysUsed;
}

/**
 * Auto-generate attendance records for each day in the restriction range.
 * Days consume the monthly off-day pool first; excess days become DEDUCTION.
 */
async function processRestriction(restrictionId: string) {
  const restriction = await prisma.driverRestriction.findUniqueOrThrow({
    where: { id: restrictionId },
    include: { driver: true },
  });

  const { driverId, tenantId, startDate, endDate, type } = restriction;

  // For permanent restrictions with no end date, process only startDate day
  const end = endDate ?? startDate;

  const days: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Process day by day — each day may belong to a different calendar month
  for (const day of days) {
    const offDaysUsed = await getOrResetOffDays(driverId, day);
    const remaining = OFF_DAYS_PER_MONTH - offDaysUsed;
    const status = remaining > 0 ? "OFF" : "DEDUCTION";

    // Upsert attendance record (don't overwrite PRESENT/LATE records from actual shifts)
    const existing = await prisma.attendanceRecord.findFirst({
      where: { tenantId, driverId, date: day },
    });

    if (!existing) {
      await prisma.attendanceRecord.create({
        data: {
          tenantId,
          driverId,
          date: day,
          status: status as any,
          source: "restriction",
        },
      });
    }

    if (status === "OFF") {
      await prisma.driver.update({
        where: { id: driverId },
        data: { monthlyOffDaysUsed: { increment: 1 } },
      });
    }
  }

  await prisma.driverRestriction.update({
    where: { id: restrictionId },
    data: { processedAt: new Date() },
  });
}

// GET /driver-restrictions?driverId=&tenantId=
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId } = req.query;

    const where: any = { tenantId };
    if (driverId) where.driverId = driverId;

    const restrictions = await prisma.driverRestriction.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: { driver: { select: { id: true, name: true, platform: true } } },
    });

    res.json(restrictions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /driver-restrictions
router.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { driverId, type, startDate, endDate, reason } = req.body;

    if (!driverId || !type || !startDate) {
      return res.status(400).json({ error: "driverId, type, and startDate are required" });
    }

    const isPermanent = type === "PERMANENT";

    const restriction = await prisma.driverRestriction.create({
      data: {
        tenantId,
        driverId,
        type,
        startDate: new Date(startDate),
        endDate: isPermanent ? null : endDate ? new Date(endDate) : null,
        reason: reason ?? null,
      },
    });

    // Update driver status
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        status: isPermanent ? "RESTRICTED_PERMANENTLY" : "RESTRICTED",
      },
    });

    // Auto-generate attendance records
    await processRestriction(restriction.id);

    const updated = await prisma.driverRestriction.findUnique({
      where: { id: restriction.id },
    });

    res.status(201).json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /driver-restrictions/:id — lift a restriction
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const restriction = await prisma.driverRestriction.findFirst({
      where: { id, tenantId },
    });
    if (!restriction) return res.status(404).json({ error: "Not found" });

    await prisma.driverRestriction.delete({ where: { id } });

    // Restore driver to ACTIVE if no other active restrictions remain
    const remaining = await prisma.driverRestriction.count({
      where: { driverId: restriction.driverId, tenantId },
    });
    if (remaining === 0) {
      await prisma.driver.update({
        where: { id: restriction.driverId },
        data: { status: "ACTIVE" },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
