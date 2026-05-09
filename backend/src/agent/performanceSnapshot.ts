// Daily per-driver performance snapshot. Phase 3 (Driver File) reads from this
// table for the 90-day trend chart. Wave 2 ships the writer; the daily worker
// (this same wave) populates rows from Phase 1 onward so Phase 3 lands with
// non-empty trend data.
//
// snapshotDate is ALWAYS truncated to UTC midnight before write/read to keep
// the @@unique([tenantId, driverId, snapshotDate]) compound key collision-free
// across timezones.
//
// REQ-data-performance-snapshot.

import { prisma } from "../config";

export type ScoreTrend = "UP" | "DOWN" | "STABLE";

export interface PerformanceSnapshotInput {
  tenantId: string;
  driverId: string;
  snapshotDate: Date; // any time on the target day; the writer truncates to UTC midnight
  compositeScore: number;
  attendanceScore: number;
  deliveryScore: number;
  financialScore: number;
  equipmentScore: number;
  platformScore: number;
  trend: ScoreTrend;
  ordersCount?: number;
  shiftsCount?: number;
  violationsCount?: number;
  cashOutstandingKd?: number;
  breakdown?: object;
}

const VALID_TRENDS: ReadonlySet<string> = new Set(["UP", "DOWN", "STABLE"]);

function truncateToUtcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export async function writePerformanceSnapshot(
  input: PerformanceSnapshotInput,
): Promise<{ id: string }> {
  if (!input.tenantId)
    throw new Error("writePerformanceSnapshot: tenantId required");
  if (!input.driverId)
    throw new Error("writePerformanceSnapshot: driverId required");
  if (!input.snapshotDate)
    throw new Error("writePerformanceSnapshot: snapshotDate required");
  if (!VALID_TRENDS.has(input.trend)) {
    throw new Error(
      `writePerformanceSnapshot: invalid trend "${input.trend}"`,
    );
  }

  const snapshotDate = truncateToUtcMidnight(input.snapshotDate);
  const data = {
    tenantId: input.tenantId,
    driverId: input.driverId,
    snapshotDate,
    compositeScore: input.compositeScore,
    attendanceScore: input.attendanceScore,
    deliveryScore: input.deliveryScore,
    financialScore: input.financialScore,
    equipmentScore: input.equipmentScore,
    platformScore: input.platformScore,
    trend: input.trend as any,
    ordersCount: input.ordersCount ?? 0,
    shiftsCount: input.shiftsCount ?? 0,
    violationsCount: input.violationsCount ?? 0,
    // cashOutstandingKd column is Decimal(10, 3) — passing number lets Prisma
    // marshal the conversion; null when omitted so we don't write 0 when the
    // platform doesn't track cash for the driver.
    cashOutstandingKd: input.cashOutstandingKd ?? null,
    breakdown: (input.breakdown ?? null) as any,
  };

  const result = await prisma.performanceSnapshot.upsert({
    where: {
      tenantId_driverId_snapshotDate: {
        tenantId: input.tenantId,
        driverId: input.driverId,
        snapshotDate,
      },
    },
    create: data,
    update: data,
  });
  return { id: result.id };
}

export async function listSnapshotsForDriver(
  tenantId: string,
  driverId: string,
  daysBack = 90,
): Promise<PerformanceSnapshotInput[]> {
  if (!tenantId)
    throw new Error("listSnapshotsForDriver: tenantId required");
  if (!driverId)
    throw new Error("listSnapshotsForDriver: driverId required");

  const since = truncateToUtcMidnight(
    new Date(Date.now() - daysBack * 86_400_000),
  );
  const rows = await prisma.performanceSnapshot.findMany({
    where: { tenantId, driverId, snapshotDate: { gte: since } },
    orderBy: { snapshotDate: "asc" },
  });
  return rows as unknown as PerformanceSnapshotInput[];
}
