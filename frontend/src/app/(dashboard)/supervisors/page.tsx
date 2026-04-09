"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import {
  Users, TrendingUp, DollarSign, Award, ChevronDown,
  CheckCircle2, XCircle, Bike, Car, ChevronRight,
} from "lucide-react";

const PLATFORMS = ["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_LABELS: Record<Platform, string> = { TALABAT: "Talabat", KEETA: "Keeta", DELIVEROO: "Deliveroo", AMERICANA: "Americana" };
const PLATFORM_COLORS: Record<Platform, string> = { TALABAT: "text-talabat", KEETA: "text-keeta", DELIVEROO: "text-deliveroo", AMERICANA: "text-americana" };
const PLATFORM_BG: Record<Platform, string> = { TALABAT: "bg-talabat/10", KEETA: "bg-keeta/10", DELIVEROO: "bg-deliveroo/10", AMERICANA: "bg-americana/10" };
const PLATFORM_DOT: Record<Platform, string> = { TALABAT: "bg-talabat", KEETA: "bg-keeta", DELIVEROO: "bg-deliveroo", AMERICANA: "bg-americana" };
const PLATFORM_RING: Record<Platform, string> = { TALABAT: "ring-talabat/40", KEETA: "ring-keeta/40", DELIVEROO: "ring-deliveroo/40", AMERICANA: "ring-americana/40" };

const TIER_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Gold:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400",  border: "border-amber-200" },
  Silver: { bg: "bg-slate-100", text: "text-slate-600",  dot: "bg-slate-400",  border: "border-slate-200" },
  Bronze: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400", border: "border-orange-200" },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Applies the size adjustment logic (mirrors backend)
function applyAdjustment(score: number, driverCount: number, adjustments: any[]) {
  const bracket = adjustments
    .filter((a: any) => driverCount >= a.minDrivers && driverCount <= (a.maxDrivers ?? Infinity))
    .sort((a: any, b: any) => b.minDrivers - a.minDrivers)[0] || null;
  const adj = bracket?.scoreAdjustment || 0;
  return { adjustedScore: Math.min(Math.round((score + adj) * 10) / 10, 100), scoreAdjustment: adj, sizeLabel: bracket?.label || "Standard" };
}

const DEMO_ADJUSTMENTS = [
  { label: "Small",  minDrivers: 3,  maxDrivers: 7,   scoreAdjustment: 0  },
  { label: "Medium", minDrivers: 8,  maxDrivers: 15,  scoreAdjustment: 5  },
  { label: "Large",  minDrivers: 16, maxDrivers: 999, scoreAdjustment: 10 },
];

const DEMO_GRADES: Record<string, { label: string; minScore: number; bonusKD: number }[]> = {
  "Team Leader":       [{ label: "Bronze", minScore: 60, bonusKD: 25  }, { label: "Silver", minScore: 75, bonusKD: 50  }, { label: "Gold", minScore: 90, bonusKD: 100 }],
  "Supervisor":        [{ label: "Bronze", minScore: 60, bonusKD: 50  }, { label: "Silver", minScore: 75, bonusKD: 100 }, { label: "Gold", minScore: 90, bonusKD: 200 }],
  "Senior Supervisor": [{ label: "Bronze", minScore: 60, bonusKD: 100 }, { label: "Silver", minScore: 75, bonusKD: 200 }, { label: "Gold", minScore: 90, bonusKD: 350 }],
  "Area Manager":      [{ label: "Bronze", minScore: 60, bonusKD: 150 }, { label: "Silver", minScore: 75, bonusKD: 300 }, { label: "Gold", minScore: 90, bonusKD: 500 }],
};

// Fallback tiers used for display when no grade match
const DEMO_TIERS_FALLBACK = [
  { label: "Bronze", minScore: 60, bonusKD: 50 },
  { label: "Silver", minScore: 75, bonusKD: 100 },
  { label: "Gold",   minScore: 90, bonusKD: 200 },
];

function calcTier(adjustedScore: number, tiers?: { label: string; minScore: number; bonusKD: number }[]) {
  const source = tiers || DEMO_TIERS_FALLBACK;
  return [...source].sort((a, b) => b.minScore - a.minScore).find((t) => adjustedScore >= t.minScore) || null;
}

function buildDemoEntry(driverCount: number, rawScore: number, vehicles: { MOTORCYCLE: number; CAR: number }, jobGrade?: string) {
  const { adjustedScore, scoreAdjustment, sizeLabel } = applyAdjustment(rawScore, driverCount, DEMO_ADJUSTMENTS);
  const gradeTiers = jobGrade ? DEMO_GRADES[jobGrade] : undefined;
  const tier = calcTier(adjustedScore, gradeTiers);
  return { driversCount: driverCount, teamScore: rawScore, adjustedScore, scoreAdjustment, sizeLabel, tier: tier?.label || null, bonusKD: tier?.bonusKD || 0, qualified: !!tier, vehicles };
}

// Demo data — one supervisor can span multiple platforms
const DEMO_ROWS = [
  {
    id: "1", name: "Ahmed Al-Rashidi", email: "ahmed@darb.com", jobGrade: "Senior Supervisor",
    platforms: {
      TALABAT:  buildDemoEntry(14, 81.2, { MOTORCYCLE: 10, CAR: 4 }, "Senior Supervisor"),  // 14 → +5 → 86.2
      KEETA:    buildDemoEntry(6,  83.7, { MOTORCYCLE: 5,  CAR: 1 }, "Senior Supervisor"),  // 6 → +0 → 83.7
    },
  },
  {
    id: "2", name: "Sara Al-Mutairi", email: "sara@darb.com", jobGrade: "Supervisor",
    platforms: {
      TALABAT:  buildDemoEntry(11, 73.5, { MOTORCYCLE: 8, CAR: 3 }, "Supervisor"),  // 11 → +5 → 78.5
      AMERICANA:buildDemoEntry(7,  72.1, { MOTORCYCLE: 6, CAR: 1 }, "Supervisor"),  // 7 → +0 → 72.1
    },
  },
  {
    id: "3", name: "Khalid Al-Enezi", email: "khalid@darb.com", jobGrade: "Team Leader",
    platforms: {
      TALABAT:  buildDemoEntry(9, 58.0, { MOTORCYCLE: 7, CAR: 2 }, "Team Leader"),   // 9 → +5 → 63.0
    },
  },
  {
    id: "4", name: "Fatima Al-Sabah", email: "fatima@darb.com", jobGrade: "Area Manager",
    platforms: {
      TALABAT:   buildDemoEntry(12, 79.4, { MOTORCYCLE: 9, CAR: 3 }, "Area Manager"), // 12 → +5 → 84.4
      DELIVEROO: buildDemoEntry(5,  80.2, { MOTORCYCLE: 4, CAR: 1 }, "Area Manager"), // 5 → +0 → 80.2
      KEETA:     buildDemoEntry(4,  90.1, { MOTORCYCLE: 3, CAR: 1 }, "Area Manager"), // 4 → +0 → 90.1
    },
  },
  {
    id: "5", name: "Yousef Al-Kandari", email: "yousef@darb.com", jobGrade: "Team Leader",
    platforms: {
      TALABAT:  buildDemoEntry(7, 55.1, { MOTORCYCLE: 5, CAR: 2 }, "Team Leader"),   // 7 → +0 → 55.1
    },
  },
  {
    id: "6", name: "Maryam Al-Hajri", email: "maryam@darb.com", jobGrade: "Senior Supervisor",
    platforms: {
      TALABAT:   buildDemoEntry(18, 79.8, { MOTORCYCLE: 14, CAR: 4 }, "Senior Supervisor"), // 18 → +10 → 89.8
      AMERICANA: buildDemoEntry(6,  88.5, { MOTORCYCLE: 5,  CAR: 1 }, "Senior Supervisor"), // 6 → +0 → 88.5
    },
  },
  {
    id: "7", name: "Nasser Al-Dousari", email: "nasser@darb.com", jobGrade: "Supervisor",
    platforms: {
      KEETA:    buildDemoEntry(8,  71.3, { MOTORCYCLE: 6, CAR: 2 }, "Supervisor"), // 8 → +5 → 76.3
      AMERICANA:buildDemoEntry(5,  94.1, { MOTORCYCLE: 4, CAR: 1 }, "Supervisor"), // 5 → +0 → 94.1
    },
  },
  {
    id: "8", name: "Hessa Al-Fahad", email: "hessa@darb.com", jobGrade: "Supervisor",
    platforms: {
      KEETA:     buildDemoEntry(9,  83.3, { MOTORCYCLE: 7, CAR: 2 }, "Supervisor"), // 9 → +5 → 88.3
      DELIVEROO: buildDemoEntry(4,  65.7, { MOTORCYCLE: 3, CAR: 1 }, "Supervisor"), // 4 → +0 → 65.7
    },
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const GRADE_BADGE: Record<string, string> = {
  "Team Leader":       "bg-sky-50 text-sky-700",
  "Supervisor":        "bg-violet-50 text-violet-700",
  "Senior Supervisor": "bg-indigo-50 text-indigo-700",
  "Area Manager":      "bg-rose-50 text-rose-700",
};

function ScoreBar({ score, adjustedScore, adjustment, tier }: { score: number; adjustedScore?: number; adjustment?: number; tier: string | null }) {
  const display = adjustedScore ?? score;
  const color = tier === "Gold" ? "bg-amber-400" : tier === "Silver" ? "bg-blue-400" : tier === "Bronze" ? "bg-orange-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="shrink-0">
        <span className="text-sm font-semibold">{display}%</span>
        {adjustment && adjustment > 0 ? (
          <span className="ml-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded" title={`Raw: ${score}% + ${adjustment} team size bonus`}>
            +{adjustment}
          </span>
        ) : null}
      </div>
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(display, 100)}%` }} />
      </div>
    </div>
  );
}

export default function SupervisorsPage() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Fetch all 4 platforms in parallel
  const talabat   = useApiGet<any>(`/api/supervisors/bonuses?platform=TALABAT&month=${month}&year=${year}`);
  const keeta     = useApiGet<any>(`/api/supervisors/bonuses?platform=KEETA&month=${month}&year=${year}`);
  const deliveroo = useApiGet<any>(`/api/supervisors/bonuses?platform=DELIVEROO&month=${month}&year=${year}`);
  const americana = useApiGet<any>(`/api/supervisors/bonuses?platform=AMERICANA&month=${month}&year=${year}`);

  const loading = talabat.loading || keeta.loading || deliveroo.loading || americana.loading;

  // Merge real data from all platforms keyed by supervisor id
  const realByPlatform: Partial<Record<Platform, any[]>> = {
    TALABAT:   talabat.data?.data,
    KEETA:     keeta.data?.data,
    DELIVEROO: deliveroo.data?.data,
    AMERICANA: americana.data?.data,
  };

  // Build merged supervisor rows
  const mergedMap = new Map<string, { id: string; name: string; email: string; platforms: Partial<Record<Platform, any>> }>();
  for (const platform of PLATFORMS) {
    for (const row of (realByPlatform[platform] || [])) {
      const key = row.supervisor.id;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { id: key, name: row.supervisor.name, email: row.supervisor.email, platforms: {} });
      }
      mergedMap.get(key)!.platforms[platform] = row;
    }
  }

  const hasRealData = mergedMap.size > 0;
  const rows = hasRealData ? Array.from(mergedMap.values()) : DEMO_ROWS as any[];
  const isDemo = !hasRealData && !loading;

  const config = (talabat.data?.config || keeta.data?.config || deliveroo.data?.config || americana.data?.config) ?? {
    tiers: [
      { label: "Bronze", minScore: 60, bonusKD: 50 },
      { label: "Silver", minScore: 75, bonusKD: 100 },
      { label: "Gold",   minScore: 90, bonusKD: 200 },
    ],
  };

  // Summary stats
  const totalSupervisors = rows.length;
  const totalPayout = rows.reduce((sum: number, r: any) => {
    return sum + Object.values(r.platforms as Record<string, any>).reduce((s: number, p: any) => s + (p.bonusKD || 0), 0);
  }, 0);
  const qualified = rows.filter((r: any) =>
    Object.values(r.platforms as Record<string, any>).some((p: any) => p.qualified)
  ).length;

  // Use adjustedScore for display (falls back to teamScore if not present)
  const allScores = rows.flatMap((r: any) =>
    Object.values(r.platforms as Record<string, any>)
      .filter((p: any) => (p.adjustedScore ?? p.teamScore) !== null)
      .map((p: any) => (p.adjustedScore ?? p.teamScore) as number)
  );
  const avgScore = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : null;

  const yearOptions: number[] = [];
  for (let y = currentDate.getFullYear(); y >= currentDate.getFullYear() - 3; y--) yearOptions.push(y);

  const sortedTiers = [...(config.tiers || [])].sort((a: any, b: any) => b.minScore - a.minScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Supervisor Bonuses</h1>
            {isDemo && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">Demo</span>
            )}
          </div>
          <p className="text-sm text-secondary mt-1">
            {MONTHS[month - 1]} {year} · All platforms · {totalSupervisors} supervisors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          </div>
          <div className="relative">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-24 mb-4" /><div className="h-8 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                <div className="w-9 h-9 bg-gray-100 rounded-full" />
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-6 bg-gray-100 rounded-lg w-14" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Users size={16} /></div>
                <span className="text-xs font-medium text-secondary">Supervisors</span>
              </div>
              <p className="text-2xl font-bold">{totalSupervisors}</p>
              <p className="text-xs text-secondary mt-1">{qualified} qualified for bonus</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign size={16} /></div>
                <span className="text-xs font-medium text-secondary">Total Payout</span>
              </div>
              <p className="text-2xl font-bold">{totalPayout} <span className="text-base font-medium text-secondary">KD</span></p>
              <p className="text-xs text-secondary mt-1">{MONTHS[month - 1]} {year} · all platforms</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><TrendingUp size={16} /></div>
                <span className="text-xs font-medium text-secondary">Avg Team Score</span>
              </div>
              <p className="text-2xl font-bold">{avgScore !== null ? `${avgScore}%` : "—"}</p>
              <p className="text-xs text-secondary mt-1">Across all platforms</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600"><Award size={16} /></div>
                <span className="text-xs font-medium text-secondary">Qualification Rate</span>
              </div>
              <p className="text-2xl font-bold">{totalSupervisors > 0 ? `${Math.round((qualified / totalSupervisors) * 100)}%` : "—"}</p>
              <p className="text-xs text-secondary mt-1">{qualified} of {totalSupervisors} supervisors</p>
            </div>
          </div>

          {/* Tier Summary Strip */}
          <div className="grid grid-cols-3 gap-3">
            {sortedTiers.map((tier: any) => {
              const style = TIER_STYLES[tier.label] || { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-300", border: "border-gray-200" };
              const count = rows.filter((r: any) =>
                Object.values(r.platforms as Record<string, any>).some((p: any) => p.tier === tier.label)
              ).length;
              const payout = rows.reduce((sum: number, r: any) =>
                sum + Object.values(r.platforms as Record<string, any>)
                  .filter((p: any) => p.tier === tier.label)
                  .reduce((s: number, p: any) => s + (p.bonusKD || 0), 0), 0);
              return (
                <div key={tier.label} className={cn("flex items-center justify-between px-5 py-4 rounded-2xl border shadow-sm", style.bg, style.border)}>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-3 h-3 rounded-full", style.dot)} />
                    <div>
                      <p className={cn("text-sm font-semibold", style.text)}>{tier.label}</p>
                      <p className={cn("text-xs mt-0.5", style.text)}>≥ {tier.minScore}% · {tier.bonusKD} KD</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xl font-bold", style.text)}>{count}</p>
                    <p className={cn("text-xs", style.text)}>{payout} KD total</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Supervisor Breakdown</h2>
              <p className="text-xs text-secondary">Click a row to see per-platform breakdown</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3 w-8" />
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Supervisor</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Grade</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Platforms</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Total Drivers</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Avg Score</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Best Tier</th>
                  <th className="text-right text-xs font-medium text-secondary px-5 py-3">Total Bonus</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const platformEntries = Object.entries(row.platforms as Record<string, any>) as [Platform, any][];
                  const totalDrivers = platformEntries.reduce((s, [, p]) => s + (p.driversCount || 0), 0);
                  const validScores = platformEntries
                    .filter(([, p]) => (p.adjustedScore ?? p.teamScore) !== null)
                    .map(([, p]) => (p.adjustedScore ?? p.teamScore) as number);
                  const rowAvgScore = validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 : null;
                  const rowAvgAdj = platformEntries.filter(([, p]) => p.scoreAdjustment > 0).length > 0
                    ? Math.round(platformEntries.filter(([, p]) => p.scoreAdjustment).reduce((s, [, p]) => s + (p.scoreAdjustment || 0), 0) / platformEntries.length * 10) / 10
                    : 0;
                  const totalBonus = platformEntries.reduce((s, [, p]) => s + (p.bonusKD || 0), 0);
                  const isQualified = platformEntries.some(([, p]) => p.qualified);
                  const tierRank: Record<string, number> = { Gold: 3, Silver: 2, Bronze: 1 };
                  const bestTier = platformEntries
                    .map(([, p]) => p.tier)
                    .filter(Boolean)
                    .sort((a, b) => (tierRank[b] || 0) - (tierRank[a] || 0))[0] || null;
                  const tierStyle = bestTier ? TIER_STYLES[bestTier] : null;
                  const isOpen = expanded[row.id];

                  return (
                    <>
                      {/* Main row */}
                      <tr
                        key={row.id}
                        onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3.5 w-8">
                          <ChevronRight size={14} className={cn("text-secondary transition-transform duration-200", isOpen && "rotate-90")} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-secondary shrink-0">
                              {getInitials(row.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{row.name}</p>
                              <p className="text-xs text-secondary">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {row.jobGrade ? (
                            <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold", GRADE_BADGE[row.jobGrade] || "bg-gray-100 text-gray-600")}>
                              {row.jobGrade}
                            </span>
                          ) : (
                            <span className="text-xs text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {platformEntries.map(([p]) => (
                              <span key={p} className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1", PLATFORM_BG[p], PLATFORM_COLORS[p], PLATFORM_RING[p])}>
                                {PLATFORM_LABELS[p]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                            <Users size={13} className="text-secondary" />
                            {totalDrivers}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {rowAvgScore !== null ? (
                            <ScoreBar score={rowAvgScore} adjustment={rowAvgAdj > 0 ? rowAvgAdj : undefined} tier={bestTier} />
                          ) : (
                            <span className="text-xs text-secondary italic">No data</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {bestTier && tierStyle ? (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border", tierStyle.bg, tierStyle.text, tierStyle.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", tierStyle.dot)} />
                              {bestTier}
                            </span>
                          ) : <span className="text-xs text-secondary">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {totalBonus > 0 ? (
                            <span className="text-sm font-bold text-emerald-600">{totalBonus} KD</span>
                          ) : (
                            <span className="text-sm text-gray-300 font-medium">0 KD</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {isQualified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700">
                              <CheckCircle2 size={12} /> Qualified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-400">
                              <XCircle size={12} /> Not Qualified
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded per-platform breakdown */}
                      {isOpen && (
                        <tr key={`${row.id}-expanded`} className="bg-gray-50/80 border-b border-gray-100">
                          <td colSpan={9} className="px-5 py-3">
                            <div className="ml-8 space-y-2">
                              <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide mb-2">Platform Breakdown</p>
                              <div className="grid grid-cols-2 gap-2">
                                {platformEntries.map(([p, data]) => {
                                  const ps = data.tier ? (TIER_STYLES[data.tier] || { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", border: "border-gray-200" }) : null;
                                  const moto = data.vehicles?.MOTORCYCLE ?? "—";
                                  const car = data.vehicles?.CAR ?? "—";
                                  return (
                                    <div key={p} className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 border border-gray-100">
                                      <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 shrink-0", PLATFORM_BG[p], PLATFORM_COLORS[p], PLATFORM_RING[p])}>
                                        {PLATFORM_LABELS[p]}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-xs text-secondary shrink-0">
                                        <Users size={11} />{data.driversCount}
                                      </div>
                                      <div className="flex items-center gap-2.5 text-xs text-secondary shrink-0">
                                        <span className="flex items-center gap-1"><Bike size={11} />{moto}</span>
                                        <span className="flex items-center gap-1"><Car size={11} />{car}</span>
                                      </div>
                                      {data.sizeLabel && (
                                        <span className="text-[10px] font-medium text-secondary bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                          {data.sizeLabel}
                                        </span>
                                      )}
                                      <div className="flex-1">
                                        {data.teamScore !== null ? (
                                          <ScoreBar
                                            score={data.teamScore}
                                            adjustedScore={data.adjustedScore}
                                            adjustment={data.scoreAdjustment > 0 ? data.scoreAdjustment : undefined}
                                            tier={data.tier}
                                          />
                                        ) : <span className="text-xs text-secondary italic">No data</span>}
                                      </div>
                                      {data.tier && ps ? (
                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border shrink-0", ps.bg, ps.text, ps.border)}>
                                          <span className={cn("w-1.5 h-1.5 rounded-full", ps.dot)} />
                                          {data.tier}
                                        </span>
                                      ) : <span className="text-xs text-secondary shrink-0">—</span>}
                                      {data.bonusKD > 0 ? (
                                        <span className="text-sm font-bold text-emerald-600 shrink-0">{data.bonusKD} KD</span>
                                      ) : (
                                        <span className="text-xs text-gray-300 shrink-0">{data.reason || "0 KD"}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
