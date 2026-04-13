"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, AlertTriangle, Clock, CheckCircle2,
  ChevronRight, ExternalLink,
} from "lucide-react";

/* ─── Violation tabs ─── */
type ViolationTab = "ALL" | "LATE_PICKUP" | "ORDER_REJECTION_TIMEOUT" | "DROP_OFF_IN_ADVANCE" | "ORDER_SLIGHTLY_LATE" | "ORDER_VERY_LATE" | "INVALID_DELIVERY_PHOTO" | "GPS_NOT_UPLOADING";

const VIOLATION_TABS: { key: ViolationTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "LATE_PICKUP", label: "Late Pickup" },
  { key: "ORDER_REJECTION_TIMEOUT", label: "Rejection Timeout" },
  { key: "DROP_OFF_IN_ADVANCE", label: "Drop-off Advance" },
  { key: "ORDER_SLIGHTLY_LATE", label: "Slightly Late" },
  { key: "ORDER_VERY_LATE", label: "Very Late" },
  { key: "INVALID_DELIVERY_PHOTO", label: "Invalid Photo" },
  { key: "GPS_NOT_UPLOADING", label: "GPS Not Uploading" },
];

const TYPE_COLORS: Record<string, string> = {
  LATE_PICKUP: "bg-amber-50 text-amber-600",
  ORDER_REJECTION_TIMEOUT: "bg-purple-50 text-purple-600",
  DROP_OFF_IN_ADVANCE: "bg-red-50 text-red-600",
  ORDER_SLIGHTLY_LATE: "bg-yellow-50 text-yellow-600",
  ORDER_VERY_LATE: "bg-red-100 text-red-700",
  INVALID_DELIVERY_PHOTO: "bg-blue-50 text-blue-600",
  GPS_NOT_UPLOADING: "bg-orange-50 text-orange-600",
};

const STATUS_COLORS: Record<string, string> = {
  ESTABLISHED: "bg-red-50 text-red-600",
  UNDER_REVIEW: "bg-amber-50 text-amber-600",
  OVERTURNED: "bg-green-50 text-green-600",
  EXPIRED: "bg-gray-100 text-gray-500",
};

const APPEAL_COLORS: Record<string, string> = {
  NOT_RAISED: "bg-gray-100 text-gray-500",
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-green-50 text-green-600",
  REJECTED: "bg-red-50 text-red-600",
};

export default function KeetaViolationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ViolationTab>("ALL");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  // Build API params
  const params = new URLSearchParams({ limit: "100", platform: "KEETA" });
  if (tab !== "ALL") params.set("violationType", tab);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search) params.set("search", filters.search);
  if (filters.violationStatus) params.set("violationStatus", filters.violationStatus);
  if (filters.appealStatus) params.set("appealStatus", filters.appealStatus);

  const { data: summaryData } = useApiGet<any>("/api/violations/summary?platform=KEETA");
  const { data } = useApiGet<any>(`/api/violations?${params}`);
  const violations = data?.data || [];

  const byType = summaryData?.byType || [];
  const totalCount = summaryData?.total || 0;
  const pendingAppeals = summaryData?.pendingAppeals || 0;
  const established = summaryData?.byStatus?.find((s: any) => s.status === "ESTABLISHED")?.count || 0;
  const overturned = summaryData?.byStatus?.find((s: any) => s.status === "OVERTURNED")?.count || 0;

  const tabCounts: Record<ViolationTab, number> = {
    ALL: totalCount,
    LATE_PICKUP: byType.find((t: any) => t.type === "LATE_PICKUP")?.count || 0,
    ORDER_REJECTION_TIMEOUT: byType.find((t: any) => t.type === "ORDER_REJECTION_TIMEOUT")?.count || 0,
    DROP_OFF_IN_ADVANCE: byType.find((t: any) => t.type === "DROP_OFF_IN_ADVANCE")?.count || 0,
    ORDER_SLIGHTLY_LATE: byType.find((t: any) => t.type === "ORDER_SLIGHTLY_LATE")?.count || 0,
    ORDER_VERY_LATE: byType.find((t: any) => t.type === "ORDER_VERY_LATE")?.count || 0,
    INVALID_DELIVERY_PHOTO: byType.find((t: any) => t.type === "INVALID_DELIVERY_PHOTO")?.count || 0,
    GPS_NOT_UPLOADING: byType.find((t: any) => t.type === "GPS_NOT_UPLOADING")?.count || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-keeta" />
        <h1 className="text-xl font-semibold">Keeta</h1>
        <span className="text-secondary/30 text-lg font-light">/</span>
        <span className="text-xl text-secondary font-medium">Violations</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Violations" value={totalCount} icon={ShieldAlert} />
        <StatCard title="Established" value={established} icon={AlertTriangle} />
        <StatCard title="Pending Appeals" value={pendingAppeals} icon={Clock} />
        <StatCard title="Overturned" value={overturned} icon={CheckCircle2} />
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {VIOLATION_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              tab === t.key ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold min-w-[20px] text-center",
                tab === t.key ? "bg-foreground/10 text-foreground" : "bg-gray-200/70 text-secondary"
              )}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search courier name..." },
          {
            key: "violationStatus", type: "select", label: "All Statuses",
            options: [
              { value: "ESTABLISHED", label: "Established" },
              { value: "UNDER_REVIEW", label: "Under Review" },
              { value: "OVERTURNED", label: "Overturned" },
              { value: "EXPIRED", label: "Expired" },
            ],
          },
          {
            key: "appealStatus", type: "select", label: "All Appeals",
            options: [
              { value: "NOT_RAISED", label: "Not Raised" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
          { key: "dateFrom", type: "dateRange", label: "Date Range", toKey: "dateTo" },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">ID</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Reason</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Task ID</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Courier</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Vehicle</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Violation Time</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Appeal</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-secondary">
                    No violations found
                  </td>
                </tr>
              ) : (
                violations.map((v: any) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-secondary font-mono">{v.id.slice(0, 8)}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", TYPE_COLORS[v.violationType] || "bg-gray-100 text-gray-600")}>
                        {(v.violationType || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-secondary font-mono">{v.taskId ? v.taskId.slice(0, 8) : "—"}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium">{v.driver?.name || "—"}</p>
                      <p className="text-xs text-secondary">{v.driver?.platformDriverId || ""}</p>
                    </td>
                    <td className="px-5 py-3 text-sm">{v.driver?.vehicleType || "—"}</td>
                    <td className="px-5 py-3 text-sm text-secondary font-mono">
                      {v.violationTime
                        ? new Date(v.violationTime).toLocaleDateString([], { month: "short", day: "numeric" })
                        : "—"}
                      <br />
                      <span className="text-xs">
                        {v.violationTime
                          ? new Date(v.violationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", STATUS_COLORS[v.violationStatus] || "bg-gray-100")}>
                        {v.violationStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", APPEAL_COLORS[v.appealStatus] || "bg-gray-100")}>
                        {v.appealStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight size={14} className="text-secondary" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail SlidePanel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? (selected.violationType || "").replace(/_/g, " ") : ""}
        subtitle={`Violation ${selected?.id?.slice(0, 8) || ""}`}
      >
        {selected && (
          <div className="space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Status</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", STATUS_COLORS[selected.violationStatus])}>
                  {selected.violationStatus}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Appeal</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", APPEAL_COLORS[selected.appealStatus])}>
                  {selected.appealStatus}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Courier</p>
                <p className="text-sm font-medium">{selected.driver?.name || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Vehicle</p>
                <p className="text-sm font-medium">{selected.driver?.vehicleType || "—"}</p>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Time</p>
                <p className="text-sm font-medium">
                  {selected.violationTime ? new Date(selected.violationTime).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            {/* Description */}
            {selected.details && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium mb-1">Details</p>
                <p className="text-sm">{selected.details}</p>
              </div>
            )}

            {/* View full details link */}
            <button
              onClick={() => { setSelected(null); router.push(`/keeta/violations/${selected.id}`); }}
              className="w-full flex items-center justify-center gap-2 bg-keeta/10 text-keeta hover:bg-keeta/20 rounded-xl py-3 text-sm font-medium transition-colors"
            >
              <ExternalLink size={14} />
              View Full Details
            </button>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
