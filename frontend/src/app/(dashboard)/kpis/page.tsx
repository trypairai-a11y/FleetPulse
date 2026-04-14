"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import {
  Target,
  Users,
  TrendingUp,
  Clock,
  Package,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Award,
  AlertTriangle,
} from "lucide-react";

function n(v: any): number {
  return v != null ? Number(v) : 0;
}

function ScoreBar({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 100
      ? "bg-green-400"
      : pct >= 80
        ? "bg-emerald-400"
        : pct >= 60
          ? "bg-amber-400"
          : "bg-red-400";
  const h = size === "lg" ? "h-2.5" : "h-1.5";
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 bg-gray-100 rounded-full", h, "w-20")}>
        <div
          className={cn("rounded-full transition-all", h, color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-mono font-medium",
          pct >= 100 ? "text-green-600" : pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-500"
        )}
      >
        {score.toFixed(0)}%
      </span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    ATTENDANCE: "bg-blue-50 text-blue-600",
    ORDERS: "bg-purple-50 text-purple-600",
    DELIVERY_EFFICIENCY: "bg-orange-50 text-orange-600",
    FINANCIAL: "bg-green-50 text-green-600",
    COMPLIANCE: "bg-red-50 text-red-600",
    CUSTOM: "bg-gray-50 text-gray-600",
  };
  const labels: Record<string, string> = {
    ATTENDANCE: "Attendance",
    ORDERS: "Orders",
    DELIVERY_EFFICIENCY: "Efficiency",
    FINANCIAL: "Financial",
    COMPLIANCE: "Compliance",
    CUSTOM: "Custom",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium uppercase", styles[category] || styles.CUSTOM)}>
      {labels[category] || category}
    </span>
  );
}

function PlatformDot({ platform }: { platform: string | null }) {
  if (!platform) return <span className="text-[10px] text-secondary">All</span>;
  const colors: Record<string, string> = {
    TALABAT: "bg-talabat",
    KEETA: "bg-keeta",
    DELIVEROO: "bg-deliveroo",
    AMERICANA: "bg-americana",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", colors[platform])} />
      <span className="text-xs text-secondary capitalize">{platform.toLowerCase()}</span>
    </span>
  );
}

function formatValue(value: number, unit: string): string {
  switch (unit) {
    case "PERCENTAGE":
      return `${value.toFixed(1)}%`;
    case "MINUTES":
      return `${value.toFixed(0)}m`;
    case "HOURS":
      return `${value.toFixed(1)}h`;
    case "CURRENCY":
      return `${value.toFixed(3)} KD`;
    default:
      return `${value}`;
  }
}

const CATEGORY_ICONS: Record<string, typeof Target> = {
  ATTENDANCE: Clock,
  ORDERS: Package,
  DELIVERY_EFFICIENCY: TrendingUp,
  FINANCIAL: Award,
  COMPLIANCE: ShieldCheck,
  CUSTOM: Target,
};

export default function KpisPage() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  const platformFilter = filters.platform || "";
  const searchFilter = filters.search || "";

  const summaryParams = new URLSearchParams({ dateFrom, dateTo });
  if (platformFilter) summaryParams.set("platform", platformFilter);

  const driverParams = new URLSearchParams({ dateFrom, dateTo, limit: "100" });
  if (platformFilter) driverParams.set("platform", platformFilter);
  if (searchFilter) driverParams.set("search", searchFilter);

  const { data: summary } = useApiGet<any>(`/api/kpi/summary?${summaryParams}`);
  const { data: driversData, loading } = useApiGet<any>(`/api/kpi/drivers?${driverParams}`);
  const drivers: any[] = driversData?.data || [];

  const kpis: any[] = summary?.kpis || [];

  const prevDay = () => {
    const d = new Date(dateFrom);
    d.setDate(d.getDate() - 1);
    const str = d.toISOString().split("T")[0];
    setDateFrom(str);
    setDateTo(str);
  };

  const nextDay = () => {
    const d = new Date(dateFrom);
    d.setDate(d.getDate() + 1);
    const str = d.toISOString().split("T")[0];
    setDateFrom(str);
    setDateTo(str);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Target size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">KPI Dashboard</h1>
            <p className="text-sm text-secondary">Track driver performance across all platforms</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Tracked Drivers"
          value={summary?.totalDrivers ?? 0}
          icon={Users}
        />
        <StatCard
          title="Overall KPI Score"
          value={`${n(summary?.overallScore).toFixed(0)}%`}
          icon={TrendingUp}
          highlight={n(summary?.overallScore) < 70}
        />
        <StatCard
          title="KPI Records"
          value={summary?.totalRecords ?? 0}
          icon={Target}
        />
        <StatCard
          title="Active KPIs"
          value={kpis.length}
          icon={Award}
        />
      </div>

      {/* KPI Category Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi: any) => {
            const Icon = CATEGORY_ICONS[kpi.category] || Target;
            return (
              <div
                key={kpi.id}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-50 rounded-lg">
                      <Icon size={14} className="text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{kpi.name}</p>
                      <PlatformDot platform={kpi.platform} />
                    </div>
                  </div>
                  <CategoryBadge category={kpi.category} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-secondary">
                      Avg: <span className="font-mono font-medium text-foreground">{formatValue(kpi.avgValue, kpi.unit)}</span>
                    </span>
                    {kpi.target && (
                      <span className="text-xs text-secondary">
                        Target: <span className="font-mono font-medium">{formatValue(kpi.target, kpi.unit)}</span>
                      </span>
                    )}
                  </div>
                  <ScoreBar score={kpi.avgScore} size="lg" />
                  <div className="flex justify-between text-[10px] text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {kpi.driversAboveTarget} above target
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {kpi.driversBelowTarget} below target
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Date picker & Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <button onClick={prevDay} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setDateTo(e.target.value); }}
            className="text-sm font-medium border-0 focus:outline-none bg-transparent"
          />
          <button onClick={nextDay} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <FilterBar
          filters={[
            {
              key: "platform",
              type: "select",
              label: "Platform",
              options: [
                { value: "", label: "All Platforms" },
                { value: "TALABAT", label: "Talabat" },
                { value: "KEETA", label: "Keeta" },
                { value: "DELIVEROO", label: "Deliveroo" },
                { value: "AMERICANA", label: "Americana" },
              ],
            },
            {
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search driver...",
            },
          ]}
          values={filters}
          onChange={(k, v) => setFilters({ ...filters, [k]: v })}
        />
      </div>

      {/* Driver KPI Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Platform</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Zone</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Overall Score</th>
                <th className="text-right text-xs font-medium text-secondary px-5 py-3">KPIs Tracked</th>
                <th className="text-center text-xs font-medium text-secondary px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">
                    {loading
                      ? "Loading..."
                      : "No KPI data found. Use the compute endpoint to generate KPIs from existing data."}
                  </td>
                </tr>
              ) : (
                drivers.map((driver: any) => (
                  <tr
                    key={driver.id}
                    onClick={() => setSelected(driver)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium">{cleanDriverName(driver.name)}</p>
                      <p className="text-[11px] text-secondary">{driver.company?.name || "-"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <PlatformDot platform={driver.platform} />
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary">{driver.zone || "-"}</td>
                    <td className="px-5 py-3">
                      {driver.overallScore != null ? (
                        <ScoreBar score={driver.overallScore} />
                      ) : (
                        <span className="text-xs text-secondary">No data</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-mono text-secondary">
                      {driver.kpis?.length || 0}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {driver.overallScore != null ? (
                        driver.overallScore >= 100 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-green-50 text-green-600">
                            <TrendingUp size={10} /> On Target
                          </span>
                        ) : driver.overallScore >= 70 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-600">
                            <AlertTriangle size={10} /> Needs Improvement
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-50 text-red-600">
                            <AlertTriangle size={10} /> Below Target
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight size={15} className="text-gray-300" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || "Driver KPIs"}
        subtitle={`${selected?.platform || "All"} - KPI Breakdown`}
      >
        {selected && (
          <div className="space-y-5">
            {/* Driver Info */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">Driver</p>
              <p className="text-lg font-semibold">{selected.name}</p>
              <p className="text-sm text-secondary mt-0.5">
                {selected.company?.name || "-"} &middot; {selected.zone || "No zone"} &middot; {dateFrom}
              </p>
            </div>

            {/* Overall Score */}
            {selected.overallScore != null && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary font-medium uppercase">Overall KPI Score</p>
                  <span className={cn(
                    "text-2xl font-bold font-mono",
                    selected.overallScore >= 100 ? "text-green-600" : selected.overallScore >= 70 ? "text-amber-600" : "text-red-500"
                  )}>
                    {n(selected.overallScore).toFixed(0)}%
                  </span>
                </div>
                <ScoreBar score={selected.overallScore} size="lg" />
              </div>
            )}

            {/* Individual KPIs */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-secondary uppercase tracking-wide">KPI Breakdown</p>
              {selected.kpis && selected.kpis.length > 0 ? (
                selected.kpis.map((kpi: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium">{kpi.name}</p>
                      <span className="text-sm font-mono font-medium">
                        {formatValue(kpi.value, kpi.unit)}
                      </span>
                    </div>
                    {kpi.target && (
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-secondary">
                          Target: {formatValue(kpi.target, kpi.unit)}
                        </span>
                      </div>
                    )}
                    {kpi.score != null && <ScoreBar score={kpi.score} />}
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary py-4 text-center">No KPI records for this period</p>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
