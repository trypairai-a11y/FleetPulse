import { prisma } from "../config";
import { ScoreTrend } from "../generated/prisma";

// ─── Scoring weights ──────────────────────────────────────────────────────────

const WEIGHTS = {
  attendance: 0.25,
  delivery: 0.30,
  financial: 0.20,
  equipment: 0.10,
  platform: 0.15,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface DriverScoreBreakdown {
  driverId: string;
  compositeScore: number;
  attendanceScore: number;
  deliveryScore: number;
  financialScore: number;
  equipmentScore: number;
  platformScore: number;
  trend: ScoreTrend;
  breakdown: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function weightedAverage(scores: {
  attendance: number;
  delivery: number;
  financial: number;
  equipment: number;
  platform: number;
}): number {
  return clamp(
    scores.attendance * WEIGHTS.attendance +
      scores.delivery * WEIGHTS.delivery +
      scores.financial * WEIGHTS.financial +
      scores.equipment * WEIGHTS.equipment +
      scores.platform * WEIGHTS.platform
  );
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AiScoringService {
  /**
   * Calculate and persist scores for every active driver in a tenant.
   * Scores are stored in the AiScore table, one record per driver per day.
   */
  static async scoreAllDrivers(tenantId: string): Promise<DriverScoreBreakdown[]> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setUTCDate(todayStart.getUTCDate() - 7);

    const fourteenDaysAgo = new Date(todayStart);
    fourteenDaysAgo.setUTCDate(todayStart.getUTCDate() - 14);

    // ── Fetch active drivers ───────────────────────────────────────────────
    const activeDrivers = await prisma.driver.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, name: true, platform: true },
    });

    if (activeDrivers.length === 0) return [];

    const driverIds = activeDrivers.map((d) => d.id);

    // ── Batch-fetch all data needed for scoring ────────────────────────────

    // Shifts: last 14 days (for trend) + last 7 days (for current score)
    const allShifts = await prisma.shift.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: fourteenDaysAgo, lt: todayStart },
      },
      select: {
        driverId: true,
        date: true,
        status: true,
        scheduledStart: true,
        actualStart: true,
        plannedHoursMinutes: true,
        actualHoursMinutes: true,
        isValid: true,
      },
    });

    // Order logs: last 14 days
    const allOrderLogs = await prisma.orderLog.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: fourteenDaysAgo, lt: todayStart },
      },
      select: { driverId: true, date: true, orderCount: true, platform: true },
    });

    // Cash records: last 14 days
    const allCashRecords = await prisma.cashRecord.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: fourteenDaysAgo, lt: todayStart },
      },
      select: { driverId: true, date: true, status: true, salesAmount: true, collectionAmount: true },
    });

    // Vehicle inspections: last 14 days
    const allInspections = await prisma.vehicleInspection.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: fourteenDaysAgo, lt: todayStart },
      },
      select: { driverId: true, date: true, status: true },
    });

    // Compute tenant-wide platform average orders per day (7-day window)
    const platformOrderLogsRecent = allOrderLogs.filter(
      (o) => o.date >= sevenDaysAgo
    );
    const totalOrdersRecent = platformOrderLogsRecent.reduce(
      (s, o) => s + o.orderCount,
      0
    );
    const platformAvgOrdersPerDay =
      platformOrderLogsRecent.length > 0
        ? totalOrdersRecent / (driverIds.length * 7)
        : 10; // fallback default

    const results: DriverScoreBreakdown[] = [];

    for (const driver of activeDrivers) {
      // ── Filter to this driver ────────────────────────────────────────────
      const dShifts7 = allShifts.filter(
        (s) => s.driverId === driver.id && s.date >= sevenDaysAgo
      );
      const dShifts14 = allShifts.filter((s) => s.driverId === driver.id);

      const dOrders7 = allOrderLogs.filter(
        (o) => o.driverId === driver.id && o.date >= sevenDaysAgo
      );
      const dOrders14 = allOrderLogs.filter((o) => o.driverId === driver.id);

      const dCash7 = allCashRecords.filter(
        (c) => c.driverId === driver.id && c.date >= sevenDaysAgo
      );
      const dInspections7 = allInspections.filter(
        (i) => i.driverId === driver.id && i.date >= sevenDaysAgo
      );

      // ── Attendance Score (25%) ───────────────────────────────────────────
      // = (completionRate * 0.6 + onTimeRate * 0.4) * 100
      const totalShifts7 = dShifts7.length;
      const completedShifts7 = dShifts7.filter((s) => s.status === "COMPLETED").length;
      const onTimeShifts7 = dShifts7.filter((s) => {
        if (!s.actualStart || !s.scheduledStart) return false;
        const diffMinutes =
          (s.actualStart.getTime() - s.scheduledStart.getTime()) / 60000;
        return diffMinutes <= 10; // within 10 minutes = on time
      }).length;

      const completionRate = totalShifts7 > 0 ? completedShifts7 / totalShifts7 : 0;
      const onTimeRate = completedShifts7 > 0 ? onTimeShifts7 / completedShifts7 : 0;
      const attendanceScore = clamp((completionRate * 0.6 + onTimeRate * 0.4) * 100);

      // ── Delivery Score (30%) ─────────────────────────────────────────────
      // = min(actualAvgOrders / platformAvgOrders, 1.5) / 1.5 * 100
      const totalOrders7 = dOrders7.reduce((s, o) => s + o.orderCount, 0);
      const workingDays7 = new Set(dOrders7.map((o) => o.date.toISOString().split("T")[0])).size;
      const driverDailyAvg = workingDays7 > 0 ? totalOrders7 / workingDays7 : 0;
      const deliveryRatio = Math.min(
        driverDailyAvg / Math.max(platformAvgOrdersPerDay, 1),
        1.5
      );
      const deliveryScore = clamp((deliveryRatio / 1.5) * 100);

      // ── Financial Score (20%) ────────────────────────────────────────────
      // Based on cash deposit timeliness: % of records settled within 3 days
      const settledOnTime7 = dCash7.filter((c) => c.status === "SETTLED").length;
      const financialScore =
        dCash7.length > 0 ? clamp((settledOnTime7 / dCash7.length) * 100) : 100;

      // ── Equipment Score (10%) ────────────────────────────────────────────
      // Inspection pass rate
      const passedInspections = dInspections7.filter((i) => i.status === "PASS").length;
      const equipmentScore =
        dInspections7.length > 0
          ? clamp((passedInspections / dInspections7.length) * 100)
          : 100; // no inspections = neutral score

      // ── Platform Score (15%) ─────────────────────────────────────────────
      // Valid shift rate
      const validShifts7 = dShifts7.filter(
        (s) => s.status === "COMPLETED" && s.isValid === true
      ).length;
      const platformScore =
        completedShifts7 > 0 ? clamp((validShifts7 / completedShifts7) * 100) : 100;

      // ── Composite Score ───────────────────────────────────────────────────
      const compositeScore = weightedAverage({
        attendance: attendanceScore,
        delivery: deliveryScore,
        financial: financialScore,
        equipment: equipmentScore,
        platform: platformScore,
      });

      // ── Trend: compare 7-day avg composite vs 14-day avg composite ───────
      // Re-compute composite for older 7 days (days 8-14)
      const dShiftsOld = dShifts14.filter((s) => s.date < sevenDaysAgo);
      const dOrdersOld = dOrders14.filter((o) => o.date < sevenDaysAgo);

      const totalOrdersOld = dOrdersOld.reduce((s, o) => s + o.orderCount, 0);
      const workingDaysOld = new Set(
        dOrdersOld.map((o) => o.date.toISOString().split("T")[0])
      ).size;
      const driverDailyAvgOld = workingDaysOld > 0 ? totalOrdersOld / workingDaysOld : 0;

      const completedOld = dShiftsOld.filter((s) => s.status === "COMPLETED").length;
      const totalOld = dShiftsOld.length;
      const completionRateOld = totalOld > 0 ? completedOld / totalOld : 0;

      const deliveryRatioOld = Math.min(
        driverDailyAvgOld / Math.max(platformAvgOrdersPerDay, 1),
        1.5
      );

      const oldComposite = weightedAverage({
        attendance: clamp(completionRateOld * 100),
        delivery: clamp((deliveryRatioOld / 1.5) * 100),
        financial: financialScore, // stable proxy
        equipment: equipmentScore,
        platform: platformScore,
      });

      let trend: ScoreTrend = "STABLE";
      if (compositeScore > oldComposite + 2) trend = "UP";
      else if (compositeScore < oldComposite - 2) trend = "DOWN";

      const breakdown = {
        weights: WEIGHTS,
        details: {
          attendance: {
            score: attendanceScore,
            totalShifts: totalShifts7,
            completedShifts: completedShifts7,
            onTimeShifts: onTimeShifts7,
            completionRate: parseFloat(completionRate.toFixed(3)),
            onTimeRate: parseFloat(onTimeRate.toFixed(3)),
          },
          delivery: {
            score: deliveryScore,
            totalOrders: totalOrders7,
            workingDays: workingDays7,
            dailyAverage: parseFloat(driverDailyAvg.toFixed(2)),
            platformAverage: parseFloat(platformAvgOrdersPerDay.toFixed(2)),
          },
          financial: {
            score: financialScore,
            totalCashRecords: dCash7.length,
            settledOnTime: settledOnTime7,
          },
          equipment: {
            score: equipmentScore,
            totalInspections: dInspections7.length,
            passed: passedInspections,
          },
          platform: {
            score: platformScore,
            completedShifts: completedShifts7,
            validShifts: validShifts7,
          },
        },
        trend: {
          current7DayComposite: compositeScore,
          previous7DayComposite: oldComposite,
        },
      };

      results.push({
        driverId: driver.id,
        compositeScore,
        attendanceScore,
        deliveryScore,
        financialScore,
        equipmentScore,
        platformScore,
        trend,
        breakdown,
      });
    }

    // ── Persist scores ─────────────────────────────────────────────────────
    // Batched: delete any existing scores for today then createMany. Requires
    // @@unique([tenantId, driverId, date]) on AiScore (see schema.prisma).
    const scoreDate = new Date(todayStart);

    await prisma.aiScore.deleteMany({
      where: { tenantId, driverId: { in: driverIds }, date: scoreDate },
    });

    await prisma.aiScore.createMany({
      data: results.map((score) => ({
        tenantId,
        driverId: score.driverId,
        date: scoreDate,
        compositeScore: score.compositeScore,
        attendanceScore: score.attendanceScore,
        deliveryScore: score.deliveryScore,
        financialScore: score.financialScore,
        equipmentScore: score.equipmentScore,
        platformScore: score.platformScore,
        trend: score.trend,
        breakdown: score.breakdown as object,
      })),
    });

    console.log(
      `[AiScoringService] Scored ${results.length} drivers for tenant ${tenantId}`
    );
    return results;
  }
}
