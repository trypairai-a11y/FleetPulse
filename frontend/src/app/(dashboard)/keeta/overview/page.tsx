"use client";
import PlatformOverviewPage, {
  KpiCardConfig,
  ColumnConfig,
  getGradeLabel,
  TrendIcon,
  AttendanceBadge,
} from "@/components/platform/PlatformOverviewPage";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import { Users, Package, CheckCircle2, Target, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import CoreMetricsCards from "@/components/keeta/CoreMetricsCards";
import TrendChart from "@/components/keeta/TrendChart";
import { useApiGet } from "@/hooks/useApi";

function pct(val: number | null) {
  if (val === null) return "-";
  return (val * 100).toFixed(1) + "%";
}

const kpiCards: KpiCardConfig[] = [
  { title: "Active Drivers", icon: Users, value: (s) => s.totalDrivers ?? 0, trend: (s) => `${s.presentCount ?? 0} present today` },
  { title: "Deliveries Today", icon: Package, value: (s) => s.totalDeliveries ?? 0, trend: (s) => `${s.validDays ?? 0} valid days` },
  { title: "Avg Completion", icon: CheckCircle2, value: (s) => s.avgCompletionRate != null ? pct(s.avgCompletionRate) : "\u2014", trend: () => "completion rate" },
  { title: "Avg On-Time", icon: Target, value: (s) => s.avgOnTimeRate != null ? pct(s.avgOnTimeRate) : "\u2014", trend: () => "on-time rate" },
];

const columns: ColumnConfig[] = [
  { key: "rank", label: "#", sortable: false, render: (d) => <span className="text-sm text-secondary font-medium">{d.rank}</span> },
  { key: "driver", label: "Driver", sortable: false, render: (d) => (
    <div>
      <p className="text-sm font-medium">{cleanDriverName(d.name)}</p>
      <p className="text-xs text-secondary">{d.company}</p>
    </div>
  )},
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
  { key: "deliveries", label: "Deliveries", render: (d) => <span className="text-sm font-semibold">{d.deliveries || (d.hasMetrics ? "0" : "-")}</span> },
  { key: "online", label: "Online Time", render: (d) => (
    <span className="text-sm text-secondary">
      {d.onlineMinutes > 0 ? `${Math.floor(d.onlineMinutes / 60)}h ${d.onlineMinutes % 60}m` : d.hasMetrics ? "0" : "-"}
    </span>
  )},
  { key: "completion", label: "Completion", render: (d) => (
    d.completionRate !== null
      ? <span className={cn("text-sm font-medium", d.completionRate >= 0.9 ? "text-green-600" : d.completionRate >= 0.7 ? "text-yellow-600" : "text-red-500")}>{pct(d.completionRate)}</span>
      : <span className="text-xs text-gray-300">&mdash;</span>
  )},
  { key: "ontime", label: "On-Time", render: (d) => (
    d.onTimeRate !== null
      ? <span className={cn("text-sm font-medium", d.onTimeRate >= 0.9 ? "text-green-600" : d.onTimeRate >= 0.7 ? "text-yellow-600" : "text-red-500")}>{pct(d.onTimeRate)}</span>
      : <span className="text-xs text-gray-300">&mdash;</span>
  )},
  { key: "attendance", label: "Attendance", render: (d) => <AttendanceBadge status={d.attendance} /> },
];

// ─── Keeta-specific middle widgets ──────────────────────────────────────────

function KeetaMiddleSlot({ drivers, summary }: { drivers: any[]; summary: any; loading: boolean }) {
  const router = useRouter();
  const { data: metricsSummary } = useApiGet<{ cards: any; trend: { series: any[] } }>("/api/keeta/metrics/summary");
  const hasKeetaCards = !!metricsSummary?.cards;
  return (
    <div className="space-y-4">
      {hasKeetaCards && <CoreMetricsCards cards={metricsSummary!.cards} />}
      {metricsSummary?.trend?.series?.length ? (
        <TrendChart points={metricsSummary.trend.series} metricA="acceptedTasks" metricB="deliveredTasks"
          labelA="Accepted" labelB="Delivered" />
      ) : null}
      <KeetaLegacyMiddleSlot drivers={drivers} summary={summary} router={router} />
    </div>
  );
}

function KeetaLegacyMiddleSlot({ drivers, summary, router }: { drivers: any[]; summary: any; router: ReturnType<typeof useRouter> }) {
  const leaveCount = summary.driversOnLeave ?? 0;
  const totalAtt = (summary.presentCount || 0) + (summary.lateCount || 0) + (summary.absentCount || 0) + leaveCount;
  const presentPct = totalAtt > 0 ? ((summary.presentCount || 0) / totalAtt) * 100 : 0;
  const latePct = totalAtt > 0 ? ((summary.lateCount || 0) / totalAtt) * 100 : 0;
  const absentPct = totalAtt > 0 ? ((summary.absentCount || 0) / totalAtt) * 100 : 0;
  const presentEnd = presentPct;
  const lateEnd = presentEnd + latePct;
  const absentEnd = lateEnd + absentPct;
  const donutGradient = totalAtt > 0
    ? `conic-gradient(#16a34a 0% ${presentEnd}%, #eab308 ${presentEnd}% ${lateEnd}%, #dc2626 ${lateEnd}% ${absentEnd}%, #14b8a6 ${absentEnd}% 100%)`
    : "conic-gradient(#e5e7eb 0% 100%)";

  return (
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
              { label: "Absent", color: "bg-red-600", count: summary.absentCount || 0, pctVal: totalAtt > 0 ? ((summary.absentCount || 0) / totalAtt) * 100 : 0 },
              { label: "Leave", color: "bg-teal-500", count: leaveCount, pctVal: totalAtt > 0 ? (leaveCount / totalAtt) * 100 : 0 },
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
                    <span className="text-xs truncate flex-1">{cleanDriverName(d.name)}</span>
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
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function KeetaOverviewPage() {
  return (
    <PlatformOverviewPage
      platform="KEETA"
      platformKey="keeta"
      platformLabel="Keeta"
      platformColor="text-keeta"
      apiEndpoint="/api/keeta/overview"
      kpiCards={kpiCards}
      kpiGridCols={4}
      columns={columns}
      middleSlot={(data) => <KeetaMiddleSlot {...data} />}
      searchable
      paginated
    />
  );
}
