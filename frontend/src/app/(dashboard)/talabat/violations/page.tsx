"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  ShieldAlert, AlertTriangle, Camera, MapPin,
  ChevronRight,
} from "lucide-react";

/* ─── Violation tabs ─── */
type ViolationTab = "ALL" | "SELFIE_FAIL" | "GPS_OFF" | "EQUIPMENT_MISSING" | "SHIFT_NOT_BOOKED" | "OUT_OF_ZONE" | "CASH_THRESHOLD_EXCEEDED" | "LATE_CLOCK_IN";

const VIOLATION_TABS: { key: ViolationTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SELFIE_FAIL", label: "Selfie Failures" },
  { key: "GPS_OFF", label: "GPS Issues" },
  { key: "EQUIPMENT_MISSING", label: "Equipment" },
  { key: "SHIFT_NOT_BOOKED", label: "Shift Booking" },
  { key: "OUT_OF_ZONE", label: "Out of Zone" },
  { key: "CASH_THRESHOLD_EXCEEDED", label: "Cash Exceeded" },
  { key: "LATE_CLOCK_IN", label: "Late Check-in" },
];

const TYPE_COLORS: Record<string, string> = {
  SELFIE_FAIL: "bg-red-50 text-red-600",
  GPS_OFF: "bg-amber-50 text-amber-600",
  EQUIPMENT_MISSING: "bg-blue-50 text-blue-600",
  SHIFT_NOT_BOOKED: "bg-purple-50 text-purple-600",
  ZONE_MISMATCH: "bg-orange-50 text-orange-600",
  OUT_OF_ZONE: "bg-rose-50 text-rose-600",
  CASH_THRESHOLD_EXCEEDED: "bg-emerald-50 text-emerald-700",
  LATE_CHECK_IN: "bg-yellow-50 text-yellow-700",
  LATE_CLOCK_IN: "bg-yellow-50 text-yellow-600",
  EARLY_CLOCK_OUT: "bg-yellow-50 text-yellow-600",
  ORDER_CLICK_THROUGH: "bg-gray-100 text-gray-600",
};

function parseDriverDisplay(raw: string) {
  const m = raw.match(/^(.+?)\s+(\d+[A-Za-z]?)\s*[-–—]\s*(.+)$/);
  if (m) return { name: m[1].trim(), batch: m[2].trim(), company: m[3].trim() };
  return { name: raw, batch: "-", company: "-" };
}

export default function TalabatCompliancePage() {
  const [tab, setTab] = useState<ViolationTab>("ALL");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  const { data: companiesData } = useApiGet<any>("/api/companies?platform=TALABAT");
  const companies = companiesData?.data || [];

  /* ═══════════════════════════
     VIOLATIONS DATA
     ═══════════════════════════ */
  const violationParams = new URLSearchParams({ limit: "100" });
  if (tab !== "ALL") violationParams.set("type", tab);
  if (filters.dateFrom) violationParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) violationParams.set("dateTo", filters.dateTo);
  if (filters.search) violationParams.set("search", filters.search);
  if (filters.company) violationParams.set("companyId", filters.company);

  const summaryParams = new URLSearchParams();
  if (filters.company) summaryParams.set("companyId", filters.company);

  const { data: summaryRaw } = useApiGet<any>(`/api/talabat/compliance/summary?${summaryParams}`);
  const { data } = useApiGet<any>(`/api/talabat/compliance?${violationParams}`);
  const events = data?.data || [];

  const byType = summaryRaw?.byType || [];
  const totalEvents = byType.reduce((s: number, t: any) => s + t.count, 0);
  const selfieFailures = byType.find((t: any) => t.type === "SELFIE_FAIL")?.count || 0;
  const gpsViolations = byType.find((t: any) => t.type === "GPS_OFF")?.count || 0;
  const unresolvedCount = summaryRaw?.unresolvedCount || 0;

  const tabCounts: Record<ViolationTab, number> = {
    ALL: totalEvents,
    SELFIE_FAIL: selfieFailures,
    GPS_OFF: gpsViolations,
    EQUIPMENT_MISSING: byType.find((t: any) => t.type === "EQUIPMENT_MISSING")?.count || 0,
    SHIFT_NOT_BOOKED: byType.find((t: any) => t.type === "SHIFT_NOT_BOOKED")?.count || 0,
    OUT_OF_ZONE: byType.find((t: any) => t.type === "OUT_OF_ZONE")?.count || 0,
    CASH_THRESHOLD_EXCEEDED: byType.find((t: any) => t.type === "CASH_THRESHOLD_EXCEEDED")?.count || 0,
    LATE_CLOCK_IN: byType.find((t: any) => t.type === "LATE_CLOCK_IN")?.count || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <h1 className="text-xl font-semibold">Talabat</h1>
        <span className="text-secondary/30 text-lg font-light">/</span>
        <span className="text-xl text-secondary font-medium">Violations</span>
        <span className="text-xs text-secondary bg-gray-100 px-2.5 py-1 rounded-full font-medium">
          {filters.company ? companies.find((c: any) => c.id === filters.company)?.name || "All Companies" : companies[0]?.name || "All Companies"}
        </span>
      </div>

      {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4">
            <StatCard title="Total Events (This Week)" value={totalEvents} icon={ShieldAlert} />
          </div>

          {/* Violation Type Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {VIOLATION_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
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
              { key: "company", type: "select", label: "All Companies", options: companies.map((c: any) => ({ value: c.id, label: c.name })) },
              { key: "search", type: "search", label: "Search", placeholder: "Search driver name..." },
              { key: "dateFrom", type: "dateRange", label: "Date Range", toKey: "dateTo" },
            ]}
            values={filters}
            onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
          />

          {/* Events Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date / Time</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Batch</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Description</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">
                        No violations found
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
                            ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                            : "-"}
                          <br />
                          <span className="text-xs">
                            {evt.createdAt
                              ? new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium">
                          {parseDriverDisplay(evt.driver?.name || evt.driverName || "").name}
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary">
                          {parseDriverDisplay(evt.driver?.name || evt.driverName || "").batch}
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary">
                          {parseDriverDisplay(evt.driver?.name || evt.driverName || "").company}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[evt.type] || "bg-gray-100 text-gray-500")}>
                            {(evt.type || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary max-w-xs">
                          {evt.type === "OUT_OF_ZONE" && evt.metadata?.assignedZone ? (
                            <span>
                              Assigned: <span className="font-medium text-foreground">{evt.metadata.assignedZone}</span>
                              {evt.metadata.detectedZone && (
                                <> &rarr; Detected: <span className="font-medium text-rose-600">{evt.metadata.detectedZone}</span></>
                              )}
                            </span>
                          ) : evt.type === "SHIFT_NOT_BOOKED" && evt.shift ? (
                            <span>
                              {evt.shift.zone && <><span className="font-medium text-foreground">{evt.shift.zone}</span> &middot; </>}
                              {evt.shift.scheduledStart && (
                                <span className="font-medium text-foreground">
                                  {new Date(evt.shift.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                              {evt.shift.scheduledEnd && (
                                <>
                                  {" – "}
                                  <span className="font-medium text-foreground">
                                    {new Date(evt.shift.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </>
                              )}
                              {evt.shift.status && (
                                <span className="ml-1.5 text-xs text-purple-600">({evt.shift.status.replace(/_/g, " ")})</span>
                              )}
                            </span>
                          ) : (
                            <span className="truncate">{evt.description || "-"}</span>
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

      {/* ─── Violation Detail Panel ─── */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={parseDriverDisplay(selected?.driver?.name || selected?.driverName || "").name || "Event Detail"}
        subtitle={`Violation - ${(selected?.type || "").replace(/_/g, " ")}`}
      >
        {selected && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border bg-gray-50 border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[selected.type] || "bg-gray-100 text-gray-500")}>
                  {(selected.type || "").replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm mt-2">{selected.description || "No description"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "-"],
                ["Time", selected.createdAt ? new Date(selected.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"],
                ["Driver", parseDriverDisplay(selected.driver?.name || selected.driverName || "").name],
                ["Batch", parseDriverDisplay(selected.driver?.name || selected.driverName || "").batch],
                ["Company", parseDriverDisplay(selected.driver?.name || selected.driverName || "").company],
                ["Driver ID", selected.driver?.platformDriverId || "-"],
                ["Zone", selected.shift?.zone || selected.zone || selected.driver?.zone || "-"],
                ["Session", selected.sessionCode || "-"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
                </div>
              ))}
            </div>

            {/* Scheduled Shift Details for SHIFT_NOT_BOOKED */}
            {selected.type === "SHIFT_NOT_BOOKED" && selected.shift && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Scheduled Session</h3>
                <div className="space-y-2">
                  {[
                    ["Zone", selected.shift.zone || "-"],
                    ["Scheduled Start", selected.shift.scheduledStart ? new Date(selected.shift.scheduledStart).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"],
                    ["Scheduled End", selected.shift.scheduledEnd ? new Date(selected.shift.scheduledEnd).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"],
                    ["Shift Status", (selected.shift.status || "-").replace(/_/g, " ")],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between py-2.5 px-3 bg-purple-50/50 rounded-xl">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm text-secondary font-mono">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

          </div>
        )}
      </SlidePanel>

    </div>
  );
}
