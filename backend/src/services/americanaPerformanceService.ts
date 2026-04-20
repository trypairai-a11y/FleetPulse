import { prisma } from "../config";

// A7 · Americana composite tier engine.
//
// For each active Americana driver, compute:
//   orders_pct      = totalMonthOrders / targetMonthlyOrders
//   attendance_pct  = presentDays / scheduledDays
//   violations_hits = count of ESTABLISHED Americana violations this month
//   composite       = wO*orders_pct + wA*attendance_pct - wV*violations_hits
//
// Tier:
//   GOLD    composite >= gold   AND violations_hits == 0
//   SILVER  composite >= silver
//   BRONZE  otherwise
//
// Weights, thresholds and targets live in Tenant.settings.americana.

export type AmericanaTier = "GOLD" | "SILVER" | "BRONZE";

interface AmericanaSettings {
  weights: { orders: number; attendance: number; violations: number };
  thresholds: { gold: number; silver: number };
  targetMonthlyOrders: { car: number; bike: number };
}

const DEFAULTS: AmericanaSettings = {
  weights: { orders: 0.4, attendance: 0.6, violations: 0.05 },
  thresholds: { gold: 0.95, silver: 0.8 },
  targetMonthlyOrders: { car: 800, bike: 600 },
};

async function loadSettings(tenantId: string): Promise<AmericanaSettings> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
  const s = (tenant?.settings as any)?.americana ?? {};
  return {
    weights: { ...DEFAULTS.weights, ...(s.tierWeights ?? {}) },
    thresholds: { ...DEFAULTS.thresholds, ...(s.tierThresholds ?? {}) },
    targetMonthlyOrders: { ...DEFAULTS.targetMonthlyOrders, ...(s.monthlyOrderTarget ?? {}) },
  };
}

function pickTarget(settings: AmericanaSettings, position: string | null | undefined): number {
  const p = (position || "").toLowerCase();
  return p.includes("bike") ? settings.targetMonthlyOrders.bike : settings.targetMonthlyOrders.car;
}

export interface LeaderboardEntry {
  driverId: string;
  driverName: string;
  empId: string | null;
  position: string | null;
  totalOrders: number;
  targetOrders: number;
  ordersPct: number;
  attendancePct: number;
  presentDays: number;
  scheduledDays: number;
  violations: number;
  composite: number;
  tier: AmericanaTier;
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function nextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export async function computeAmericanaLeaderboard(tenantId: string, month: Date): Promise<LeaderboardEntry[]> {
  const settings = await loadSettings(tenantId);
  const from = firstOfMonth(month);
  const to = nextMonth(from);

  const [orders, violations] = await Promise.all([
    prisma.americanaDailyOrders.findMany({
      where: { tenantId, month: from },
      include: { driver: { select: { id: true, name: true } } },
    }),
    prisma.violation.findMany({
      where: {
        tenantId,
        platform: "AMERICANA",
        violationStatus: "ESTABLISHED",
        violationTime: { gte: from, lt: to },
      },
      select: { driverId: true },
    }),
  ]);

  const violationMap = new Map<string, number>();
  for (const v of violations) {
    if (!v.driverId) continue;
    violationMap.set(v.driverId, (violationMap.get(v.driverId) ?? 0) + 1);
  }

  const entries: LeaderboardEntry[] = [];
  for (const o of orders) {
    const daily = (o.dailyOrders as Record<string, number>) || {};
    const days = Object.keys(daily);
    const presentDays = days.filter((k) => (daily[k] || 0) > 0).length;
    const scheduledDays = Math.max(presentDays, days.length || 0);
    const attendancePct = scheduledDays > 0 ? presentDays / scheduledDays : 0;
    const target = pickTarget(settings, o.position);
    const ordersPct = target > 0 ? o.totalOrders / target : 0;
    const viols = violationMap.get(o.driverId) ?? 0;
    const composite =
      settings.weights.orders * ordersPct +
      settings.weights.attendance * attendancePct -
      settings.weights.violations * viols;

    let tier: AmericanaTier;
    if (composite >= settings.thresholds.gold && viols === 0) tier = "GOLD";
    else if (composite >= settings.thresholds.silver) tier = "SILVER";
    else tier = "BRONZE";

    entries.push({
      driverId: o.driverId,
      driverName: o.driver.name,
      empId: o.empId,
      position: o.position,
      totalOrders: o.totalOrders,
      targetOrders: target,
      ordersPct,
      attendancePct,
      presentDays,
      scheduledDays,
      violations: viols,
      composite,
      tier,
    });
  }

  entries.sort((a, b) => b.composite - a.composite);
  return entries;
}

/**
 * Nightly helper — computes the leaderboard for the current month for every
 * tenant and writes a per-driver tier hint to Driver.performanceTier as a
 * *separate* flag (doesn't collide with the existing weekly computation used
 * by other platforms, since those drivers are on different platforms).
 */
export async function recomputeAllAmericanaTenants(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const now = new Date();
  for (const t of tenants) {
    try {
      const entries = await computeAmericanaLeaderboard(t.id, now);
      for (const e of entries) {
        await prisma.driver.update({
          where: { id: e.driverId },
          data: { performanceTier: e.tier, tierComputedAt: now },
        });
      }
    } catch {}
  }
}
