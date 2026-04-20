"use client";

import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import { useRouter } from "next/navigation";
import type { Platform, Violation } from "@/types/api";
import { PageSkeleton } from "@/components/shared/Skeleton";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

/* ─── Violation type tabs ─── */

type ViolationTab =
  | "ALL"
  | "LATE_PICKUP"
  | "ORDER_REJECTION_TIMEOUT"
  | "DROP_OFF_IN_ADVANCE"
  | "ORDER_SLIGHTLY_LATE"
  | "ORDER_VERY_LATE"
  | "INVALID_DELIVERY_PHOTO"
  | "GPS_NOT_UPLOADING"
  | "DELIVEROO_UNASSIGNED_ORDER"
  | "AMERICANA_LATE_ARRIVAL"
  | "AMERICANA_NO_SHOW"
  | "AMERICANA_EARLY_DEPARTURE_QUIT";

const BASE_VIOLATION_TABS: { key: ViolationTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "LATE_PICKUP", label: "Late Pickup" },
  { key: "ORDER_REJECTION_TIMEOUT", label: "Rejection Timeout" },
  { key: "DROP_OFF_IN_ADVANCE", label: "Drop-off Advance" },
  { key: "ORDER_SLIGHTLY_LATE", label: "Slightly Late" },
  { key: "ORDER_VERY_LATE", label: "Very Late" },
  { key: "INVALID_DELIVERY_PHOTO", label: "Invalid Photo" },
  { key: "GPS_NOT_UPLOADING", label: "GPS Not Uploading" },
];

const DELIVEROO_UNASSIGNED_TAB: { key: ViolationTab; label: string } = {
  key: "DELIVEROO_UNASSIGNED_ORDER",
  label: "Unassigned",
};

const AMERICANA_TABS: { key: ViolationTab; label: string }[] = [
  { key: "AMERICANA_LATE_ARRIVAL", label: "Late Arrival" },
  { key: "AMERICANA_NO_SHOW", label: "No-show" },
  { key: "AMERICANA_EARLY_DEPARTURE_QUIT", label: "Early Quit" },
];

/* ─── Color maps ─── */

const TYPE_COLORS: Record<string, string> = {
  LATE_PICKUP: "bg-amber-50 text-amber-600",
  ORDER_REJECTION_TIMEOUT: "bg-purple-50 text-purple-600",
  DROP_OFF_IN_ADVANCE: "bg-red-50 text-red-600",
  ORDER_SLIGHTLY_LATE: "bg-yellow-50 text-yellow-600",
  ORDER_VERY_LATE: "bg-red-100 text-red-700",
  INVALID_DELIVERY_PHOTO: "bg-blue-50 text-blue-600",
  GPS_NOT_UPLOADING: "bg-orange-50 text-orange-600",
  DELIVEROO_UNASSIGNED_ORDER: "bg-pink-50 text-pink-700",
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

const PLATFORM_DOT: Record<string, string> = {
  KEETA: "bg-keeta",
  TALABAT: "bg-talabat",
  DELIVEROO: "bg-deliveroo",
  AMERICANA: "bg-americana",
};

const PLATFORM_ACCENT: Record<string, { btn: string; text: string }> = {
  KEETA: { btn: "bg-keeta/10 text-keeta hover:bg-keeta/20", text: "text-keeta" },
  TALABAT: { btn: "bg-talabat/10 text-talabat hover:bg-talabat/20", text: "text-talabat" },
  DELIVEROO: { btn: "bg-deliveroo/10 text-deliveroo hover:bg-deliveroo/20", text: "text-deliveroo" },
  AMERICANA: { btn: "bg-americana/10 text-americana hover:bg-americana/20", text: "text-americana" },
};

const PLATFORM_LABELS: Record<string, string> = {
  KEETA: "Keeta",
  TALABAT: "Talabat",
  DELIVEROO: "Deliveroo",
  AMERICANA: "Americana",
};

/* ─── Props ─── */

interface ViolationsPageProps {
  platform: Platform;
}

/* ─── Component ─── */

export default function ViolationsPage({ platform }: ViolationsPageProps) {
  const router = useRouter();
  const [tab, setTab] = useState<ViolationTab>("ALL");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Violation | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Build API params
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    platform,
  });
  if (tab !== "ALL") params.set("violationType", tab);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search) params.set("search", filters.search);
  if (filters.violationStatus) params.set("violationStatus", filters.violationStatus);
  if (filters.appealStatus) params.set("appealStatus", filters.appealStatus);

  const { data: summaryData, loading: summaryLoading } = useApiGet<any>(
    `/api/violations/summary?platform=${platform}`
  );
  const { data, loading, refetch: refetchList } = useApiGet<any>(`/api/violations?${params}`);
  const [rootCauseBusy, setRootCauseBusy] = useState(false);

  const setRootCause = async (violationId: string, rootCause: string) => {
    setRootCauseBusy(true);
    try {
      const resp = await api.patch(`/api/violations/${violationId}/root-cause`, { rootCause });
      setSelected((prev) => (prev && prev.id === violationId ? { ...prev, metadata: resp.data.metadata } : prev));
      refetchList();
    } catch {
      /* no-op */
    } finally {
      setRootCauseBusy(false);
    }
  };

  const violations: Violation[] = data?.data || [];
  const pagination = data?.pagination;

  const byType = summaryData?.byType || [];
  const totalCount = summaryData?.total || 0;
  const pendingAppeals = summaryData?.pendingAppeals || 0;
  const established =
    summaryData?.byStatus?.find((s: any) => s.status === "ESTABLISHED")?.count || 0;
  const overturned =
    summaryData?.byStatus?.find((s: any) => s.status === "OVERTURNED")?.count || 0;

  const tabCounts: Record<ViolationTab, number> = {
    ALL: totalCount,
    LATE_PICKUP: byType.find((t: any) => t.type === "LATE_PICKUP")?.count || 0,
    ORDER_REJECTION_TIMEOUT:
      byType.find((t: any) => t.type === "ORDER_REJECTION_TIMEOUT")?.count || 0,
    DROP_OFF_IN_ADVANCE:
      byType.find((t: any) => t.type === "DROP_OFF_IN_ADVANCE")?.count || 0,
    ORDER_SLIGHTLY_LATE:
      byType.find((t: any) => t.type === "ORDER_SLIGHTLY_LATE")?.count || 0,
    ORDER_VERY_LATE: byType.find((t: any) => t.type === "ORDER_VERY_LATE")?.count || 0,
    INVALID_DELIVERY_PHOTO:
      byType.find((t: any) => t.type === "INVALID_DELIVERY_PHOTO")?.count || 0,
    GPS_NOT_UPLOADING:
      byType.find((t: any) => t.type === "GPS_NOT_UPLOADING")?.count || 0,
    DELIVEROO_UNASSIGNED_ORDER:
      byType.find((t: any) => t.type === "DELIVEROO_UNASSIGNED_ORDER")?.count || 0,
    AMERICANA_LATE_ARRIVAL:
      byType.find((t: any) => t.type === "AMERICANA_LATE_ARRIVAL")?.count || 0,
    AMERICANA_NO_SHOW:
      byType.find((t: any) => t.type === "AMERICANA_NO_SHOW")?.count || 0,
    AMERICANA_EARLY_DEPARTURE_QUIT:
      byType.find((t: any) => t.type === "AMERICANA_EARLY_DEPARTURE_QUIT")?.count || 0,
  };

  const VIOLATION_TABS =
    platform === "DELIVEROO"
      ? [...BASE_VIOLATION_TABS, DELIVEROO_UNASSIGNED_TAB]
      : platform === "AMERICANA"
      ? [{ key: "ALL" as ViolationTab, label: "All" }, ...AMERICANA_TABS]
      : BASE_VIOLATION_TABS;

  const platformLabel = PLATFORM_LABELS[platform] || platform;
  const platformDot = PLATFORM_DOT[platform] || "bg-gray-400";
  const accent = PLATFORM_ACCENT[platform] || PLATFORM_ACCENT.KEETA;
  const platformBasePath = platformLabel.toLowerCase();

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className={cn("w-3 h-3 rounded-full", platformDot)} />
        <h1 className="text-xl font-semibold">{platformLabel}</h1>
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
            onClick={() => { setTab(t.key); setPage(1); }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
              tab === t.key
                ? "bg-white text-foreground shadow-sm"
                : "text-secondary hover:text-foreground"
            )}
          >
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span
                className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold min-w-[20px] text-center",
                  tab === t.key
                    ? "bg-foreground/10 text-foreground"
                    : "bg-gray-200/70 text-secondary"
                )}
              >
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          {
            key: "search",
            type: "search",
            label: "Search",
            placeholder: "Search courier name...",
          },
          {
            key: "violationStatus",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "ESTABLISHED", label: "Established" },
              { value: "UNDER_REVIEW", label: "Under Review" },
              { value: "OVERTURNED", label: "Overturned" },
              { value: "EXPIRED", label: "Expired" },
            ],
          },
          {
            key: "appealStatus",
            type: "select",
            label: "All Appeals",
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
        onChange={(k, v) => {
          setFilters((prev) => ({ ...prev, [k]: v }));
          setPage(1);
        }}
        onClear={() => { setFilters({}); setPage(1); }}
        defaultValues={{}}
      />

      {/* Loading State */}
      {loading && violations.length === 0 && (
        <PageSkeleton statCards={0} tableRows={8} tableCols={9} />
      )}

      {/* Table */}
      {(!loading || violations.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    ID
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Violations
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Task ID
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Courier
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Vehicle
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Violation Time
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Appeal
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {violations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-sm text-secondary"
                    >
                      No violations found
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => setSelected(v)}
                      className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-secondary font-mono">
                        {v.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-md font-medium",
                            TYPE_COLORS[v.violationType] || "bg-gray-100 text-gray-600"
                          )}
                        >
                          {(v.violationType || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-secondary font-mono">
                        {v.taskId ? v.taskId.slice(0, 8) : "\u2014"}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium">
                          {cleanDriverName(v.driver?.name) || "\u2014"}
                        </p>
                        <p className="text-xs text-secondary">
                          {v.driver?.platformDriverId || ""}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {v.driver?.vehicleType || "\u2014"}
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary font-mono">
                        {v.violationTime
                          ? new Date(v.violationTime).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : "\u2014"}
                        <br />
                        <span className="text-xs">
                          {v.violationTime
                            ? new Date(v.violationTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-md font-medium",
                            STATUS_COLORS[v.violationStatus] || "bg-gray-100"
                          )}
                        >
                          {v.violationStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {(() => {
                          const second = v.secondAppealStatus && v.secondAppealStatus !== "NOT_RAISED";
                          const status = second ? v.secondAppealStatus : v.firstAppealStatus || v.appealStatus;
                          return (
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded-md font-medium",
                                  APPEAL_COLORS[status] || "bg-gray-100"
                                )}
                              >
                                {status}
                              </span>
                              {second && (
                                <span className="text-[9px] font-bold text-secondary bg-gray-100 px-1 rounded">
                                  2ND
                                </span>
                              )}
                            </div>
                          );
                        })()}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-secondary">
                Page {page} of {totalPages}
                {pagination?.total != null && (
                  <span className="ml-1">({pagination.total} total)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-md font-medium",
                    STATUS_COLORS[selected.violationStatus]
                  )}
                >
                  {selected.violationStatus}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">1st Appeal</p>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-md font-medium",
                    APPEAL_COLORS[selected.firstAppealStatus || "NOT_RAISED"]
                  )}
                >
                  {selected.firstAppealStatus || "NOT_RAISED"}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">2nd Appeal</p>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-md font-medium",
                    APPEAL_COLORS[selected.secondAppealStatus || "NOT_RAISED"]
                  )}
                >
                  {selected.secondAppealStatus || "NOT_RAISED"}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Courier</p>
                <p className="text-sm font-medium">
                  {cleanDriverName(selected.driver?.name) || "\u2014"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Vehicle</p>
                <p className="text-sm font-medium">
                  {selected.driver?.vehicleType || "\u2014"}
                </p>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Time</p>
                <p className="text-sm font-medium">
                  {selected.violationTime
                    ? new Date(selected.violationTime).toLocaleString()
                    : "\u2014"}
                </p>
              </div>
            </div>

            {/* Description */}
            {selected.details && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium mb-1">
                  Details
                </p>
                <p className="text-sm">{selected.details}</p>
              </div>
            )}

            {/* Root-cause picker (Deliveroo unassigned orders) */}
            {selected.violationType === "DELIVEROO_UNASSIGNED_ORDER" && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium mb-2">
                  Root cause
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["NO_RIDER_IN_ZONE", "No rider in zone"],
                      ["ALL_RIDERS_BUSY", "All riders busy"],
                      ["ALL_REJECTED", "All rejected"],
                      ["SYSTEM_ERROR", "System error"],
                      ["UNKNOWN", "Unknown"],
                    ] as const
                  ).map(([code, label]) => {
                    const current =
                      ((selected.metadata as any) ?? {}).rootCause ?? "UNKNOWN";
                    const active = current === code;
                    return (
                      <button
                        key={code}
                        disabled={rootCauseBusy}
                        onClick={() => setRootCause(selected.id, code)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                          active
                            ? "bg-foreground text-white border-foreground"
                            : "bg-white text-secondary border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {(selected.metadata as any)?.zone && (
                  <p className="text-xs text-secondary mt-2">
                    Zone:{" "}
                    <span className="font-medium text-foreground">
                      {(selected.metadata as any).zone}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Penalties */}
            {selected.penalties && selected.penalties.length > 0 && (
              <div>
                <p className="text-[10px] text-secondary uppercase font-medium mb-2">
                  Penalties
                </p>
                <div className="space-y-2">
                  {selected.penalties.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-gray-50 rounded-xl p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {(p.penaltyType || "").replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-secondary">{p.penaltyStatus}</p>
                      </div>
                      {p.penaltyValue && (
                        <span className="text-xs font-mono text-secondary">
                          {p.penaltyValue}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appeals */}
            {selected.appeals && selected.appeals.length > 0 && (
              <div>
                <p className="text-[10px] text-secondary uppercase font-medium mb-2">
                  Appeal History
                </p>
                <div className="space-y-2">
                  {selected.appeals.map((a) => (
                    <div key={a.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-secondary bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                            {a.appealLevel === 2 ? "2ND APPEAL" : "1ST APPEAL"}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md font-medium",
                              APPEAL_COLORS[a.appealStatus] || "bg-gray-100"
                            )}
                          >
                            {a.appealStatus}
                          </span>
                        </div>
                        {a.channel && (
                          <span className="text-xs text-secondary">{a.channel}</span>
                        )}
                      </div>
                      {a.reason && <p className="text-sm mt-1">{a.reason}</p>}
                      {a.rejectionNote && (
                        <p className="text-xs text-red-500 mt-1">{a.rejectionNote}</p>
                      )}
                      <p className="text-xs text-secondary mt-1">
                        {new Date(a.appealedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View full details link */}
            <button
              onClick={() => {
                setSelected(null);
                router.push(`/${platformBasePath}/violations/${selected.id}`);
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors",
                accent.btn
              )}
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
