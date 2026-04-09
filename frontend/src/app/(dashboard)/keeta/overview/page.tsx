"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import {
  Users, TrendingUp, TrendingDown, Minus, ChevronRight,
  CheckCircle2, Clock, Package, Target, Search,
} from "lucide-react";

const GRADE_COLORS: Record<string, string> = {
  excellent: "text-green-600 bg-green-50",
  good: "text-blue-600 bg-blue-50",
  average: "text-yellow-600 bg-yellow-50",
  below: "text-orange-600 bg-orange-50",
  failed: "text-red-600 bg-red-50",
};

function getGradeLabel(score: number | null): { label: string; colorClass: string } {
  if (score === null) return { label: "-", colorClass: "text-gray-400 bg-gray-50" };
  if (score >= 90) return { label: "Excellent", colorClass: GRADE_COLORS.excellent };
  if (score >= 70) return { label: "Good", colorClass: GRADE_COLORS.good };
  if (score >= 50) return { label: "Average", colorClass: GRADE_COLORS.average };
  if (score >= 30) return { label: "Below Avg", colorClass: GRADE_COLORS.below };
  return { label: "Failed", colorClass: GRADE_COLORS.failed };
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "UP") return <TrendingUp size={14} className="text-green-500" />;
  if (trend === "DOWN") return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

function pct(val: number | null) {
  if (val === null) return "-";
  return (val * 100).toFixed(1) + "%";
}

export default function KeetaOverviewPage() {
  const router = useRouter();
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [sortCol, setSortCol] = useState("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);

  const params = new URLSearchParams();
  if (companyFilter) params.set("companyId", companyFilter);

  const { data, loading } = useApiGet<any>(`/api/keeta/overview?${params}`);
  const { data: companiesData } = useApiGet<any>(`/api/companies?platform=KEETA`);

  const companies = companiesData?.data || [];
  const drivers = data?.drivers || [];
  const summary = data?.summary || {};

  // Donut
  const leaveCount = summary.driversOnLeave ?? 0;
  const totalAtt = (summary.presentCount || 0) + (summary.lateCount || 0) + (summary.absentCount || 0) + leaveCount;
  const presentPct = totalAtt > 0 ? ((summary.presentCount || 0) / totalAtt) * 100 : 0;
  const latePct = totalAtt > 0 ? ((summary.lateCount || 0) / totalAtt) * 100 : 0;
  const absentPct = totalAtt > 0 ? ((summary.absentCount || 0) / totalAtt) * 100 : 0;
  const leavePct = totalAtt > 0 ? (leaveCount / totalAtt) * 100 : 0;
  const presentEnd = presentPct;
  const lateEnd = presentEnd + latePct;
  const absentEnd = lateEnd + absentPct;
  const donutGradient = totalAtt > 0
    ? `conic-gradient(#16a34a 0% ${presentEnd}%, #eab308 ${presentEnd}% ${lateEnd}%, #dc2626 ${lateEnd}% ${absentEnd}%, #14b8a6 ${absentEnd}% 100%)`
    : "conic-gradient(#e5e7eb 0% 100%)";

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const filteredDrivers = useMemo(() => {
    let list = [...drivers];
    if (driverSearch) {
      const q = driverSearch.toLowerCase();
      list = list.filter((d: any) => d.name?.toLowerCase().includes(q) || d.zone?.toLowerCase().includes(q));
    }
    list.sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortCol) {
        case "grade": av = a.darbGrade ?? -1; bv = b.darbGrade ?? -1; break;
        case "deliveries": av = a.deliveries ?? 0; bv = b.deliveries ?? 0; break;
        case "online": av = a.onlineMinutes ?? 0; bv = b.onlineMinutes ?? 0; break;
        case "completion": av = a.completionRate ?? -1; bv = b.completionRate ?? -1; break;
        case "ontime": av = a.onTimeRate ?? -1; bv = b.onTimeRate ?? -1; break;
        case "attendance": av = a.attendance ?? ""; bv = b.attendance ?? ""; break;
        default: av = a.rank ?? 0; bv = b.rank ?? 0; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [drivers, driverSearch, sortCol, sortDir]);

  const displayed = showAll ? filteredDrivers : filteredDrivers.slice(0, 15);

  const COLS = [
    { key: "rank", label: "#", sortable: false },
    { key: "driver", label: "Driver", sortable: false },
    { key: "grade", label: "Darb Grade" },
    { key: "trend", label: "Trend", sortable: false },
    { key: "deliveries", label: "Deliveries" },
    { key: "online", label: "Online Time" },
    { key: "completion", label: "Completion" },
    { key: "ontime", label: "On-Time" },
    { key: "attendance", label: "Attendance" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Keeta Overview</h1>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-secondary mb-1">Active Drivers</p>
              <p className="text-2xl font-bold">{summary.totalDrivers ?? 0}</p>
              <p className="text-[11px] text-secondary mt-1">{summary.presentCount ?? 0} present today</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl"><Users size={18} className="text-blue-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-secondary mb-1">Deliveries Today</p>
              <p className="text-2xl font-bold">{summary.totalDeliveries ?? 0}</p>
              <p className="text-[11px] text-secondary mt-1">{summary.validDays ?? 0} valid days</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-xl"><Package size={18} className="text-orange-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-secondary mb-1">Avg Completion</p>
              <p className="text-2xl font-bold">{summary.avgCompletionRate != null ? pct(summary.avgCompletionRate) : "—"}</p>
              <p className="text-[11px] text-secondary mt-1">completion rate</p>
            </div>
            <div className="p-2 bg-green-50 rounded-xl"><CheckCircle2 size={18} className="text-green-500" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-secondary mb-1">Avg On-Time</p>
              <p className="text-2xl font-bold">{summary.avgOnTimeRate != null ? pct(summary.avgOnTimeRate) : "—"}</p>
              <p className="text-[11px] text-secondary mt-1">on-time rate</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-xl"><Target size={18} className="text-purple-500" /></div>
          </div>
        </div>
      </div>

      {/* Shifts donut + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Donut */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Shifts</h2>
            <button onClick={() => router.push("/keeta/attendance")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Details <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-full" style={{ background: donutGradient }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[72px] h-[72px] bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{totalAtt}</span>
                  <span className="text-[10px] text-secondary -mt-0.5">total</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {[
                { label: "Present", color: "bg-green-600", count: summary.presentCount || 0, pctVal: presentPct },
                { label: "Late", color: "bg-yellow-500", count: summary.lateCount || 0, pctVal: latePct },
                { label: "Absent", color: "bg-red-600", count: summary.absentCount || 0, pctVal: absentPct },
                { label: "Leave", color: "bg-teal-500", count: leaveCount, pctVal: leavePct },
              ].map(({ label, color, count, pctVal }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", color)} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{count}</span>
                    <span className="text-xs text-secondary">{pctVal.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Valid Days */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4">Valid Day Status</h2>
          {drivers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-secondary">No data for today</div>
          ) : (() => {
            const withMetrics = drivers.filter((d: any) => d.hasMetrics);
            const valid = withMetrics.filter((d: any) => d.validDay).length;
            const invalid = withMetrics.filter((d: any) => !d.validDay).length;
            const none = drivers.length - withMetrics.length;
            const total = Math.max(drivers.length, 1);
            return (
              <div className="space-y-3">
                {[
                  { label: "Valid Day", count: valid, color: "bg-green-500", pctVal: (valid / total) * 100 },
                  { label: "Invalid Day", count: invalid, color: "bg-red-400", pctVal: (invalid / total) * 100 },
                  { label: "No Data", count: none, color: "bg-gray-200", pctVal: (none / total) * 100 },
                ].map(({ label, count, color, pctVal }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{label}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pctVal}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Online Time Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold mb-4">Online Time Today</h2>
          {drivers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-secondary">No data for today</div>
          ) : (() => {
            const sorted = [...drivers].filter((d: any) => d.onlineMinutes > 0).sort((a: any, b: any) => b.onlineMinutes - a.onlineMinutes).slice(0, 6);
            const max = Math.max(...sorted.map((d: any) => d.onlineMinutes), 1);
            return sorted.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-secondary">No online time recorded</div>
            ) : (
              <div className="space-y-2">
                {sorted.map((d: any) => (
                  <div key={d.id}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs truncate flex-1">{d.name.replace(/\s+\d+[A-Za-z]?\s*[-–—]\s*\w+$/i, "").trim()}</span>
                      <span className="text-xs font-semibold ml-2 flex-shrink-0">
                        {Math.floor(d.onlineMinutes / 60)}h {d.onlineMinutes % 60}m
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${(d.onlineMinutes / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Driver Rankings */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Driver Rankings
            <span className="text-xs font-normal text-secondary bg-gray-100 px-2 py-0.5 rounded-full">{filteredDrivers.length}</span>
          </h2>
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {COLS.map(({ key, label, sortable = true }) => (
                  <th key={key}
                    className={cn("text-left text-xs font-medium text-secondary px-5 py-3 whitespace-nowrap", sortable && "cursor-pointer hover:text-foreground")}
                    onClick={() => sortable && toggleSort(key)}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortable && sortCol === key && <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((driver: any) => {
                const grade = getGradeLabel(driver.darbGrade);
                return (
                  <tr key={driver.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-orange-50/20 cursor-pointer transition-colors"
                    onClick={() => router.push(`/keeta/drivers/${driver.id}`)}
                  >
                    <td className="px-5 py-3 text-sm text-secondary font-medium">{driver.rank}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{(driver.name || "").replace(/\s+\d+[A-Za-z]?\s*[-–—]\s*\w+$/i, "").trim() || driver.name}</p>
                        <p className="text-xs text-secondary">{driver.company}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{driver.darbGrade ?? "-"}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", grade.colorClass)}>{grade.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><TrendIcon trend={driver.gradeTrend} /></td>
                    <td className="px-5 py-3 text-sm font-semibold">{driver.deliveries || (driver.hasMetrics ? "0" : "-")}</td>
                    <td className="px-5 py-3 text-sm text-secondary">
                      {driver.onlineMinutes > 0
                        ? `${Math.floor(driver.onlineMinutes / 60)}h ${driver.onlineMinutes % 60}m`
                        : driver.hasMetrics ? "0" : "-"}
                    </td>
                    <td className="px-5 py-3">
                      {driver.completionRate !== null
                        ? <span className={cn("text-sm font-medium", driver.completionRate >= 0.9 ? "text-green-600" : driver.completionRate >= 0.7 ? "text-yellow-600" : "text-red-500")}>{pct(driver.completionRate)}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {driver.onTimeRate !== null
                        ? <span className={cn("text-sm font-medium", driver.onTimeRate >= 0.9 ? "text-green-600" : driver.onTimeRate >= 0.7 ? "text-yellow-600" : "text-red-500")}>{pct(driver.onTimeRate)}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        driver.attendance === "PRESENT" ? "bg-green-50 text-green-600" :
                        driver.attendance === "LATE" ? "bg-yellow-50 text-yellow-600" :
                        driver.attendance === "ABSENT" ? "bg-red-50 text-red-600" :
                        "bg-gray-100 text-gray-400"
                      )}>
                        {driver.attendance || "No data"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-secondary">
                    {driverSearch ? "No drivers match your search" : "No driver data for today"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredDrivers.length > 15 && (
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
