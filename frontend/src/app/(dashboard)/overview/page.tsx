"use client";
import Link from "next/link";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import PlatformBadge from "@/components/shared/PlatformBadge";
import {
  Users, CheckCircle2, DollarSign, AlertTriangle, CheckCircle,
  Sparkles, ChevronDown, ChevronUp, RefreshCw, ArrowRight, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import InsightBanner from "@/components/shared/InsightBanner";
import { cn } from "@/lib/cn";
import { useState, useMemo } from "react";
import api from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatDate, formatTime } from "@/i18n/format";

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

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-gray-400",
};
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const todayStr = todayISO();
  const ydayStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-CA");
  }, []);

  const { data: alertsData } = useApiGet<{ data: Alert[]; pagination: any }>("/api/alerts?status=ACTIVE&limit=50");
  const { data: driversData } = useApiGet<{ pagination: { total: number } }>("/api/drivers?limit=1");
  const { data: digest, refetch: refetchDigest } = useApiGet<any>("/api/ai/digest");
  const { data: cashData } = useApiGet<any>("/api/cash?status=PENDING&limit=500");
  const { data: shiftsCompleted } = useApiGet<{ pagination: { total: number } }>(
    `/api/shifts?status=COMPLETED&dateFrom=${todayStr}&dateTo=${todayStr}&limit=1`,
  );
  const { data: ordersToday } = useApiGet<any>(`/api/orders/summary?dateFrom=${todayStr}&dateTo=${todayStr}`);
  const { data: ordersYesterday } = useApiGet<any>(`/api/orders/summary?dateFrom=${ydayStr}&dateTo=${ydayStr}`);
  const { data: attendanceSummary } = useApiGet<any>("/api/attendance/summary");

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

  const alerts = alertsData?.data || [];
  const totalDrivers = driversData?.pagination?.total || 0;
  const completedToday = shiftsCompleted?.pagination?.total || 0;
  const pendingCash = (cashData?.data || []).reduce((s: number, r: any) => s + Number(r.pendingDues || 0), 0);

  const todayOrderCount = Number(ordersToday?.totalOrders ?? ordersToday?.total ?? 0);
  const ydayOrderCount = Number(ordersYesterday?.totalOrders ?? ordersYesterday?.total ?? 0);
  const dodPct = ydayOrderCount > 0 ? Math.round(((todayOrderCount - ydayOrderCount) / ydayOrderCount) * 100) : null;

  const presentRate = useMemo(() => {
    const present = attendanceSummary?.present ?? 0;
    const total = (attendanceSummary?.present ?? 0) + (attendanceSummary?.late ?? 0) + (attendanceSummary?.absent ?? 0);
    return total > 0 ? Math.round((present / total) * 100) : null;
  }, [attendanceSummary]);

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0));
  }, [alerts]);
  const visibleAlerts = showAllAlerts ? sortedAlerts : sortedAlerts.slice(0, 5);

  const headline = useMemo(() => {
    if (alerts.length === 0) return "Quiet morning. All systems green.";
    const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
    if (critical > 0) return `${critical} critical alert${critical > 1 ? "s" : ""} need your attention.`;
    if (alerts.length >= 10) return `Active morning — ${alerts.length} alerts to triage.`;
    return `Steady morning. ${alerts.length} alert${alerts.length > 1 ? "s" : ""} open.`;
  }, [alerts]);

  return (
    <div className="space-y-6 max-w-6xl">
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
                <Chip
                  label="Orders today"
                  value={todayOrderCount.toLocaleString()}
                  trendPct={dodPct}
                />
                <Chip
                  label="Shifts completed"
                  value={`${completedToday}`}
                />
                <Chip
                  label="Attendance"
                  value={presentRate != null ? `${presentRate}%` : "—"}
                />
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

      {/* AI Insights */}
      <InsightBanner context="dashboard" maxInsights={3} />

      {/* Stat Cards — clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/companies" className="contents">
          <StatCard title={t("overview.totalDrivers")} value={totalDrivers} icon={Users} />
        </Link>
        <Link href={`/attendance`} className="contents">
          <StatCard title="Shifts Completed Today" value={completedToday} icon={CheckCircle2} />
        </Link>
        <Link href="/talabat/cash" className="contents">
          <StatCard title="Overdue Cash" value={formatCurrency(pendingCash, locale)} icon={DollarSign} highlight={pendingCash > 0} />
        </Link>
        <Link href="/tickets" className="contents">
          <StatCard
            title={t("overview.openAlerts")}
            value={alerts.length}
            icon={AlertTriangle}
            highlight={alerts.length > 0}
          />
        </Link>
      </div>

      {/* Alerts */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t("overview.todaysAlerts")}</h2>
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
    </div>
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
