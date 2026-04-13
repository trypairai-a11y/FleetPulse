import { prisma } from "../config";
import { AlertSeverity } from "../generated/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnomalyAlert {
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  driverId?: string;
  data?: Record<string, unknown>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AiAnomalyService {
  /**
   * Run all anomaly checks for a tenant and create Alert records for any
   * anomalies detected.
   *
   * Checks performed:
   *  1. Driver with orders < 50% of their 7-day average
   *  2. Cash collected but not deposited for 3+ days
   *  3. Driver GPS not in assigned zone during shift (placeholder - requires zone geometry)
   *  4. Online hours < 70% of planned hours
   *  5. Multiple failed face verifications (attendance source = "face_fail")
   */
  /**
   * Run anomaly detection without persisting. Returns the full structured
   * list so callers can choose how to present or store the results.
   */
  static async runDetection(tenantId: string): Promise<AnomalyAlert[]> {
    const anomalies: AnomalyAlert[] = [];

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setUTCDate(todayStart.getUTCDate() - 7);

    const yesterday = new Date(todayStart);
    yesterday.setUTCDate(todayStart.getUTCDate() - 1);

    const threeDaysAgo = new Date(todayStart);
    threeDaysAgo.setUTCDate(todayStart.getUTCDate() - 3);

    // ── Fetch active drivers for this tenant ──────────────────────────────
    const activeDrivers = await prisma.driver.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, name: true, zone: true },
    });

    const driverIds = activeDrivers.map((d) => d.id);

    if (driverIds.length === 0) return anomalies;

    // ── 1. Low order count vs 7-day average ──────────────────────────────
    const sevenDayOrders = await prisma.orderLog.groupBy({
      by: ["driverId"],
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: sevenDaysAgo, lt: todayStart },
      },
      _sum: { orderCount: true },
      _count: { id: true },
    });

    const yesterdayOrders = await prisma.orderLog.groupBy({
      by: ["driverId"],
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: yesterday, lt: todayStart },
      },
      _sum: { orderCount: true },
    });

    for (const driver of activeDrivers) {
      const sevenDayData = sevenDayOrders.find((o) => o.driverId === driver.id);
      const yesterdayData = yesterdayOrders.find((o) => o.driverId === driver.id);

      if (!sevenDayData || !yesterdayData) continue;

      const daysWithData = sevenDayData._count.id;
      if (daysWithData === 0) continue;

      const avgDaily = (sevenDayData._sum.orderCount ?? 0) / daysWithData;
      const yesterdayCount = yesterdayData._sum.orderCount ?? 0;

      if (avgDaily > 0 && yesterdayCount < avgDaily * 0.5) {
        anomalies.push({
          type: "LOW_ORDER_COUNT",
          severity: "MEDIUM",
          title: "Low Order Count Detected",
          message: `Driver ${driver.name} completed ${yesterdayCount} orders yesterday, which is less than 50% of their 7-day average (${avgDaily.toFixed(1)}).`,
          driverId: driver.id,
          data: {
            yesterdayOrders: yesterdayCount,
            sevenDayAverage: parseFloat(avgDaily.toFixed(2)),
            threshold: parseFloat((avgDaily * 0.5).toFixed(2)),
          },
        });
      }
    }

    // ── 2. Cash not deposited for 3+ days ─────────────────────────────────
    const pendingCash = await prisma.cashRecord.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        date: { lte: threeDaysAgo },
      },
      include: { driver: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    // Group by driver - report once per driver with oldest pending date
    const pendingByDriver = new Map<string, { driverName: string; oldestDate: Date; totalDues: number }>();
    for (const record of pendingCash) {
      const existing = pendingByDriver.get(record.driverId);
      const dues = Number(record.pendingDues);
      if (!existing) {
        pendingByDriver.set(record.driverId, {
          driverName: record.driver.name,
          oldestDate: record.date,
          totalDues: dues,
        });
      } else {
        if (record.date < existing.oldestDate) existing.oldestDate = record.date;
        existing.totalDues += dues;
      }
    }

    for (const [driverId, info] of pendingByDriver.entries()) {
      const daysPending = Math.floor(
        (now.getTime() - info.oldestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      anomalies.push({
        type: "CASH_NOT_DEPOSITED",
        severity: daysPending >= 7 ? "HIGH" : "MEDIUM",
        title: "Cash Not Deposited",
        message: `Driver ${info.driverName} has undeposited cash of ${info.totalDues.toFixed(3)} KD outstanding for ${daysPending} days.`,
        driverId,
        data: {
          totalPendingKD: parseFloat(info.totalDues.toFixed(3)),
          oldestPendingDate: info.oldestDate.toISOString().split("T")[0],
          daysPending,
        },
      });
    }

    // ── 3. Driver GPS not in assigned zone during shift ───────────────────
    // Note: Full zone geometry check requires PostGIS / polygon intersection.
    // This check flags drivers whose last known location doesn't match their
    // assigned zone string if zone is set and location data is available.
    const activeShifts = await prisma.shift.findMany({
      where: {
        tenantId,
        date: { gte: yesterday, lt: todayStart },
        status: "IN_PROGRESS",
      },
      include: {
        driver: {
          select: { id: true, name: true, zone: true, device: true },
        },
      },
    });

    for (const shift of activeShifts) {
      if (!shift.zone || !shift.driver.zone) continue;
      if (shift.zone === shift.driver.zone) continue;

      // Zone mismatch between shift assignment and driver's registered zone
      anomalies.push({
        type: "DRIVER_ZONE_MISMATCH",
        severity: "LOW",
        title: "Driver Zone Mismatch",
        message: `Driver ${shift.driver.name} is on a shift assigned to zone "${shift.zone}" but their registered zone is "${shift.driver.zone}".`,
        driverId: shift.driver.id,
        data: {
          shiftId: shift.id,
          assignedZone: shift.zone,
          driverZone: shift.driver.zone,
        },
      });
    }

    // ── 4. Online hours < 70% of planned hours ────────────────────────────
    const recentShifts = await prisma.shift.findMany({
      where: {
        tenantId,
        driverId: { in: driverIds },
        date: { gte: yesterday, lt: todayStart },
        status: "COMPLETED",
        plannedHoursMinutes: { not: null },
        actualHoursMinutes: { not: null },
      },
      include: { driver: { select: { name: true } } },
    });

    for (const shift of recentShifts) {
      const planned = shift.plannedHoursMinutes!;
      const actual = shift.actualHoursMinutes!;

      if (planned === 0) continue;

      const ratio = actual / planned;
      if (ratio < 0.7) {
        anomalies.push({
          type: "LOW_ONLINE_HOURS",
          severity: ratio < 0.5 ? "HIGH" : "MEDIUM",
          title: "Low Online Hours",
          message: `Driver ${shift.driver.name} was online for ${(actual / 60).toFixed(1)}h out of ${(planned / 60).toFixed(1)}h planned (${(ratio * 100).toFixed(0)}%).`,
          driverId: shift.driverId,
          data: {
            shiftId: shift.id,
            plannedMinutes: planned,
            actualMinutes: actual,
            utilizationPct: parseFloat((ratio * 100).toFixed(1)),
          },
        });
      }
    }

    // ── 5. Multiple failed face verifications ─────────────────────────────
    const faceFailRecords = await prisma.attendanceRecord.groupBy({
      by: ["driverId"],
      where: {
        tenantId,
        driverId: { in: driverIds },
        source: "face_fail",
        date: { gte: sevenDaysAgo, lt: todayStart },
      },
      _count: { id: true },
    });

    for (const record of faceFailRecords) {
      if (record._count.id < 2) continue;

      const driver = activeDrivers.find((d) => d.id === record.driverId);
      if (!driver) continue;

      anomalies.push({
        type: "FACE_VERIFICATION_FAILURES",
        severity: record._count.id >= 5 ? "HIGH" : "MEDIUM",
        title: "Multiple Face Verification Failures",
        message: `Driver ${driver.name} has failed face verification ${record._count.id} times in the last 7 days.`,
        driverId: driver.id,
        data: {
          failureCount: record._count.id,
          windowDays: 7,
        },
      });
    }

    console.log(
      `[AiAnomalyService] Detected ${anomalies.length} anomalies for tenant ${tenantId}`
    );
    return anomalies;
  }

  /**
   * Run detection and persist results as Alert rows. Returns the count.
   * Used by the scheduled job.
   */
  static async detectAnomalies(tenantId: string): Promise<number> {
    const anomalies = await this.runDetection(tenantId);

    if (anomalies.length > 0) {
      await prisma.alert.createMany({
        data: anomalies.map((a) => ({
          tenantId,
          type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          driverId: a.driverId ?? null,
          data: (a.data as object) ?? null,
          status: "ACTIVE",
        })),
        skipDuplicates: false,
      });
    }

    return anomalies.length;
  }
}
