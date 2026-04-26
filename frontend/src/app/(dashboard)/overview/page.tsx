"use client";
import Link from "next/link";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import PlatformBadge from "@/components/shared/PlatformBadge";
import {
  Users, CheckCircle2, DollarSign, UserX, AlertTriangle, CheckCircle,
  Sparkles, ChevronDown, ChevronUp, RefreshCw, ArrowRight, TrendingUp, TrendingDown, Minus, X,
} from "lucide-react";
import InsightBanner from "@/components/shared/InsightBanner";
import InlineChat from "@/components/ai/InlineChat";
import { cn } from "@/lib/cn";
import { useState, useMemo, useEffect } from "react";
import api from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, formatTime } from "@/i18n/format";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  driver?: { name: string; platform: string };
  status: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  platform: string;
  companyId: string;
  photoUrl?: string | null;
  status: string;
  company?: { id: string; name: string };
}

interface Company {
  id: string;
  name: string;
  platform: string;
}

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-gray-400",
};
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const PLATFORM_COLORS: Record<string, { bg: string; line: string; chip: string }> = {
  KEETA:     { bg: "#FEF3C7", line: "#F59E0B", chip: "bg-amber-100 text-amber-800" },
  TALABAT:   { bg: "#FECACA", line: "#EF4444", chip: "bg-red-100 text-red-800" },
  DELIVEROO: { bg: "#A7F3D0", line: "#10B981", chip: "bg-emerald-100 text-emerald-800" },
  AMERICANA: { bg: "#BFDBFE", line: "#3B82F6", chip: "bg-blue-100 text-blue-800" },
};

function ymd(d: Date) { return d.toLocaleDateString("en-CA"); }

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [companyId, setCompanyId] = useState<string>("ALL");
  const [inactiveModalOpen, setInactiveModalOpen] = useState(false);

  const today = new Date();
  const todayStr = ymd(today);
  const ydayDate = new Date(today); ydayDate.setDate(ydayDate.getDate() - 1);
  const ydayStr = ymd(ydayDate);

  // Calendar-month boundaries
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  // 3-days-ago boundary for inactive computation
  const threeDaysAgo = new Date(today); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = ymd(threeDaysAgo);

  const companyParam = companyId !== "ALL" ? `&companyId=${companyId}` : "";
  const companyOnlyParam = companyId !== "ALL" ? `?companyId=${companyId}` : "";

  const { data: companiesData } = useApiGet<{ data: Company[] } | Company[]>("/api/companies");
  const { data: driversData } = useApiGet<{ data: Driver[]; pagination: { total: number } }>(
    `/api/drivers?limit=500${companyParam}`,
  );
  const { data: alertsData } = useApiGet<{ data: Alert[]; pagination: any }>("/api/alerts?status=ACTIVE&limit=50");
  const { data: digest, refetch: refetchDigest } = useApiGet<any>("/api/ai/digest");
  const { data: cashData } = useApiGet<any>(`/api/cash?status=PENDING&limit=500${companyParam}`);
  const { data: shiftsCompleted } = useApiGet<{ pagination: { total: number } }>(
    `/api/shifts?status=COMPLETED&dateFrom=${todayStr}&dateTo=${todayStr}&limit=1${companyParam}`,
  );
  const { data: ordersToday } = useApiGet<any>(`/api/orders/summary?dateFrom=${todayStr}&dateTo=${todayStr}${companyParam}`);
  const { data: ordersYesterday } = useApiGet<any>(`/api/orders/summary?dateFrom=${ydayStr}&dateTo=${ydayStr}${companyParam}`);
  const { data: attendanceSummary } = useApiGet<any>(`/api/attendance/summary${companyOnlyParam}`);

  // Recent OrderLog rows (driverIds in last 3 days) — used to compute inactive list
  const { data: recentOrders } = useApiGet<{ data: { driverId: string }[] }>(
    `/api/orders?dateFrom=${threeDaysAgoStr}&dateTo=${todayStr}&limit=5000${companyParam}`,
  );

  // Per-platform daily aggregates: this month + last month
  const { data: ordersThisMonth } = useApiGet<{ data: any[] }>(
    `/api/orders?dateFrom=${ymd(monthStart)}&dateTo=${todayStr}&limit=10000${companyParam}`,
  );
  const { data: ordersLastMonth } = useApiGet<{ data: any[] }>(
    `/api/orders?dateFrom=${ymd(lastMonthStart)}&dateTo=${ymd(lastMonthEnd)}&limit=10000${companyParam}`,
  );

  const handleRefreshDigest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      await api.post("/api/ai/digest/generate");
      await refetchDigest();
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  };

  const companies: Company[] = Array.isArray(companiesData)
    ? companiesData
    : (companiesData as any)?.data ?? [];

  const allDrivers: Driver[] = driversData?.data ?? [];
  const totalDrivers = driversData?.pagination?.total ?? allDrivers.length;
  const alerts = alertsData?.data || [];
  const completedToday = shiftsCompleted?.pagination?.total || 0;
  const pendingCash = (cashData?.data || []).reduce(
    (s: number, r: any) => s + Number(r.pendingDues || 0),
    0,
  );

  // Inactive >3 days: drivers with no OrderLog rows in last 3 days
  const activeDriverIds = useMemo(
    () => new Set((recentOrders?.data || []).map((o: any) => o.driverId)),
    [recentOrders],
  );
  const inactiveDrivers = useMemo(
    () => allDrivers.filter((d) => d.status === "ACTIVE" && !activeDriverIds.has(d.id)),
    [allDrivers, activeDriverIds],
  );

  // Order counts (today vs yesterday)
  const todayOrderCount = Number(ordersToday?.totalDeliveries ?? 0);
  const ydayOrderCount = Number(ordersYesterday?.totalDeliveries ?? 0);
  const dodPct = ydayOrderCount > 0
    ? Math.round(((todayOrderCount - ydayOrderCount) / ydayOrderCount) * 100)
    : null;

  const presentRate = useMemo(() => {
    const present = attendanceSummary?.present ?? 0;
    const total = (attendanceSummary?.present ?? 0) + (attendanceSummary?.late ?? 0) + (attendanceSummary?.absent ?? 0);
    return total > 0 ? Math.round((present / total) * 100) : null;
  }, [attendanceSummary]);

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort(
      (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0),
    );
  }, [alerts]);
  const visibleAlerts = showAllAlerts ? sortedAlerts : sortedAlerts.slice(0, 5);

  const headline = useMemo(() => {
    if (alerts.length === 0) return "Quiet morning. All systems green.";
    const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
    if (critical > 0) return `${critical} critical alert${critical > 1 ? "s" : ""} need your attention.`;
    if (alerts.length >= 10) return `Active morning — ${alerts.length} alerts to triage.`;
    return `Steady morning. ${alerts.length} alert${alerts.length > 1 ? "s" : ""} open.`;
  }, [alerts]);

  // Per-platform charts: total this month vs last month + 30-day daily series
  const platformCharts = useMemo(() => {
    const platforms = ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"];
    const tm = ordersThisMonth?.data || [];
    const lm = ordersLastMonth?.data || [];
    return platforms.map((platform) => {
      const tmRows = tm.filter((r: any) => r.platform === platform);
      const lmRows = lm.filter((r: any) => r.platform === platform);
      const tmTotal = tmRows.reduce((s: number, r: any) => s + (r.orderCount || 0), 0);
      const lmTotal = lmRows.reduce((s: number, r: any) => s + (r.orderCount || 0), 0);
      const change = lmTotal > 0 ? Math.round(((tmTotal - lmTotal) / lmTotal) * 100) : null;

      // Daily series for this calendar month
      const dayMap = new Map<string, number>();
      for (const r of tmRows) {
        const d = ymd(new Date(r.date));
        dayMap.set(d, (dayMap.get(d) || 0) + (r.orderCount || 0));
      }
      const series: { day: string; orders: number }[] = [];
      const cursor = new Date(monthStart);
      while (cursor <= today) {
        const k = ymd(cursor);
        series.push({ day: k.slice(5), orders: dayMap.get(k) || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
      return { platform, tmTotal, lmTotal, change, series };
    });
  }, [ordersThisMonth, ordersLastMonth, monthStart, today]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (inactiveModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [inactiveModalOpen]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Company filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterChip active={companyId === "ALL"} onClick={() => setCompanyId("ALL")}>
          All Companies
        </FilterChip>
        {companies.map((c) => (
          <FilterChip key={c.id} active={companyId === c.id} onClick={() => setCompanyId(c.id)}>
            {c.name}
          </FilterChip>
        ))}
      </div>

      {/* Morning Briefing */}
      {digest && (
        <div className="bg-gradient-to-r from-primary/5 to-blue-50 rounded-2xl p-5 border border-primary/10">
          <button
            onClick={() => setBriefingOpen(!briefingOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("overview.morningBriefing")}</span>
              <span className="text-[10px] text-secondary">
                {digest.date ? formatDate(digest.date, locale) : t("labels.today")}
              </span>
              <button
                onClick={handleRefreshDigest}
                disabled={refreshing}
                className="ms-1 p-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                title={t("overview.regenerateDigest")}
                aria-label={t("overview.regenerateDigest")}
              >
                <RefreshCw size={13} className={cn("text-secondary", refreshing && "animate-spin")} />
              </button>
            </div>
            {briefingOpen ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
          </button>

          {briefingOpen && (
            <div className="mt-3 space-y-3">
              <p className="text-base font-semibold text-foreground leading-snug">{headline}</p>

              <div className="flex flex-wrap gap-2">
                <Chip label="Orders today" value={todayOrderCount.toLocaleString()} trendPct={dodPct} />
                <Chip label="Shifts completed" value={`${completedToday}`} />
                <Chip label="Attendance" value={presentRate != null ? `${presentRate}%` : "—"} />
              </div>

              {digest.content?.recommendations?.length > 0 && (
                <div className="pt-3 border-t border-primary/10">
                  <p className="text-[10px] font-medium text-secondary uppercase mb-1.5">{t("overview.recommendations")}</p>
                  <ul className="space-y-1">
                    {digest.content.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-primary flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline Darb AI chat — directly under Morning Briefing */}
      <InlineChat />

      {/* AI Insights */}
      <InsightBanner context="dashboard" maxInsights={3} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/companies" className="contents">
          <StatCard title={t("overview.totalDrivers")} value={totalDrivers} icon={Users} />
        </Link>
        <Link href="/attendance" className="contents">
          <StatCard title="Shifts Completed" value={completedToday} icon={CheckCircle2} />
        </Link>
        <Link href="/talabat/cash" className="contents">
          <StatCard
            title="Overdue Cash"
            value={formatCurrency(pendingCash, locale)}
            icon={DollarSign}
            highlight={pendingCash > 0}
          />
        </Link>
        <button onClick={() => setInactiveModalOpen(true)} className="contents text-left">
          <StatCard
            title="Inactive >3 Days"
            value={inactiveDrivers.length}
            icon={UserX}
            highlight={inactiveDrivers.length > 0}
          />
        </button>
      </div>

      {/* Per-platform charts — positioned above alerts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Orders · this month vs last
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {platformCharts.map((p) => (
            <PlatformChartCard key={p.platform} {...p} />
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("overview.todaysAlerts")}
            {alerts.length > 0 && (
              <span className="ms-2 text-xs font-medium text-red-600">{alerts.length} open</span>
            )}
          </h2>
          {sortedAlerts.length > 5 && (
            <button
              onClick={() => setShowAllAlerts((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {showAllAlerts ? "Show top 5" : `View all (${sortedAlerts.length})`}
              <ArrowRight size={12} />
            </button>
          )}
        </div>
        {sortedAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
            <p className="text-sm font-medium text-foreground">{t("overview.allClear")}</p>
            <p className="text-xs text-secondary mt-1">{t("overview.noActiveAlerts")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200"
              >
                <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", SEVERITY_DOT[alert.severity])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-secondary mt-0.5 truncate">{alert.message}</p>
                </div>
                {alert.driver && <PlatformBadge platform={alert.driver.platform} />}
                <span className="text-xs text-secondary whitespace-nowrap">
                  {formatTime(alert.createdAt, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive drivers modal */}
      {inactiveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setInactiveModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-foreground">Inactive drivers</h3>
                <p className="text-xs text-secondary mt-0.5">No completed orders in the last 3 days · {inactiveDrivers.length} found</p>
              </div>
              <button
                onClick={() => setInactiveModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {inactiveDrivers.length === 0 ? (
                <div className="text-center py-12 text-sm text-secondary">
                  Everyone has been active in the last 3 days.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {inactiveDrivers.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50">
                      {d.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.photoUrl} alt={d.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500">
                          {d.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                        <p className="text-[11px] text-secondary truncate">{d.company?.name ?? "—"}</p>
                      </div>
                      <PlatformBadge platform={d.platform} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
        active
          ? "bg-gray-900 text-white shadow-sm"
          : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-gray-300",
      )}
    >
      {children}
    </button>
  );
}

function Chip({ label, value, trendPct }: { label: string; value: string; trendPct?: number | null }) {
  const TrendIcon = trendPct == null ? null : trendPct > 0 ? TrendingUp : trendPct < 0 ? TrendingDown : Minus;
  const trendColor = trendPct == null ? "" : trendPct > 0 ? "text-green-600" : trendPct < 0 ? "text-red-600" : "text-gray-500";
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur ring-1 ring-primary/10 px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-secondary">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
      {TrendIcon && (
        <span className={cn("inline-flex items-center gap-0.5 text-[11px]", trendColor)}>
          <TrendIcon size={11} />
          {Math.abs(trendPct!)}%
        </span>
      )}
    </span>
  );
}

function PlatformChartCard({ platform, tmTotal, lmTotal, change, series }:
  { platform: string; tmTotal: number; lmTotal: number; change: number | null; series: { day: string; orders: number }[] }) {
  const colors = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.KEETA;
  const TrendIcon = change == null ? Minus : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change == null ? "text-gray-500" : change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500";
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", colors.chip)}>
          {platform}
        </span>
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", trendColor)}>
          <TrendIcon size={12} />
          {change == null ? "—" : `${Math.abs(change)}%`}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-secondary">This month</p>
          <p className="text-2xl font-display tracking-tight">{tmTotal.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-secondary">Last month</p>
          <p className="text-sm font-medium text-gray-500">{lmTotal.toLocaleString()}</p>
        </div>
      </div>
      <div className="h-16 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.line} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 8 }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(v: any) => [`${v} orders`, ""]}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke={colors.line}
              strokeWidth={2}
              fill={`url(#g-${platform})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
