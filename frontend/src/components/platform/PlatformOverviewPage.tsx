"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import StatCard from "@/components/shared/StatCard";
import {
  AlertTriangle, Users, Clock, TrendingUp,
  TrendingDown, Minus, ChevronRight, ShieldAlert, ArrowUpRight,
} from "lucide-react";

interface Props {
  platform: string;
  platformKey: string;
  platformLabel: string;
  platformColor: string;
}

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

export default function PlatformOverviewPage({ platform, platformKey, platformLabel, platformColor }: Props) {
  const router = useRouter();
  const [companyFilter, setCompanyFilter] = useState("");

  const params = new URLSearchParams();
  if (companyFilter) params.set("companyId", companyFilter);

  const { data } = useApiGet<any>(`/api/platform-overview/${platform}?${params}`);
  const { data: companiesData } = useApiGet<any>(`/api/companies?platform=${platform}`);

  const companies = companiesData?.data || [];
  const drivers = data?.drivers || [];
  const summary = data?.summary || {};
  const violations = data?.violations || [];
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          title="UTR"
          value={summary.utr != null ? summary.utr.toFixed(2) : "-"}
          icon={TrendingUp}
          trend="Units per Trip Rate"
        />
        <StatCard
          title="Active Drivers"
          value={summary.totalDrivers || 0}
          icon={Users}
          trend={`${summary.presentCount || 0} present, ${summary.lateCount || 0} late, ${summary.absentCount || 0} absent`}
        />
        <StatCard
          title="Active Violations"
          value={summary.activeViolations || 0}
          icon={AlertTriangle}
          highlight={(summary.activeViolations || 0) > 0}
          onClick={platformKey === "talabat" ? () => router.push(`/${platformKey}/violations`) : undefined}
        />
      </div>

      {/* Alerts & Violations Row */}
      {(violations.length > 0 || alerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Violations */}
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

          {/* Alerts */}
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
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Driver Rankings</h2>
          <span className="text-xs text-secondary">{drivers.length} drivers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3 w-12">#</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3 cursor-help" title="Utilization Time Rate">UTR</th>
                {platform === "TALABAT" && <th className="text-left text-xs font-medium text-secondary px-5 py-3">Batch</th>}
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Darb Grade</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Trend</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                  <button onClick={() => router.push(`/${platformKey}/orders`)} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Orders Today <ArrowUpRight size={12} />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                  <button onClick={() => router.push(`/${platformKey}/cash`)} className="flex items-center gap-1 hover:text-primary transition-colors">
                    Cash Collected <ArrowUpRight size={12} />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Cash Pending</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver: any) => {
                const grade = getGradeLabel(driver.darbGrade);
                return (
                  <tr key={driver.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-25 cursor-pointer transition-colors"
                    onClick={() => router.push(`/${platformKey}/drivers/${driver.id}`)}
                  >
                    <td className="px-5 py-3 text-sm text-secondary font-medium">{driver.rank}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{(driver.name || "").replace(/\s+\d+[A-Za-z]?\s*[-–—]\s*\w+$/i, "").trim() || driver.name}</p>
                        <p className="text-xs text-secondary">{driver.company}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono">{driver.utr || "-"}</td>
                    {platform === "TALABAT" && (
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                          driver.batchNumber === "1" ? "bg-green-50 text-green-600" :
                          driver.batchNumber === "2" ? "bg-blue-50 text-blue-600" :
                          driver.batchNumber && Number(driver.batchNumber) <= 4 ? "bg-yellow-50 text-yellow-600" :
                          "bg-red-50 text-red-600"
                        )}>
                          {driver.batchNumber || "-"}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{driver.darbGrade ?? "-"}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", grade.colorClass)}>
                          {grade.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><TrendIcon trend={driver.gradeTrend} /></td>
                    <td className="px-5 py-3 text-sm font-semibold">{driver.todayOrders}</td>
                    <td className="px-5 py-3 text-sm">{driver.cashCollected.toFixed(3)} KD</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-sm font-medium",
                        driver.cashPending > 0 ? "text-red-500" : "text-green-600"
                      )}>
                        {driver.cashPending.toFixed(3)} KD
                      </span>
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
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-sm text-secondary">
                    No driver data for today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
