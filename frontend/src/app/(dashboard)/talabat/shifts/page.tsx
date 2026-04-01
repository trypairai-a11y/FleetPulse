"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck, Camera, MapPin, CalendarDays, ChevronRight,
} from "lucide-react";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

function VerifiedBadge({ value, label }: { value: boolean; label?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
      <CheckCircle2 size={11} /> {label || "Verified"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
      <XCircle size={11} /> {label ? `${label} Failed` : "Not Verified"}
    </span>
  );
}

function GpsBar({ compliance }: { compliance: number }) {
  const pct = Math.min(100, Math.max(0, compliance));
  const color = pct >= 90 ? "bg-green-400" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-20">
        <div className={cn("h-1.5 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-secondary font-mono">{pct}%</span>
    </div>
  );
}

export default function TalabatShiftsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [week, setWeek] = useState(new Date().toISOString().split("T")[0]);

  const params = new URLSearchParams({ platform: "TALABAT", limit: "100" });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.batch) params.set("batchNumber", filters.batch);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("dateFrom", week);

  const { data: summary } = useApiGet<any>("/api/shifts/summary?platform=TALABAT");
  const { data: shifts } = useApiGet<any>(`/api/shifts?${params}`);
  const shiftList = shifts?.data || [];

  const totalBooked = shiftList.reduce((s: number, r: any) => s + (r.bookedHours || 0), 0);
  const totalActual = shiftList.reduce((s: number, r: any) => s + (r.actualHours || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <h1 className="text-xl font-semibold">Talabat — Shifts</h1>
        <span className="text-sm text-secondary">Wahoo International</span>
        <span className="ml-2 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Released Tue 8–11 AM by batch
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Shifts This Week" value={shiftList.length} icon={CalendarDays} />
        <StatCard title="Booked Hours" value={`${totalBooked.toFixed(1)}h`} icon={Clock} />
        <StatCard title="Actual Hours" value={`${totalActual.toFixed(1)}h`} icon={Clock} />
        <StatCard
          title="Face Fail Pre-Shift"
          value={summary?.faceFailCount || 0}
          icon={ShieldCheck}
          highlight={(summary?.faceFailCount || 0) > 0}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="date"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <FilterBar
          filters={[
            { key: "search", type: "search", label: "Search", placeholder: "Search driver..." },
            {
              key: "zone", type: "select", label: "All Zones",
              options: TALABAT_ZONES.map(z => ({ value: z, label: z })),
            },
            {
              key: "batch", type: "select", label: "All Batches",
              options: ["Batch A", "Batch B", "Batch C", "Batch D"].map(b => ({ value: b, label: b })),
            },
            {
              key: "status", type: "select", label: "All Statuses", options: [
                { value: "COMPLETED", label: "Completed" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "MISSED", label: "Missed" },
                { value: "CANCELLED", label: "Cancelled" },
              ],
            },
          ]}
          values={filters}
          onChange={(k, v) => setFilters({ ...filters, [k]: v })}
        />
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Batch</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Session</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Zone</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Booked</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Actual</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Face</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Equipment</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">GPS</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {shiftList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-sm text-secondary">
                    No shifts found for this period
                  </td>
                </tr>
              ) : (
                shiftList.map((shift: any) => {
                  const hoursMatch = !shift.bookedHours || !shift.actualHours || Math.abs(shift.bookedHours - shift.actualHours) < 0.5;
                  return (
                    <tr
                      key={shift.id}
                      onClick={() => setSelected(shift)}
                      className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-medium">{shift.driver?.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                          {shift.batchNumber || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs text-foreground leading-tight">
                          <span className="font-medium">{shift.zone}_{shift.vehicleType?.toLowerCase() || "car"}</span>
                          <br />
                          <span className="text-secondary">
                            {shift.scheduledStart
                              ? new Date(shift.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                            {shift.scheduledEnd
                              ? `–${new Date(shift.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : ""}
                            {shift.scheduledDuration ? ` (${shift.scheduledDuration})` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">{shift.zone}</td>
                      <td className="px-5 py-3 text-sm font-mono text-secondary">
                        {shift.bookedHours ? `${shift.bookedHours.toFixed(1)}h` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "text-sm font-mono",
                          !hoursMatch ? "text-amber-600 font-medium" : "text-secondary"
                        )}>
                          {shift.actualHours ? `${shift.actualHours.toFixed(1)}h` : "—"}
                          {!hoursMatch && <AlertTriangle size={11} className="inline ml-1" />}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <VerifiedBadge value={shift.faceVerified} />
                      </td>
                      <td className="px-5 py-3">
                        <VerifiedBadge value={shift.equipmentVerified} label="Equip" />
                      </td>
                      <td className="px-5 py-3">
                        {shift.gpsCompliance !== undefined
                          ? <GpsBar compliance={shift.gpsCompliance} />
                          : <span className="text-xs text-secondary">—</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-green-50 text-green-600": shift.status === "COMPLETED",
                          "bg-blue-50 text-blue-600": shift.status === "IN_PROGRESS",
                          "bg-red-50 text-red-600": shift.status === "MISSED",
                          "bg-gray-100 text-gray-500": shift.status === "CANCELLED",
                        })}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <ChevronRight size={15} className="text-gray-300" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || "Shift Detail"}
        subtitle={`Talabat Shift — ${selected?.batchNumber || ""}`}
      >
        {selected && (
          <div className="space-y-5">
            {/* Session Info */}
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-xs text-orange-600 font-medium uppercase tracking-wide mb-1">Session</p>
              <p className="text-lg font-semibold text-orange-800 font-mono">
                {selected.zone}_{selected.vehicleType?.toLowerCase() || "car"}
              </p>
              <p className="text-sm text-orange-600 font-mono mt-0.5">
                {selected.scheduledStart
                  ? new Date(selected.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "?"}
                {selected.scheduledEnd
                  ? `–${new Date(selected.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
                {selected.scheduledDuration ? ` (${selected.scheduledDuration})` : ""}
              </p>
            </div>

            {/* Hours Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Booked Hours</p>
                <p className="text-xl font-semibold mt-0.5 font-mono">{selected.bookedHours ? `${selected.bookedHours.toFixed(1)}h` : "—"}</p>
              </div>
              <div className={cn("rounded-xl p-3", Math.abs((selected.bookedHours || 0) - (selected.actualHours || 0)) > 0.5 ? "bg-amber-50" : "bg-gray-50")}>
                <p className="text-[10px] text-secondary uppercase font-medium">Actual Hours</p>
                <p className="text-xl font-semibold mt-0.5 font-mono">{selected.actualHours ? `${selected.actualHours.toFixed(1)}h` : "—"}</p>
              </div>
            </div>

            {/* Verification Checks */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">Pre-Shift Verification</h3>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck size={15} className="text-secondary" /> Face Verification
                </div>
                <VerifiedBadge value={selected.faceVerified} />
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Camera size={15} className="text-secondary" /> Equipment Check
                </div>
                <VerifiedBadge value={selected.equipmentVerified} label="Equip" />
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin size={15} className="text-secondary" /> GPS Compliance
                </div>
                {selected.gpsCompliance !== undefined
                  ? <GpsBar compliance={selected.gpsCompliance} />
                  : <span className="text-xs text-secondary">—</span>
                }
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Batch", selected.batchNumber],
                ["Zone", selected.zone],
                ["Vehicle Type", selected.vehicleType],
                ["Status", selected.status],
                ["Date", selected.scheduledStart ? new Date(selected.scheduledStart).toLocaleDateString() : "—"],
                ["Platform ID", selected.platformShiftId || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
