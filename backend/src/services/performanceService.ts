import { prisma } from "../config";
import { logger } from "../config/logger";

// R9 · Performance tiers. Derives a tier per driver from their weekly UTR and
// on-time rate. Information-only — no auto-suspension / bonus flows.
//
// Defaults (tenant-overridable via PlatformSettings.kpis.performanceTiers):
//   Gold       utr ≥ 2.8  AND onTimeRate ≥ 0.95
//   Silver     utr ≥ 2.2  AND onTimeRate ≥ 0.90
//   Bronze     utr ≥ 1.6  AND onTimeRate ≥ 0.85
//   Watchlist  anything else, OR ≥ watchlistViolations/week

export type Tier = "GOLD" | "SILVER" | "BRONZE" | "WATCHLIST";

type Thresholds = {
  gold: { utr: number; onTime: number };
  silver: { utr: number; onTime: number };
  bronze: { utr: number; onTime: number };
  watchlistViolations: number;
};

const DEFAULT: Thresholds = {
  gold: { utr: 2.8, onTime: 0.95 },
  silver: { utr: 2.2, onTime: 0.9 },
  bronze: { utr: 1.6, onTime: 0.85 },
  watchlistViolations: 3,
};

async function loadThresholds(tenantId: string, platform: string): Promise<Thresholds> {
  const settings = await prisma.platformSettings.findUnique({
    where: { tenantId_platform: { tenantId, platform: platform as any } },
  });
  const custom = (settings?.kpis as any)?.performanceTiers as Partial<Thresholds> | undefined;
  return {
    gold: { ...DEFAULT.gold, ...(custom?.gold ?? {}) },
    silver: { ...DEFAULT.silver, ...(custom?.silver ?? {}) },
    bronze: { ...DEFAULT.bronze, ...(custom?.bronze ?? {}) },
    watchlistViolations:
      custom?.watchlistViolations ?? DEFAULT.watchlistViolations,
  };
}

function pickTier(utr: number | null, onTime: number | null, t: Thresholds): Tier {
  if (utr != null && onTime != null) {
    if (utr >= t.gold.utr && onTime >= t.gold.onTime) return "GOLD";
    if (utr >= t.silver.utr && onTime >= t.silver.onTime) return "SILVER";
    if (utr >= t.bronze.utr && onTime >= t.bronze.onTime) return "BRONZE";
  }
  return "WATCHLIST";
}

/**
 * Compute tiers for every ACTIVE driver in the tenant, write to
 * Driver.performanceTier + tierComputedAt.
 */
export async function computeDriverTiers(tenantId: string): Promise<number> {
  const drivers = await prisma.driver.findMany({
    where: { tenantId, status: "ACTIVE" },
    select: { id: true, platform: true },
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tCache = new Map<string, Thresholds>();
  let written = 0;

  for (const d of drivers) {
    if (!tCache.has(d.platform)) {
      tCache.set(d.platform, await loadThresholds(tenantId, d.platform));
    }
    const thresholds = tCache.get(d.platform)!;

    const [violationCount, talabat, keeta] = await Promise.all([
      prisma.violation.count({
        where: { tenantId, driverId: d.id, violationTime: { gte: weekAgo } },
      }),
      d.platform === "TALABAT"
        ? prisma.talabatDailyMetrics.findMany({
            where: {
              tenantId,
              driverId: d.id,
              shiftDate: { gte: weekAgo },
              status: { in: ["PARSED", "APPROVED"] },
            },
            select: { utr: true, ordersCompleted: true, onlineHours: true },
          })
        : Promise.resolve([]),
      d.platform === "KEETA"
        ? prisma.keetaDailyMetrics.findMany({
            where: { tenantId, driverId: d.id, date: { gte: weekAgo } },
            select: {
              deliveredTasks: true,
              validOnlineTime: true,
              onTimeRate: true,
            },
          })
        : Promise.resolve([]),
    ]);

    let utr: number | null = null;
    let onTime: number | null = null;

    if (d.platform === "TALABAT" && talabat.length > 0) {
      const values = talabat.filter((r) => r.utr != null);
      utr = values.length > 0 ? values.reduce((s, r) => s + (r.utr ?? 0), 0) / values.length : null;
      // Talabat on-time rate not tracked yet — conservative default keeps drivers in Watchlist until we wire it
      onTime = null;
    } else if (d.platform === "KEETA" && keeta.length > 0) {
      const totalDelivered = keeta.reduce((s, r) => s + (r.deliveredTasks ?? 0), 0);
      const totalOnlineHours =
        keeta.reduce((s, r) => s + (r.validOnlineTime ?? 0), 0) / 60;
      utr = totalOnlineHours > 0 ? totalDelivered / totalOnlineHours : null;
      const onTimeVals = keeta
        .map((r) => (r.onTimeRate != null ? Number(r.onTimeRate) : null))
        .filter((v): v is number => v != null);
      onTime =
        onTimeVals.length > 0
          ? onTimeVals.reduce((s, v) => s + v, 0) / onTimeVals.length
          : null;
    }

    let tier = pickTier(utr, onTime, thresholds);
    if (violationCount >= thresholds.watchlistViolations) tier = "WATCHLIST";

    await prisma.driver.update({
      where: { id: d.id },
      data: { performanceTier: tier, tierComputedAt: now } as any,
    });
    written++;
  }

  logger.info({ tenantId, written }, "[performanceService] tiers updated");
  return written;
}

/**
 * Run across every tenant. Intended to be called from the weekly scheduler.
 */
export async function computeAllTenantTiers(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const t of tenants) {
    try {
      await computeDriverTiers(t.id);
    } catch (err: any) {
      logger.error({ err, tenantId: t.id }, "[performanceService] tenant failed");
    }
  }
}

// ─── Phase 1 Wave 2 — Daily PerformanceSnapshot writer ──────────────────────
//
// Mirrors today's AiScore rows (already computed by the existing scoreAllDrivers
// job) into the new PerformanceSnapshot table. Phase 3's 90-day trend chart
// reads from PerformanceSnapshot; running this from Phase 1 ensures the table
// is non-empty by the time Phase 3 ships.
//
// Idempotent: writePerformanceSnapshot() upserts on
// (tenantId, driverId, snapshotDate). Calling twice on the same day yields the
// same single row.
//
// T-01-W2-06 / T-01-W2-07 mitigation: cross-tenant iteration runs in BullMQ
// worker context only (no HTTP request); each per-driver write is
// tenant-scoped at the source AiScore row.

import { writePerformanceSnapshot } from "../agent/performanceSnapshot";

export async function snapshotAllDriversForTenant(
  tenantId: string,
): Promise<{ written: number; failed: number }> {
  // Today's AiScore rows are written by existing scoring jobs; we read them
  // back and mirror into PerformanceSnapshot.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const scores = await prisma.aiScore.findMany({
    where: { tenantId, date: { gte: today, lt: tomorrow } },
  });

  let written = 0;
  let failed = 0;
  for (const s of scores) {
    try {
      await writePerformanceSnapshot({
        tenantId: s.tenantId,
        driverId: s.driverId,
        snapshotDate: s.date,
        compositeScore: s.compositeScore,
        attendanceScore: s.attendanceScore,
        deliveryScore: s.deliveryScore,
        financialScore: s.financialScore,
        equipmentScore: s.equipmentScore,
        platformScore: s.platformScore,
        trend: s.trend as "UP" | "DOWN" | "STABLE",
        breakdown: (s.breakdown as object) ?? undefined,
      });
      written++;
    } catch (err: any) {
      logger.error(
        { err, tenantId, driverId: s.driverId },
        "[performanceService] snapshot write failed",
      );
      failed++;
    }
  }
  return { written, failed };
}

export async function snapshotAllTenants(): Promise<{
  tenants: number;
  written: number;
  failed: number;
}> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  let totalWritten = 0;
  let totalFailed = 0;
  for (const t of tenants) {
    const r = await snapshotAllDriversForTenant(t.id);
    totalWritten += r.written;
    totalFailed += r.failed;
  }
  return {
    tenants: tenants.length,
    written: totalWritten,
    failed: totalFailed,
  };
}
