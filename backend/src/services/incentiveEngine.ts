import { prisma } from "../config";

/**
 * F11 — Incentive computations.
 * Two parallel payout formulas:
 *   Experience Target: weighted Σ(actual/target * 100 * weight), capped at weight*100*2.
 *     - ORDER_COMPLETION_PCT excludes non-delivery-related cancellations; scores 0 if actual < minThreshold (95%).
 *     - ON_TIME_RATE target 98.5%; scores 0 if actual < minThreshold (90%).
 *   Valid DA: count of days where KeetaDailyMetrics.validDay == true in the period.
 */

export const DEFAULT_EXPERIENCE_TIERS = [
  { level: "A", minRate: 100, maxRate: 200, payment: 190 },
  { level: "B", minRate: 98,  maxRate: 100, payment: 140 },
  { level: "C", minRate: 96,  maxRate: 98,  payment: 90  },
  { level: "D", minRate: 0,   maxRate: 96,  payment: 0   },
];

export const DEFAULT_VALID_DA_TIERS = [
  { level: "A", minRate: 40, maxRate: 52, payment: 180 },
  { level: "B", minRate: 30, maxRate: 40, payment: 130 },
  { level: "C", minRate: 25, maxRate: 30, payment: 80  },
  { level: "D", minRate: 0,  maxRate: 25, payment: 0   },
];

const CAP = 2; // experience rate caps at weight * 100 * 2 per goal.

type GoalActual = { name: string; actual: number };

export function computeExperienceRate(
  goals: { name: string; weight: number; targetValue: number; minThreshold: number }[],
  actuals: GoalActual[],
): number {
  let total = 0;
  for (const g of goals) {
    const a = actuals.find((x) => x.name === g.name)?.actual ?? 0;
    if (a < g.minThreshold) continue; // sub-threshold goal scores 0
    const rate = (a / g.targetValue) * 100 * g.weight;
    const capVal = g.weight * 100 * CAP;
    total += Math.min(rate, capVal);
  }
  return Number(total.toFixed(2));
}

export async function countValidDA(params: {
  tenantId: string;
  driverId: string;
  period: string; // YYYYMM
}): Promise<number> {
  const year = parseInt(params.period.slice(0, 4), 10);
  const month = parseInt(params.period.slice(4, 6), 10) - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return prisma.keetaDailyMetrics.count({
    where: { tenantId: params.tenantId, driverId: params.driverId, validDay: true, date: { gte: start, lt: end } },
  });
}

function pickTier(rate: number, tiers: { level: string; minRate: number; maxRate: number; payment: number }[]) {
  // top tier is inclusive on both ends; others use [min, max) semantics.
  const sorted = [...tiers].sort((a, b) => b.minRate - a.minRate);
  for (const t of sorted) {
    if (rate >= t.minRate && (rate < t.maxRate || t === sorted[0])) return t;
  }
  return tiers.find((t) => t.level === "D") ?? { level: "D", payment: 0 };
}

export async function recomputeRound(roundId: string) {
  const round = await prisma.incentiveTargetRound.findUnique({
    where: { id: roundId },
    include: { goals: true, tiers: true },
  });
  if (!round) throw new Error("round not found");

  const experienceTiers = round.tiers.filter((t) => t.kind === "EXPERIENCE");
  const validDaTiers = round.tiers.filter((t) => t.kind === "VALID_DA");

  // Gather target drivers: those with any KeetaDailyMetrics in the period on this partner.
  const year = parseInt(round.period.slice(0, 4), 10);
  const month = parseInt(round.period.slice(4, 6), 10) - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const drivers = await prisma.driver.findMany({
    where: {
      tenantId: round.tenantId,
      platform: "KEETA",
      vehicleType: round.vehicleType === "CAR" ? "CAR" : "MOTORCYCLE",
    },
    select: { id: true },
  });

  const payouts = [];
  for (const d of drivers) {
    const metrics = await prisma.keetaDailyMetrics.findMany({
      where: { tenantId: round.tenantId, driverId: d.id, date: { gte: start, lt: end } },
      select: { deliveredTasks: true, acceptedTasks: true, cancelledTasks: true, onTimeRate: true, validDay: true },
    });
    if (metrics.length === 0) continue;

    const delivered = metrics.reduce((s, m) => s + (m.deliveredTasks || 0), 0);
    const accepted = metrics.reduce((s, m) => s + (m.acceptedTasks || 0), 0);
    const cancelled = metrics.reduce((s, m) => s + (m.cancelledTasks || 0), 0);
    const onTimeRates = metrics.filter((m) => m.onTimeRate != null).map((m) => Number(m.onTimeRate));
    const avgOnTime = onTimeRates.length > 0 ? (onTimeRates.reduce((a, b) => a + b, 0) / onTimeRates.length) * 100 : 0;
    const orderCompletionPct = (accepted - cancelled) > 0 ? ((delivered / (accepted - cancelled)) * 100) : 0;

    const experienceRate = computeExperienceRate(round.goals, [
      { name: "ORDER_COMPLETION_PCT", actual: orderCompletionPct },
      { name: "ON_TIME_RATE", actual: avgOnTime },
    ]);
    const expTier = pickTier(experienceRate, experienceTiers);

    const validDaCount = metrics.filter((m) => m.validDay).length;
    const daTier = pickTier(validDaCount, validDaTiers);

    const totalPay = (expTier.payment || 0) + (daTier.payment || 0);

    const payout = await prisma.courierIncentivePayout.upsert({
      where: { roundId_driverId: { roundId, driverId: d.id } },
      create: {
        tenantId: round.tenantId,
        roundId,
        driverId: d.id,
        experienceRate,
        experienceTier: expTier.level,
        experiencePayKwd: expTier.payment || 0,
        validDaCount,
        validDaTier: daTier.level,
        validDaPayKwd: daTier.payment || 0,
        totalPayKwd: totalPay,
      },
      update: {
        experienceRate,
        experienceTier: expTier.level,
        experiencePayKwd: expTier.payment || 0,
        validDaCount,
        validDaTier: daTier.level,
        validDaPayKwd: daTier.payment || 0,
        totalPayKwd: totalPay,
        computedAt: new Date(),
      },
    });
    payouts.push(payout);
  }
  return payouts;
}

export async function seedDefaultTiers(roundId: string) {
  const existing = await prisma.incentiveTier.count({ where: { roundId } });
  if (existing > 0) return;
  await prisma.incentiveTier.createMany({
    data: [
      ...DEFAULT_EXPERIENCE_TIERS.map((t) => ({ roundId, kind: "EXPERIENCE", ...t })),
      ...DEFAULT_VALID_DA_TIERS.map((t) => ({ roundId, kind: "VALID_DA", ...t })),
    ],
  });
}

export async function seedDefaultGoals(roundId: string) {
  const existing = await prisma.incentiveGoal.count({ where: { roundId } });
  if (existing > 0) return;
  await prisma.incentiveGoal.createMany({
    data: [
      { roundId, name: "ORDER_COMPLETION_PCT", weight: 0.40, targetValue: 100, minThreshold: 95 },
      { roundId, name: "ON_TIME_RATE",         weight: 0.60, targetValue: 98.5, minThreshold: 90 },
    ],
  });
}
