"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  ShieldAlert, AlertTriangle, Camera, MapPin,
  CheckCircle2, ChevronRight, Loader2,
} from "lucide-react";

type Tab = "ALL" | "SELFIE_FAIL" | "GPS_OFF" | "EQUIPMENT_MISSING" | "SHIFT_NOT_BOOKED";

const TAB_OPTIONS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SELFIE_FAIL", label: "Selfie Failures" },
  { key: "GPS_OFF", label: "GPS Issues" },
  { key: "EQUIPMENT_MISSING", label: "Equipment" },
  { key: "SHIFT_NOT_BOOKED", label: "Shift Booking" },
];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-500",
  MEDIUM: "bg-yellow-50 text-yellow-600",
  HIGH: "bg-orange-50 text-orange-600",
  CRITICAL: "bg-red-50 text-red-600",
};

const TYPE_COLORS: Record<string, string> = {
  SELFIE_FAIL: "bg-red-50 text-red-600",
  GPS_OFF: "bg-amber-50 text-amber-600",
  EQUIPMENT_MISSING: "bg-blue-50 text-blue-600",
  SHIFT_NOT_BOOKED: "bg-purple-50 text-purple-600",
  ZONE_MISMATCH: "bg-orange-50 text-orange-600",
  LATE_CLOCK_IN: "bg-yellow-50 text-yellow-600",
  EARLY_CLOCK_OUT: "bg-yellow-50 text-yellow-600",
  ORDER_CLICK_THROUGH: "bg-gray-100 text-gray-600",
};

export default function TalabatCompliancePage() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const params = new URLSearchParams({ limit: "100" });
  if (tab !== "ALL") params.set("type", tab);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search) params.set("search", filters.search);
  if (filters.severity) params.set("severity", filters.severity);

  const { data: summaryRaw } = useApiGet<any>("/api/talabat/compliance/summary");
  const { data, refetch } = useApiGet<any>(`/api/talabat/compliance?${params}`);
  const events = data?.data || [];

  // Parse summary from byType array
  const byType = summaryRaw?.byType || [];
  const totalEvents = byType.reduce((s: number, t: any) => s + t.count, 0);
  const selfieFailures = byType.find((t: any) => t.type === "SELFIE_FAIL")?.count || 0;
  const gpsViolations = byType.find((t: any) => t.type === "GPS_OFF")?.count || 0;
  const unresolvedCount = summaryRaw?.unresolvedCount || 0;

  async function handleResolve(eventId: string) {
    setResolving(eventId);
    try {
      await api.put(`/api/talabat/compliance/${eventId}/resolve`);
      refetch();
      if (selected?.id === eventId) {
        setSelected((prev: any) => prev ? { ...prev, status: "RESOLVED" } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <h1 className="text-xl font-semibold">Talabat — Compliance & Alerts</h1>
        <span className="text-sm text-secondary">Wahoo International</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Events (This Week)"
          value={totalEvents}
          icon={ShieldAlert}
        />
        <StatCard
          title="Unresolved"
          value={unresolvedCount}
          icon={AlertTriangle}
          highlight={unresolvedCount > 0}
        />
        <StatCard
          title="Selfie Failures"
          value={selfieFailures}
          icon={Camera}
          highlight={selfieFailures > 0}
        />
        <StatCard
          title="GPS Violations"
          value={gpsViolations}
          icon={MapPin}
          highlight={gpsViolations > 0}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TAB_OPTIONS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === t.key ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search driver name..." },
          { key: "dateFrom", type: "date", label: "From" },
          { key: "dateTo", type: "date", label: "To" },
          {
            key: "severity", type: "select", label: "All Severities", options: [
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "CRITICAL", label: "Critical" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      {/* Events Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date / Time</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Severity</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Description</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Action</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                    No compliance events found
                  </td>
                </tr>
              ) : (
                events.map((evt: any) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelected(evt)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-secondary font-mono">
                      {evt.createdAt
                        ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })
                        : "—"}
                      <br />
                      <span className="text-xs">
                        {evt.createdAt
                          ? new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">
                      {evt.driver?.name || evt.driverName || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[evt.type] || "bg-gray-100 text-gray-500")}>
                        {(evt.type || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", SEVERITY_COLORS[evt.severity] || "bg-gray-100 text-gray-500")}>
                        {evt.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary max-w-xs truncate">
                      {evt.description || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                        "bg-green-50 text-green-600": evt.status === "RESOLVED",
                        "bg-red-50 text-red-600": evt.status === "OPEN",
                      })}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      {evt.status === "OPEN" && (
                        <button
                          onClick={() => handleResolve(evt.id)}
                          disabled={resolving === evt.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {resolving === evt.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Resolve
                        </button>
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

      {/* Event Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || selected?.driverName || "Event Detail"}
        subtitle={`Compliance Event — ${(selected?.type || "").replace(/_/g, " ")}`}
      >
        {selected && (
          <div className="space-y-5">
            {/* Event Type Header */}
            <div className={cn("p-4 rounded-xl border", {
              "bg-red-50 border-red-100": selected.severity === "CRITICAL" || selected.severity === "HIGH",
              "bg-yellow-50 border-yellow-100": selected.severity === "MEDIUM",
              "bg-gray-50 border-gray-100": selected.severity === "LOW",
            })}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[selected.type] || "bg-gray-100 text-gray-500")}>
                  {(selected.type || "").replace(/_/g, " ")}
                </span>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", SEVERITY_COLORS[selected.severity] || "bg-gray-100 text-gray-500")}>
                  {selected.severity}
                </span>
              </div>
              <p className="text-sm mt-2">{selected.description || "No description"}</p>
            </div>

            {/* Status + Resolve */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-[10px] text-secondary uppercase font-medium">Status</p>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium mt-1 inline-block", {
                  "bg-green-50 text-green-600": selected.status === "RESOLVED",
                  "bg-red-50 text-red-600": selected.status === "OPEN",
                })}>
                  {selected.status}
                </span>
              </div>
              {selected.status === "OPEN" && (
                <button
                  onClick={() => handleResolve(selected.id)}
                  disabled={resolving === selected.id}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {resolving === selected.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Mark Resolved
                </button>
              )}
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "—"],
                ["Time", selected.createdAt ? new Date(selected.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Driver", selected.driver?.name || selected.driverName || "—"],
                ["Driver ID", selected.driver?.platformDriverId || "—"],
                ["Zone", selected.zone || selected.driver?.zone || "—"],
                ["Session", selected.sessionCode || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Metadata */}
            {selected.metadata && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Event Metadata</h3>
                <div className="space-y-2">
                  {Object.entries(selected.metadata).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-sm text-secondary font-mono">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Info */}
            {selected.status === "RESOLVED" && selected.resolvedAt && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Resolution</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Resolved At", new Date(selected.resolvedAt).toLocaleString()],
                    ["Resolved By", selected.resolvedBy || "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                {selected.resolutionNote && (
                  <div className="bg-gray-50 rounded-xl p-3 mt-2">
                    <p className="text-[10px] text-secondary uppercase font-medium">Note</p>
                    <p className="text-sm mt-0.5">{selected.resolutionNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
