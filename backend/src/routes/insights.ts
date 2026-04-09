import { Router, Request, Response } from "express";
import { prisma } from "../config";
import { authMiddleware } from "../middleware/auth";
import { tenantScope } from "../middleware/tenantScope";

const router = Router();
router.use(authMiddleware, tenantScope);

// ── Thresholds ────────────────────────────────────────────────────────────────
const CASH_OVERDUE_DAYS = 3;
const CASH_RED_DAYS = 5;
const CASH_RED_KD = 100;
const ORDERS_UNDERPERFORM_DAILY = 10;
const ORDERS_RED_DAILY = 5;
const AI_CELEBRATE_MIN_SCORE = 65;
const MAX_SUGGESTION_CARDS = 12;
const MAX_CELEBRATE_CARDS = 2;

type SuggestionType =
  | "COLLECT_CASH"
  | "TALK_TO_DRIVER"
  | "CELEBRATE_DRIVER"
  | "FILL_OPEN_SHIFT"
  | "RESOLVE_VIOLATION"
  | "CHECK_ABSENCE";

interface SuggestionCard {
  id: string;
  type: SuggestionType;
  severity: "red" | "yellow" | "green";
  priorityScore: number;
  emoji: string;
  title: string;
  suggestion: string;
  action: { label: string; href: string };
  driverId?: string;
  driverName?: string;
  platform?: string;
}

// ── Helper: start/end of a day ────────────────────────────────────────────────
function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ── Helper: get day-of-week label (Mon … Sun) ─────────────────────────────────
function dayLabel(d: Date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

// ── Helper: days since last non-zero collection entry ────────────────────────
function daysSinceLastCollection(dailyCollections: Record<string, number>, refDate: Date): number {
  const entries = Object.entries(dailyCollections)
    .filter(([, v]) => v > 0)
    .map(([k]) => parseInt(k, 10))
    .sort((a, b) => b - a);

  if (entries.length === 0) return 999;

  const lastDay = entries[0];
  const refDay = refDate.getDate();
  const diff = refDay - lastDay;
  return diff < 0 ? 999 : diff;
}

// ── GET /api/insights ─────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const now = new Date();

    // ── Date anchors ──────────────────────────────────────────────────────────
    const { start: todayStart, end: todayEnd } = dayBounds(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const { start: yesterdayStart, end: yesterdayEnd } = dayBounds(yesterday);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Monday of this week
    const thisWeekStart = new Date(now);
    const dow = thisWeekStart.getDay(); // 0=Sun
    const diffToMon = (dow + 6) % 7;
    thisWeekStart.setDate(thisWeekStart.getDate() - diffToMon);
    thisWeekStart.setHours(0, 0, 0, 0);

    // Monday of last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1); // Sunday 23:59:59.999 last week

    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [
      ordersTodayAgg,
      ordersYesterdayAgg,
      ordersThisWeekGrouped,
      ordersLastWeekGrouped,
      openLedgers,
      aiScores,
      absentToday,
      unresolvedViolations,
      activeAlerts,
      perDriverOrders7d,
    ] = await Promise.all([
      // Orders today
      prisma.orderLog.aggregate({
        where: { tenantId, date: { gte: todayStart, lte: todayEnd } },
        _sum: { orderCount: true },
      }),

      // Orders yesterday
      prisma.orderLog.aggregate({
        where: { tenantId, date: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { orderCount: true },
      }),

      // Orders this week (grouped by date)
      prisma.orderLog.groupBy({
        by: ["date"],
        where: { tenantId, date: { gte: thisWeekStart, lte: todayEnd } },
        _sum: { orderCount: true },
      }),

      // Orders last week (grouped by date)
      prisma.orderLog.groupBy({
        by: ["date"],
        where: { tenantId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
        _sum: { orderCount: true },
      }),

      // Open pending dues ledgers with driver
      prisma.pendingDuesLedger.findMany({
        where: {
          tenantId,
          status: "OPEN",
          closingBalance: { gt: 0 },
          month: { gte: currentMonth },
        },
        include: { driver: { select: { id: true, name: true, platform: true } } },
        orderBy: { closingBalance: "desc" },
      }),

      // Latest AiScore per driver
      prisma.aiScore.findMany({
        where: { tenantId },
        orderBy: { date: "desc" },
        distinct: ["driverId"],
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),

      // Absent drivers today
      prisma.attendanceRecord.findMany({
        where: { tenantId, date: { gte: todayStart, lte: todayEnd }, status: "ABSENT" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
      }),

      // Unresolved violations last 7 days
      prisma.talabatViolationEvent.findMany({
        where: { tenantId, resolved: false, createdAt: { gte: sevenDaysAgo } },
        include: { driver: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),

      // Active alerts
      prisma.alert.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: { driver: { select: { id: true, name: true, platform: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 30,
      }),

      // Per-driver order totals last 7 days
      prisma.orderLog.groupBy({
        by: ["driverId"],
        where: { tenantId, date: { gte: sevenDaysAgo } },
        _sum: { orderCount: true },
      }),
    ]);

    // ── Fetch driver names for perDriverOrders7d ──────────────────────────────
    const driverIds = perDriverOrders7d.map((r) => r.driverId);
    const drivers =
      driverIds.length > 0
        ? await prisma.driver.findMany({
            where: { tenantId, id: { in: driverIds } },
            select: { id: true, name: true, platform: true },
          })
        : [];
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    // ── Overview numbers ──────────────────────────────────────────────────────
    const ordersToday = ordersTodayAgg._sum.orderCount ?? 0;
    const ordersYesterday = ordersYesterdayAgg._sum.orderCount ?? 0;
    const ordersVsYesterday = ordersToday - ordersYesterday;

    let ordersSuggestion: string;
    let ordersStatus: "green" | "yellow" | "red";
    if (ordersYesterday === 0) {
      ordersSuggestion = "No data from yesterday — let's make today count.";
      ordersStatus = "yellow";
    } else if (ordersToday < ordersYesterday * 0.8) {
      ordersSuggestion = "Slower than yesterday — push drivers for the afternoon rush.";
      ordersStatus = "red";
    } else if (ordersToday >= ordersYesterday * 0.95) {
      ordersSuggestion = "On track — great start today.";
      ordersStatus = "green";
    } else {
      ordersSuggestion = "Slightly behind yesterday — keep pushing.";
      ordersStatus = "yellow";
    }

    const cashTotal = openLedgers.reduce(
      (sum, l) => sum + parseFloat(l.closingBalance.toString()),
      0
    );
    const cashDriverCount = openLedgers.length;
    let cashSuggestion: string;
    let cashStatus: "green" | "yellow" | "red";
    if (cashTotal === 0) {
      cashSuggestion = "All cash is up to date — well done.";
      cashStatus = "green";
    } else if (cashTotal < 500) {
      cashSuggestion = `Collect from ${cashDriverCount} driver${cashDriverCount > 1 ? "s" : ""} soon — you're owed ${cashTotal.toFixed(3)} KD.`;
      cashStatus = "yellow";
    } else {
      cashSuggestion = `Collect from ${cashDriverCount} driver${cashDriverCount > 1 ? "s" : ""} today — you're owed ${cashTotal.toFixed(3)} KD.`;
      cashStatus = "red";
    }

    // ── Build suggestion cards ────────────────────────────────────────────────
    const suggestions: SuggestionCard[] = [];

    // COLLECT_CASH
    for (const ledger of openLedgers) {
      const amount = parseFloat(ledger.closingBalance.toString());
      if (amount <= 0) continue;
      const dailyCollections = (ledger.dailyCollections as Record<string, number>) ?? {};
      const days = daysSinceLastCollection(dailyCollections, now);
      if (days < CASH_OVERDUE_DAYS) continue;

      const isRed = days >= CASH_RED_DAYS || amount >= CASH_RED_KD;
      let priority = 100 + (days - CASH_OVERDUE_DAYS) * 20;
      if (amount >= 200) priority += 15;

      suggestions.push({
        id: `cash-${ledger.driverId}`,
        type: "COLLECT_CASH",
        severity: isRed ? "red" : "yellow",
        priorityScore: priority,
        emoji: "💸",
        title: `Collect from ${ledger.driver.name} today`,
        suggestion: `${ledger.driver.name} owes you ${amount.toFixed(3)} KD${days < 999 ? ` and hasn't paid in ${days} day${days !== 1 ? "s" : ""}` : ""}. The longer you wait, the harder it gets to collect.`,
        action: { label: "View driver", href: `/talabat/cash?driverId=${ledger.driverId}` },
        driverId: ledger.driverId,
        driverName: ledger.driver.name,
        platform: ledger.driver.platform ?? undefined,
      });
    }

    // TALK_TO_DRIVER (underperforming)
    for (const row of perDriverOrders7d) {
      const total = row._sum.orderCount ?? 0;
      const avg = total / 7;
      if (avg >= ORDERS_UNDERPERFORM_DAILY) continue;

      const driver = driverMap.get(row.driverId);
      if (!driver) continue;

      const isRed = avg < ORDERS_RED_DAILY;
      let priority = 60 + (isRed ? 40 : 0);

      suggestions.push({
        id: `underperform-${row.driverId}`,
        type: "TALK_TO_DRIVER",
        severity: isRed ? "red" : "yellow",
        priorityScore: priority,
        emoji: "📉",
        title: `Have a chat with ${driver.name}`,
        suggestion: `${driver.name} is only doing ${avg.toFixed(1)} orders a day on average. A quick conversation can get them back on track.`,
        action: { label: "View driver", href: `/${(driver.platform ?? "talabat").toLowerCase()}/drivers?search=${encodeURIComponent(driver.name)}` },
        driverId: row.driverId,
        driverName: driver.name,
        platform: driver.platform ?? undefined,
      });
    }

    // CELEBRATE_DRIVER
    let celebrateCount = 0;
    for (const score of aiScores) {
      if (score.trend !== "UP" || score.compositeScore < AI_CELEBRATE_MIN_SCORE) continue;
      if (celebrateCount >= MAX_CELEBRATE_CARDS) break;

      suggestions.push({
        id: `celebrate-${score.driverId}`,
        type: "CELEBRATE_DRIVER",
        severity: "green",
        priorityScore: -50,
        emoji: "⭐",
        title: `Recognize ${score.driver.name} — they're doing great`,
        suggestion: `${score.driver.name}'s performance went up this week. Saying something costs nothing and keeps them motivated.`,
        action: { label: "View performance", href: "/analytics" },
        driverId: score.driverId,
        driverName: score.driver.name,
        platform: score.driver.platform ?? undefined,
      });
      celebrateCount++;
    }

    // FILL_OPEN_SHIFT (from active alerts)
    const shiftAlerts = activeAlerts.filter((a) => a.type === "shift_not_booked");
    for (const alert of shiftAlerts) {
      if (!alert.driver) continue;
      suggestions.push({
        id: `shift-${alert.id}`,
        type: "FILL_OPEN_SHIFT",
        severity: "yellow",
        priorityScore: 40,
        emoji: "📅",
        title: `Remind ${alert.driver.name} to book their shift`,
        suggestion: `${alert.driver.name} hasn't booked their Talabat shift for next week. They won't be able to work without it.`,
        action: { label: "View shifts", href: "/talabat/shifts" },
        driverId: alert.driverId ?? undefined,
        driverName: alert.driver.name,
        platform: alert.driver.platform ?? undefined,
      });
    }

    // RESOLVE_VIOLATION (drivers with 2+ unresolved violations)
    const violationsByDriver = new Map<string, { driver: { id: string; name: string }; types: string[]; count: number }>();
    for (const v of unresolvedViolations) {
      const entry = violationsByDriver.get(v.driverId) ?? { driver: v.driver, types: [], count: 0 };
      entry.count++;
      entry.types.push(v.type);
      violationsByDriver.set(v.driverId, entry);
    }
    for (const [driverId, info] of violationsByDriver) {
      if (info.count < 2) continue;
      const severeTypes = ["GPS_OFF", "CASH_THRESHOLD_EXCEEDED"];
      const isRed = info.types.some((t) => severeTypes.includes(t));
      suggestions.push({
        id: `violation-${driverId}`,
        type: "RESOLVE_VIOLATION",
        severity: isRed ? "red" : "yellow",
        priorityScore: 55 + (isRed ? 20 : 0),
        emoji: "⚠️",
        title: `Sort out ${info.driver.name}'s Talabat violations`,
        suggestion: `${info.driver.name} has ${info.count} unresolved issues on Talabat. Left alone, this can lead to penalties.`,
        action: { label: "View violations", href: `/talabat/violations?search=${encodeURIComponent(info.driver.name)}` },
        driverId,
        driverName: info.driver.name,
      });
    }

    // CHECK_ABSENCE
    for (const rec of absentToday) {
      suggestions.push({
        id: `absent-${rec.driverId}`,
        type: "CHECK_ABSENCE",
        severity: "yellow",
        priorityScore: 30,
        emoji: "🚫",
        title: `Check on ${rec.driver.name} — they didn't show today`,
        suggestion: `${rec.driver.name} was marked absent today. Find out why and see if the shift needs covering.`,
        action: { label: "View attendance", href: `/attendance` },
        driverId: rec.driverId,
        driverName: rec.driver.name,
        platform: rec.driver.platform ?? undefined,
      });
    }

    // ── Sort and cap ──────────────────────────────────────────────────────────
    suggestions.sort((a, b) => b.priorityScore - a.priorityScore);
    const finalSuggestions = suggestions.slice(0, MAX_SUGGESTION_CARDS);

    // ── Quick wins (top 3 distinct-type) ─────────────────────────────────────
    const seenTypes = new Set<SuggestionType>();
    const quickWinCards: SuggestionCard[] = [];
    for (const s of finalSuggestions) {
      if (quickWinCards.length >= 3) break;
      if (seenTypes.has(s.type)) continue;
      seenTypes.add(s.type);
      quickWinCards.push(s);
    }

    const quickWins = quickWinCards.map((s) => ({
      emoji: s.emoji,
      title: s.title,
      description: s.suggestion,
      href: s.action.href,
      urgent: s.severity === "red",
    }));

    // ── topSuggestion for overview card ──────────────────────────────────────
    const topCard = finalSuggestions.find((s) => s.severity === "red") ?? finalSuggestions[0];
    const topSuggestion = topCard?.title ?? "Everything looks good today.";
    const topSuggestionHref = topCard?.action.href ?? "/";

    // ── Weekly chart ──────────────────────────────────────────────────────────
    const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    function buildWeekBars(rows: { date: Date; _sum: { orderCount: number | null } }[], weekStart: Date) {
      return DAY_LABELS.map((label, i) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const key = day.toISOString().slice(0, 10);
        const match = rows.find((r) => new Date(r.date).toISOString().slice(0, 10) === key);
        return { label, orders: match?._sum.orderCount ?? 0 };
      });
    }

    const thisWeekBars = buildWeekBars(ordersThisWeekGrouped as any, thisWeekStart);
    const lastWeekBars = buildWeekBars(ordersLastWeekGrouped as any, lastWeekStart);

    // ── Response ──────────────────────────────────────────────────────────────
    res.json({
      generatedAt: now.toISOString(),
      overview: {
        ordersToday,
        ordersVsYesterday,
        ordersSuggestion,
        ordersStatus,
        cashUncollected: parseFloat(cashTotal.toFixed(3)),
        cashSuggestion,
        cashStatus,
        topSuggestion,
        topSuggestionHref,
      },
      suggestions: finalSuggestions,
      weeklyChart: {
        thisWeek: thisWeekBars,
        lastWeek: lastWeekBars,
      },
      quickWins,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;