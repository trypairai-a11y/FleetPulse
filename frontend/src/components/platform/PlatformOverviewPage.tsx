"use client";
import { useState, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import StatCard from "@/components/shared/StatCard";
import {
  AlertTriangle, Users, TrendingUp,
  TrendingDown, Minus, ChevronRight, ShieldAlert, ArrowUpRight, Search,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

// ─── Config types ───────────────────────────────────────────────────────────

export interface KpiCardConfig {
  title: string;
  value: (summary: any) => string | number;
  icon: LucideIcon;
  trend?: (summary: any) => string;
  highlight?: (summary: any) => boolean;
  onClick?: (router: ReturnType<typeof useRouter>) => void;
}

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  render: (driver: any) => ReactNode;
  headerRender?: (router: ReturnType<typeof useRouter>, platformKey: string) => ReactNode;
}

export interface Props {
  platform: string;
  platformKey: string;
  platformLabel: string;
  platformColor: string;
  /** Override the API endpoint. Defaults to `/api/platform-overview/${platform}` */
  apiEndpoint?: string;
  /** Extra KPI cards above the table. Defaults to UTR, Active Drivers, Active Violations. */
  kpiCards?: KpiCardConfig[];
  /** Widgets rendered between KPI cards and the driver table */
  middleSlot?: (data: { drivers: any[]; summary: any; loading: boolean }) => ReactNode;
  /** Custom column definitions for the driver table. Defaults shown if omitted. */
  columns?: ColumnConfig[];
  /** Enable search bar above the driver table */
  searchable?: boolean;
  /** Enable Show All / Show Less toggle (first 15) */
  paginated?: boolean;
  /** Number of KPI card grid columns. Default 3. */
  kpiGridCols?: number;
}

// ─── Grade helpers ──────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  excellent: "text-green-600 bg-green-50",
  good: "text-blue-600 bg-blue-50",
  average: "text-yellow-600 bg-yellow-50",
  below: "text-orange-600 bg-orange-50",
  failed: "text-red-600 bg-red-50",
};

export function getGradeLabel(score: number | null): { label: string; colorClass: string } {
  if (score === null) return { label: "-", colorClass: "text-gray-400 bg-gray-50" };
  if (score >= 90) return { label: "Excellent", colorClass: GRADE_COLORS.excellent };
  if (score >= 70) return { label: "Good", colorClass: GRADE_COLORS.good };
  if (score >= 50) return { label: "Average", colorClass: GRADE_COLORS.average };
  if (score >= 30) return { label: "Below Avg", colorClass: GRADE_COLORS.below };
  return { label: "Failed", colorClass: GRADE_COLORS.failed };
}

export function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "UP") return <TrendingUp size={14} className="text-green-500" />;
  if (trend === "DOWN") return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

export function AttendanceBadge({ status }: { status: string | null }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
      status === "PRESENT" ? "bg-green-50 text-green-600" :
      status === "LATE" ? "bg-yellow-50 text-yellow-600" :
      status === "ABSENT" ? "bg-red-50 text-red-600" :
      "bg-gray-100 text-gray-400"
    )}>
      {status || "No data"}
    </span>
  );
}

function driverName(name: string) {
  return cleanDriverName(name);
}

// ─── Default column config ──────────────────────────────────────────────────

function defaultColumns(platform: string): ColumnConfig[] {
  const cols: ColumnConfig[] = [
    { key: "rank", label: "#", sortable: false, render: (d) => <span className="text-sm text-secondary font-medium">{d.rank}</span> },
    { key: "driver", label: "Driver", sortable: false, render: (d) => (
      <div>
        <p className="text-sm font-medium">{driverName(d.name)}</p>
        <p className="text-xs text-secondary">{d.company}</p>
      </div>
    )},
    { key: "utr", label: "UTR", render: (d) => <span className="text-sm font-mono">{d.utr || "-"}</span> },
  ];
  if (platform === "TALABAT") {
    cols.push({
      key: "batch", label: "Batch", render: (d) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
          d.batchNumber === "1" ? "bg-green-50 text-green-600" :
          d.batchNumber === "2" ? "bg-blue-50 text-blue-600" :
          d.batchNumber && Number(d.batchNumber) <= 4 ? "bg-yellow-50 text-yellow-600" :
          "bg-red-50 text-red-600"
        )}>
          {d.batchNumber || "-"}
        </span>
      )
    });
  }
  cols.push(
    { key: "grade", label: "Darb Grade", render: (d) => {
      const grade = getGradeLabel(d.darbGrade);
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{d.darbGrade ?? "-"}</span>
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", grade.colorClass)}>{grade.label}</span>
        </div>
      );
    }},
    { key: "trend", label: "Trend", sortable: false, render: (d) => <TrendIcon trend={d.gradeTrend} /> },
    { key: "orders", label: "Orders Today",
      headerRender: (router, pk) => (
        <button onClick={() => router.push(`/${pk}/orders`)} className="flex items-center gap-1 hover:text-primary transition-colors">
          Orders Today <ArrowUpRight size={12} />
        </button>
      ),
      render: (d) => <span className="text-sm font-semibold">{d.todayOrders}</span>,
    },
    { key: "cashCollected", label: "Cash Collected",
      headerRender: (router, pk) => (
        <button onClick={() => router.push(`/${pk}/cash`)} className="flex items-center gap-1 hover:text-primary transition-colors">
          Cash Collected <ArrowUpRight size={12} />
        </button>
      ),
      render: (d) => <span className="text-sm">{typeof d.cashCollected === "number" ? `${d.cashCollected.toFixed(3)} KD` : "-"}</span>,
    },
    { key: "cashPending", label: "Cash Pending", render: (d) => (
      <span className={cn("text-sm font-medium", (d.cashPending || 0) > 0 ? "text-red-500" : "text-green-600")}>
        {typeof d.cashPending === "number" ? `${d.cashPending.toFixed(3)} KD` : "-"}
      </span>
    )},
    { key: "attendance", label: "Attendance", render: (d) => <AttendanceBadge status={d.attendance} /> },
  );
  return cols;
}

function defaultKpiCards(platformKey: string): KpiCardConfig[] {
  return [
    { title: "UTR", icon: TrendingUp, value: (s) => s.utr != null ? s.utr.toFixed(2) : "-", trend: () => "Units per Trip Rate" },
    { title: "Active Drivers", icon: Users, value: (s) => s.totalDrivers || 0, trend: (s) => `${s.presentCount || 0} present, ${s.lateCount || 0} late, ${s.absentCount || 0} absent` },
    { title: "Active Violations", icon: AlertTriangle, value: (s) => s.activeViolations || 0, highlight: (s) => (s.activeViolations || 0) > 0,
      onClick: platformKey === "talabat" ? (router) => router.push(`/${platformKey}/violations`) : undefined },
  ];
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function PlatformOverviewPage(props: Props) {
  const {
    platform, platformKey, platformLabel,
    apiEndpoint, kpiCards, middleSlot, columns,
    searchable = false, paginated = false, kpiGridCols = 3,
  } = props;

  const router = useRouter();
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [sortCol, setSortCol] = useState("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);

  const params = new URLSearchParams();
  if (companyFilter) params.set("companyId", companyFilter);

  const endpoint = apiEndpoint || `/api/platform-overview/${platform}`;
  const { data, loading } = useApiGet<any>(`${endpoint}?${params}`);
  const { data: companiesData } = useApiGet<any>(`/api/companies?platform=${platform}`);

  const companies = companiesData?.data || [];
  const drivers = data?.drivers || [];
  const summary = data?.summary || {};
  const violations = data?.violations || [];
  const alerts = data?.alerts || [];

  const cards = kpiCards || defaultKpiCards(platformKey);
  const cols = columns || defaultColumns(platform);

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const filteredDrivers = useMemo(() => {
    let list = [...drivers];
    if (searchable && driverSearch) {
      const q = driverSearch.toLowerCase();
      list = list.filter((d: any) => d.name?.toLowerCase().includes(q) || d.zone?.toLowerCase().includes(q));
    }
    list.sort((a: any, b: any) => {
      const av = a[sortCol] ?? (typeof a[sortCol] === "number" ? -1 : "");
      const bv = b[sortCol] ?? (typeof b[sortCol] === "number" ? -1 : "");
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [drivers, driverSearch, sortCol, sortDir, searchable]);

  const displayed = paginated && !showAll ? filteredDrivers.slice(0, 15) : filteredDrivers;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className={cn("grid gap-4", `grid-cols-2 md:grid-cols-${kpiGridCols}`)}>
          {[...Array(kpiGridCols)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{platformLabel} Overview</h1>
          <p className="text-sm text-secondary mt-1">Today&apos;s performance snapshot</p>
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Companies</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className={cn("grid gap-4", `grid-cols-2 md:grid-cols-${kpiGridCols}`)}>
        {cards.map((card, i) => (
          <StatCard
            key={i}
            title={card.title}
            value={card.value(summary)}
            icon={card.icon}
            trend={card.trend?.(summary)}
            highlight={card.highlight?.(summary)}
            onClick={card.onClick ? () => card.onClick!(router) : undefined}
          />
        ))}
      </div>

      {/* Middle slot — platform-specific widgets */}
      {middleSlot?.({ drivers, summary, loading })}

      {/* Alerts & Violations Row */}
      {(violations.length > 0 || alerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {violations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" />
                  Today&apos;s Violations
                </h2>
                <button onClick={() => router.push(`/${platformKey}/violations`)}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  View All <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {violations.slice(0, 5).map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-gray-100 text-gray-600">{(v.type || "").replace(/_/g, " ")}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{v.description}</p>
                      <p className="text-xs text-secondary">{v.driver?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  Active Alerts
                </h2>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                      a.severity === "HIGH" || a.severity === "CRITICAL" ? "bg-red-50 text-red-600" :
                      a.severity === "MEDIUM" ? "bg-yellow-50 text-yellow-600" : "bg-gray-100 text-gray-500"
                    )}>{a.severity}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-secondary truncate">{a.message}</p>
                    </div>
                    {a.driver?.name && <span className="text-xs text-secondary">{a.driver.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Driver Rankings Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Driver Rankings
            <span className="text-xs font-normal text-secondary bg-gray-100 px-2 py-0.5 rounded-full">{filteredDrivers.length}</span>
          </h2>
          {searchable && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
              />
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {cols.map(({ key, label, sortable = true, headerRender }) => (
                  <th key={key}
                    className={cn("text-left text-xs font-medium text-secondary px-5 py-3 whitespace-nowrap", sortable && "cursor-pointer hover:text-foreground")}
                    onClick={() => sortable && toggleSort(key)}
                  >
                    {headerRender ? headerRender(router, platformKey) : (
                      <span className="flex items-center gap-1">
                        {label}
                        {sortable && sortCol === key && <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((driver: any) => (
                <tr key={driver.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-25 cursor-pointer transition-colors"
                  onClick={() => router.push(`/${platformKey}/drivers/${driver.id}`)}
                >
                  {cols.map(({ key, render }) => (
                    <td key={key} className="px-5 py-3">{render(driver)}</td>
                  ))}
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={cols.length} className="px-5 py-8 text-center text-sm text-secondary">
                    {searchable && driverSearch ? "No drivers match your search" : "No driver data for today"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {paginated && filteredDrivers.length > 15 && (
          <div className="px-5 py-3 border-t border-gray-100 text-center">
            <button onClick={() => setShowAll(!showAll)}
              className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
              {showAll ? "Show Less" : `Show All ${filteredDrivers.length} Drivers`}
              <ChevronRight size={12} className={cn("transition-transform", showAll && "rotate-90")} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
