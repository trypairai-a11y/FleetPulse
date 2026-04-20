"use client";
import { useState, useRef } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import StatCard from "@/components/shared/StatCard";
import FilterBar from "@/components/shared/FilterBar";
import { cn } from "@/lib/cn";
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  Moon,
  Info,
  CheckCircle2,
} from "lucide-react";

const DAYS_OF_WEEK = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const STORES = [
  "KFC Audiliya",
  "KFC Salwa",
  "KFC Salmiya",
  "KFC Jabriya",
  "Pizza Hut Hawally",
  "Pizza Hut Salmiya",
  "Hardees Fahaheel",
];

function getWeekStart(date: Date): Date {
  // Start on Saturday
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diff = day === 6 ? 0 : day + 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function getWeekDates(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

type ShiftCell = { time: string; slot: "AM" | "PM" } | "OFF" | null;

function ShiftCellDisplay({ cell }: { cell: ShiftCell }) {
  if (cell === null) {
    return <span className="text-xs text-gray-300">-</span>;
  }
  if (cell === "OFF") {
    return (
      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-400">
        OFF
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-medium text-foreground">{cell.time}</span>
      <span className={cn("px-1.5 py-0 rounded text-[10px] font-semibold",
        cell.slot === "AM" ? "bg-yellow-50 text-yellow-700" : "bg-purple-50 text-purple-700"
      )}>
        {cell.slot}
      </span>
    </div>
  );
}

export default function AmericanaShiftsPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const weekDates = getWeekDates(weekStart);
  const dateFrom = weekStart.toISOString().split("T")[0];
  const dateTo = weekDates[6].toISOString().split("T")[0];

  const params = new URLSearchParams({ platform: "AMERICANA", limit: "200", dateFrom, dateTo });
  if (filters.store) params.set("store", filters.store);
  if (filters.search) params.set("search", filters.search);

  const { data: scheduleData, loading } = useApiGet<any>(`/api/shifts/schedule?${params}`);
  const { data: summary } = useApiGet<any>(`/api/shifts/summary?platform=AMERICANA&dateFrom=${dateFrom}&dateTo=${dateTo}`);

  const scheduleRows: any[] = scheduleData?.data || [];

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setImportSuccess(false);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setImportSuccess(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("platform", "AMERICANA");
      form.append("dateFrom", dateFrom);
      await api.post("/api/shifts/import", form);
      setImportSuccess(true);
    } catch { /* silent */ } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-americana" />
          <h1 className="text-xl font-semibold">Americana - Shifts</h1>
          <span className="text-sm text-secondary">Al Hazm Express</span>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {importing ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Import Schedule (XLSX)
          </button>
        </div>
      </div>

      {/* Import Success */}
      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">Schedule imported successfully for week of {formatWeekLabel(weekStart)}.</p>
        </div>
      )}

      {/* Americana Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">Americana shift structure is unique:</span> Weekly schedule is managed per branch with AM/PM designations.
          Americana has <span className="font-semibold">no native face verification</span> - Darb injects face check via the Android agent at clock-in.
        </p>
      </div>

      {/* Ramadan Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Moon size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Ramadan Schedule Active</span> - drivers must stay until all orders are delivered after 4:00 AM.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Drivers Scheduled" value={summary?.scheduled || scheduleRows.length} icon={Users} />
        <StatCard title="AM Shifts" value={summary?.amShifts || 0} icon={CalendarDays} />
        <StatCard title="PM Shifts" value={summary?.pmShifts || 0} icon={CalendarDays} />
      </div>

      {/* Week Navigator + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Week nav */}
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <button onClick={prevWeek} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[200px] text-center">{formatWeekLabel(weekStart)}</span>
          <button onClick={nextWeek} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <FilterBar
          filters={[
            { key: "search", type: "search", label: "Search", placeholder: "Search driver or ID..." },
            { key: "store", type: "select", label: "All Stores", options: STORES.map((s) => ({ value: s, label: s })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        />
      </div>

      {/* Weekly Schedule Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                <th className="text-left text-xs font-medium text-secondary px-4 py-3 min-w-[60px]">ID</th>
                <th className="text-left text-xs font-medium text-secondary px-4 py-3 min-w-[160px]">Driver Name</th>
                <th className="text-left text-xs font-medium text-secondary px-4 py-3 min-w-[140px]">Store</th>
                {DAYS_OF_WEEK.map((day, i) => (
                  <th key={day} className="text-center text-xs font-medium text-secondary px-3 py-3 min-w-[90px]">
                    <div>{day}</div>
                    <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                      {weekDates[i].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-secondary">Loading schedule…</td>
                </tr>
              ) : scheduleRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarDays size={28} className="text-gray-300" />
                      <p className="text-sm text-secondary">No schedule for this week</p>
                      <p className="text-xs text-gray-400">Import an XLSX schedule to populate this table</p>
                    </div>
                  </td>
                </tr>
              ) : (
                scheduleRows.map((row: any) => (
                  <tr key={row.driverId} className="border-b border-gray-50 last:border-0 hover:bg-gray-25 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-secondary">{row.employeeId || "-"}</td>
                    <td className="px-4 py-3 text-sm font-medium">{row.driverName}</td>
                    <td className="px-4 py-3 text-xs text-secondary">{row.storeName || "-"}</td>
                    {DAYS_OF_WEEK.map((_, i) => {
                      const cell: ShiftCell = row.days?.[i] ?? null;
                      return (
                        <td key={i} className="px-3 py-3 text-center">
                          <ShiftCellDisplay cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-4 bg-gray-50/40">
          <span className="text-[10px] text-secondary uppercase font-medium">Legend:</span>
          {[
            { label: "AM Shift", color: "bg-yellow-50 text-yellow-700" },
            { label: "PM Shift", color: "bg-purple-50 text-purple-700" },
            { label: "OFF", color: "bg-gray-100 text-gray-400" },
          ].map(({ label, color }) => (
            <span key={label} className={cn("px-2 py-0.5 rounded-md text-xs font-medium", color)}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
