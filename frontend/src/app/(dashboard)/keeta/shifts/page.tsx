"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import SlidePanel from "@/components/shared/SlidePanel";
import { cn } from "@/lib/cn";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart2,
  CalendarCheck,
} from "lucide-react";

const ZONES = ["Hawally", "Salmiya", "Jabriya", "Rumaithiya", "Bayan"];

const KEETA_SLOTS = [
  { id: "s1", label: "04:00 – 08:00", start: "04:00", end: "08:00" },
  { id: "s2", label: "08:00 – 12:00", start: "08:00", end: "12:00" },
  { id: "s3", label: "12:00 – 15:00", start: "12:00", end: "15:00" },
  { id: "s4", label: "15:00 – 19:00", start: "15:00", end: "19:00" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_STATUS_STYLES: Record<string, string> = {
  BOOKED: "bg-blue-50 text-blue-700 border border-blue-100",
  COMPLETED: "bg-green-50 text-green-700 border border-green-100",
  MISSED: "bg-red-50 text-red-600 border border-red-100",
};

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ShiftValidity({ valid }: { valid: boolean | null }) {
  if (valid === null) return null;
  return valid ? (
    <CheckCircle2 size={12} className="text-green-500 shrink-0" />
  ) : (
    <XCircle size={12} className="text-red-400 shrink-0" />
  );
}

export default function KeetaShiftsPage() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  const weekEnd = addDays(weekStart, 6);

  const params = new URLSearchParams({
    platform: "KEETA",
    dateFrom: formatDate(weekStart),
    dateTo: formatDate(weekEnd),
    limit: "500",
  });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.driver) params.set("search", filters.driver);

  const { data, loading } = useApiGet<any>(`/api/shifts?${params}`);
  const shifts: any[] = data?.data || [];

  // Build week dates
  const weekDates = WEEK_DAYS.map((_, i) => addDays(weekStart, i));

  // Index shifts by date+slot
  const shiftMap: Record<string, any[]> = {};
  for (const shift of shifts) {
    const dateStr = shift.date ? shift.date.split("T")[0] : "";
    const slotId = KEETA_SLOTS.find(
      (s) => shift.startTime?.startsWith(s.start) || shift.scheduledStart?.includes(s.start)
    )?.id || "s1";
    const key = `${dateStr}_${slotId}`;
    if (!shiftMap[key]) shiftMap[key] = [];
    shiftMap[key].push(shift);
  }

  // Compliance stats
  const total = shifts.length;
  const booked = shifts.filter((s) => s.status === "BOOKED" || s.status === "COMPLETED").length;
  const completed = shifts.filter((s) => s.status === "COMPLETED").length;
  const valid = shifts.filter((s) => s.isValid === true).length;

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const totalPlanned = shifts.reduce((acc, s) => acc + (s.plannedHours || 4), 0);
  const totalActual = shifts.reduce((acc, s) => acc + (s.actualHours || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-keeta" />
        <h1 className="text-xl font-semibold">Keeta — Shifts</h1>
        <span className="text-sm text-secondary">Sidra</span>
      </div>

      {/* Compliance Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Shifts" value={total} icon={CalendarCheck} />
        <StatCard
          title="% Booked"
          value={`${pct(booked)}%`}
          icon={BarChart2}
          trend={`${booked} of ${total}`}
        />
        <StatCard
          title="% Valid"
          value={`${pct(valid)}%`}
          icon={CheckCircle2}
          trend={`${valid} valid shifts`}
          highlight={pct(valid) < 70}
        />
        <StatCard
          title="% Completed"
          value={`${pct(completed)}%`}
          icon={Clock}
          trend={`${totalActual.toFixed(1)}h actual / ${totalPlanned}h planned`}
        />
      </div>

      {/* Filters + Week nav */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <FilterBar
          filters={[
            { key: "zone", type: "select", label: "All Zones", options: ZONES.map((z) => ({ value: z, label: z })) },
            { key: "driver", type: "search", label: "Driver", placeholder: "Search driver…" },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            This week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-50">
          <div className="px-3 py-3 text-xs font-medium text-secondary">Slot</div>
          {weekDates.map((d, i) => (
            <div
              key={i}
              className={cn(
                "px-2 py-3 text-center text-xs font-medium",
                formatDate(d) === formatDate(new Date()) ? "text-primary" : "text-secondary"
              )}
            >
              <div className="font-semibold">{WEEK_DAYS[i]}</div>
              <div className="text-[11px] mt-0.5">{formatShortDate(d)}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-secondary">Loading shifts…</div>
        ) : (
          KEETA_SLOTS.map((slot) => (
            <div key={slot.id} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-50 last:border-0 min-h-[90px]">
              <div className="px-3 py-3 flex flex-col justify-center border-r border-gray-50">
                <p className="text-[11px] font-semibold text-foreground">{slot.start}</p>
                <p className="text-[10px] text-secondary">{slot.end}</p>
              </div>
              {weekDates.map((d, di) => {
                const key = `${formatDate(d)}_${slot.id}`;
                const cells = shiftMap[key] || [];
                return (
                  <div
                    key={di}
                    className={cn(
                      "px-1.5 py-2 border-r border-gray-50 last:border-0 space-y-1",
                      formatDate(d) === formatDate(new Date()) && "bg-primary/[0.02]"
                    )}
                  >
                    {cells.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-gray-200 text-xs">·</span>
                      </div>
                    ) : (
                      cells.map((shift: any) => (
                        <button
                          key={shift.id}
                          onClick={() => setSelected(shift)}
                          className={cn(
                            "w-full text-left rounded-lg px-2 py-1.5 text-[11px] transition-all hover:opacity-80 space-y-0.5",
                            SHIFT_STATUS_STYLES[shift.status] || "bg-gray-50 border border-gray-100 text-gray-600"
                          )}
                        >
                          <div className="flex items-center gap-1 justify-between">
                            <span className="font-semibold truncate max-w-[70px]">{shift.driver?.name?.split(" ")[0] || "—"}</span>
                            <ShiftValidity valid={shift.isValid ?? null} />
                          </div>
                          <div className="text-[10px] opacity-70 truncate">{shift.driver?.zone || shift.zone || "—"}</div>
                        </button>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Slot legend */}
      <div className="flex items-center gap-6 text-xs text-secondary">
        {KEETA_SLOTS.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-keeta/60" />
            {s.label}
          </span>
        ))}
      </div>

      {/* Shift status legend */}
      <div className="flex items-center gap-4">
        {Object.entries(SHIFT_STATUS_STYLES).map(([status, cls]) => (
          <span key={status} className={cn("px-2 py-0.5 rounded-md text-xs font-medium", cls)}>{status}</span>
        ))}
      </div>

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || "Shift Detail"}
        subtitle="Keeta / Sidra"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", selected.date ? new Date(selected.date).toLocaleDateString() : "—"],
                ["Zone", selected.driver?.zone || selected.zone || "—"],
                ["Slot", KEETA_SLOTS.find((s) => selected.startTime?.includes(s.start))?.label || "—"],
                ["Status", selected.status],
                ["Validity", selected.isValid === true ? "Valid" : selected.isValid === false ? "Invalid" : "—"],
                ["Planned Hours", `${selected.plannedHours || 4}h`],
                ["Actual Hours", selected.actualHours ? `${selected.actualHours}h` : "—"],
                ["Actual Start", selected.actualStart ? new Date(selected.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Actual End", selected.actualEnd ? new Date(selected.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium mb-1">Notes</p>
                <p className="text-sm">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
