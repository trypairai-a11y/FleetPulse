"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  CalendarCheck,
  Clock,
  UserX,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  Moon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type Tab = "daily" | "monthly" | "leaves";
type ShiftSlot = "AM" | "PM" | "BOTH" | "ABSENT";

const STORES = [
  "KFC Audiliya",
  "KFC Salwa",
  "KFC Salmiya",
  "KFC Jabriya",
  "KFC Rumaithiya",
  "Pizza Hut Hawally",
  "Pizza Hut Salmiya",
  "Hardees Fahaheel",
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-green-50 text-green-700",
  LATE: "bg-orange-50 text-orange-700",
  ABSENT: "bg-red-50 text-red-700",
  EARLY_LEAVE: "bg-yellow-50 text-yellow-700",
  EXCUSED: "bg-gray-100 text-gray-600",
};

const SHIFT_SLOT_STYLES: Record<ShiftSlot, string> = {
  AM: "bg-yellow-50 text-yellow-700",
  PM: "bg-purple-50 text-purple-700",
  BOTH: "bg-green-50 text-green-700",
  ABSENT: "bg-red-50 text-red-600",
};

function ShiftSlotBadge({ slot }: { slot: ShiftSlot | null }) {
  if (!slot) return <span className="text-xs text-secondary">-</span>;
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", SHIFT_SLOT_STYLES[slot])}>
      {slot}
    </span>
  );
}

function GPSVerification({ valid }: { valid: boolean | null }) {
  if (valid === null) return <span className="text-xs text-secondary">-</span>;
  return valid ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <CheckCircle2 size={13} /> At Store
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <XCircle size={13} /> Off-site
    </span>
  );
}

export default function AmericanaAttendancePage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [filters, setFilters] = useState<Record<string, string>>({
    date: new Date().toISOString().split("T")[0],
  });
  const [selected, setSelected] = useState<any>(null);
  const [leaveAction, setLeaveAction] = useState<Record<string, string>>({});

  const params = new URLSearchParams({ platform: "AMERICANA", limit: "100" });
  if (filters.date) { params.set("dateFrom", filters.date); params.set("dateTo", filters.date); }
  if (filters.store) params.set("store", filters.store);
  if (filters.shift) params.set("shiftSlot", filters.shift);
  if (filters.status) params.set("status", filters.status);

  const { data: records, loading } = useApiGet<any>(`/api/attendance?${params}`);
  const { data: summary } = useApiGet<any>("/api/attendance/summary?platform=AMERICANA");
  const { data: leaves } = useApiGet<any>("/api/leave-requests?platform=AMERICANA&limit=50");

  const rawAttendance: any[] = records?.data || [];
  const leaveList: any[] = leaves?.data || [];

  // Mock face verification + mismatch data for demo
  const attendanceList = rawAttendance.map((r: any, i: number) => ({
    ...r,
    faceVerified: r.faceVerified ?? (i % 7 !== 0),
    faceMismatch: r.faceMismatch ?? (i % 7 === 0 || i % 13 === 0),
    gpsAtStore: r.gpsAtStore ?? (i % 9 !== 0),
  }));

  const present = attendanceList.filter((r) => r.status === "PRESENT").length;
  const late = attendanceList.filter((r) => r.status === "LATE").length;
  const absent = attendanceList.filter((r) => r.status === "ABSENT").length;
  const pendingLeaves = leaveList.filter((l) => l.status === "PENDING").length;

  const handleLeaveAction = async (id: string, action: "APPROVED" | "REJECTED") => {
    try {
      await api.put(`/api/leave-requests/${id}`, { status: action });
      setLeaveAction((prev) => ({ ...prev, [id]: action }));
    } catch { /* silent */ }
  };

  const columns = [
    {
      key: "driver",
      label: "Driver",
      render: (_: any, r: any) => <span className="font-medium text-sm">{r.driver?.name || "-"}</span>,
    },
    {
      key: "store",
      label: "Store",
      render: (_: any, r: any) => (
        <span className="text-sm text-secondary">{r.driver?.storeName || r.storeName || "-"}</span>
      ),
    },
    {
      key: "shiftSlot",
      label: "Shift",
      render: (_: any, r: any) => <ShiftSlotBadge slot={r.shiftSlot || null} />,
    },
    {
      key: "clockIn",
      label: "Clock In",
      render: (_: any, r: any) =>
        r.shift?.actualStart ? (
          <span className="text-sm">
            {new Date(r.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : (
          <span className="text-secondary text-sm">-</span>
        ),
    },
    {
      key: "clockOut",
      label: "Clock Out",
      render: (_: any, r: any) =>
        r.shift?.actualEnd ? (
          <span className="text-sm">
            {new Date(r.shift.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : (
          <span className="text-secondary text-sm">-</span>
        ),
    },
    {
      key: "gpsVerified",
      label: "GPS @ Store",
      render: (_: any, r: any) => <GPSVerification valid={r.gpsAtStore ?? null} />,
    },
    {
      key: "faceVerified",
      label: "Face",
      render: (_: any, r: any) =>
        r.faceVerified != null ? (
          r.faceVerified ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 size={13} /> Pass
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
              <XCircle size={13} /> Fail
            </span>
          )
        ) : (
          <span className="text-xs text-secondary">-</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (_: any, r: any) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_STYLES[r.status] || "bg-gray-100 text-gray-600")}>
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-americana" />
        <h1 className="text-xl font-semibold">Americana - Attendance</h1>
        <span className="text-sm text-secondary">Al Hazm Express</span>
      </div>

      {/* Americana Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <ToggleRight size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Americana Clock-In</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Americana's native app uses a simple Start Shift toggle - no face verification.
            Darb adds <span className="font-semibold">face verification + GPS store check</span> via the Android agent at clock-in.
          </p>
        </div>
      </div>

      {/* Ramadan Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Moon size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Ramadan Schedule Active</span> - drivers must stay until all orders are delivered after 4:00 AM.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Present Today" value={summary?.present ?? present} icon={CalendarCheck} />
        <StatCard title="Late" value={summary?.late ?? late} icon={Clock} />
        <StatCard title="Absent" value={summary?.absent ?? absent} icon={UserX} highlight={(summary?.absent ?? absent) > 5} />
        <StatCard title="Pending Leaves" value={summary?.pendingLeaves ?? pendingLeaves} icon={FileText} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["daily", "monthly", "leaves"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t === "daily" ? "Daily Log" : t === "monthly" ? "Monthly Summary" : "Leave Requests"}
          </button>
        ))}
      </div>

      {/* Daily Tab */}
      {tab === "daily" && (
        <div className="space-y-4">
          <FilterBar
            filters={[
              { key: "date", type: "date", label: "Date" },
              { key: "store", type: "select", label: "All Stores", options: STORES.map((s) => ({ value: s, label: s })) },
              {
                key: "shift",
                type: "select",
                label: "All Shifts",
                options: [
                  { value: "AM", label: "AM Shift" },
                  { value: "PM", label: "PM Shift" },
                  { value: "BOTH", label: "AM + PM" },
                ],
              },
              {
                key: "status",
                type: "select",
                label: "All Statuses",
                options: [
                  { value: "PRESENT", label: "Present" },
                  { value: "LATE", label: "Late" },
                  { value: "ABSENT", label: "Absent" },
                  { value: "EXCUSED", label: "Excused" },
                ],
              },
            ]}
            values={filters}
            onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          />
          <DataTable
            columns={columns}
            data={attendanceList}
            onRowClick={setSelected}
            emptyMessage={loading ? "Loading…" : "No attendance records for this date"}
          />
        </div>
      )}

      {/* Monthly Tab */}
      {tab === "monthly" && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Monthly Summary - {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <select className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
              <option>All Stores</option>
              {STORES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-secondary font-medium px-3 py-2 min-w-[160px]">Driver</th>
                  <th className="text-left text-secondary font-medium px-3 py-2 min-w-[140px]">Store</th>
                  {MONTH_DAYS.map((d) => (
                    <th key={d} className="text-center text-secondary font-medium px-1 py-2 min-w-[28px]">{d}</th>
                  ))}
                  <th className="text-right text-secondary font-medium px-3 py-2">AM</th>
                  <th className="text-right text-secondary font-medium px-3 py-2">PM</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={35} className="px-3 py-10 text-center text-sm text-secondary">
                      No data - select a date range to view monthly summary
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 font-medium">{r.driver?.name}</td>
                      <td className="px-3 py-2 text-secondary">{r.driver?.storeName || "-"}</td>
                      {MONTH_DAYS.map((d) => (
                        <td key={d} className="px-1 py-2 text-center">
                          <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-gray-100 text-gray-400">·</span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">-</td>
                      <td className="px-3 py-2 text-right font-medium">-</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {[
              { label: "AM Present", color: "bg-yellow-50 text-yellow-700" },
              { label: "PM Present", color: "bg-purple-50 text-purple-700" },
              { label: "Both", color: "bg-green-50 text-green-700" },
              { label: "Absent", color: "bg-red-50 text-red-600" },
              { label: "Excused", color: "bg-gray-100 text-gray-600" },
            ].map(({ label, color }) => (
              <span key={label} className={cn("px-2 py-0.5 rounded-md text-xs font-medium", color)}>{label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Leaves Tab */}
      {tab === "leaves" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {["Driver", "Store", "Type", "From", "To", "Days", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-secondary px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaveList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">No leave requests</td>
                </tr>
              ) : (
                leaveList.map((leave: any) => {
                  const actionTaken = leaveAction[leave.id] || leave.status;
                  return (
                    <tr key={leave.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 text-sm font-medium">{leave.driver?.name}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{leave.driver?.storeName || "-"}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{leave.type}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{new Date(leave.startDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{new Date(leave.endDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{leave.days || "-"}</td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-yellow-50 text-yellow-700": actionTaken === "PENDING",
                          "bg-green-50 text-green-700": actionTaken === "APPROVED",
                          "bg-red-50 text-red-600": actionTaken === "REJECTED",
                        })}>
                          {actionTaken}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {actionTaken === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLeaveAction(leave.id, "APPROVED")}
                              className="px-3 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction(leave.id, "REJECTED")}
                              className="px-3 py-1 text-xs font-medium bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || "Attendance Detail"}
        subtitle="Americana / Al Hazm Express"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", filters.date],
                ["Store", selected.driver?.storeName || selected.storeName || "-"],
                ["Shift Slot", selected.shiftSlot || "-"],
                ["Status", selected.status],
                ["Clock In", selected.shift?.actualStart ? new Date(selected.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"],
                ["Clock Out", selected.shift?.actualEnd ? new Date(selected.shift.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"],
                ["Late (min)", selected.lateMinutes ?? "-"],
                ["GPS @ Store", selected.gpsAtStore === true ? "Yes - at assigned store" : selected.gpsAtStore === false ? "No - off-site" : "-"],
                ["Face Verified (Darb)", selected.faceVerified === true ? "Passed" : selected.faceVerified === false ? "Failed" : "-"],
                ["Face Check", selected.faceMismatch === true ? "Failed - different person detected" : selected.faceMismatch === false ? "Passed - identity confirmed" : "-"],
                ["GPS Location", selected.gpsLocation || "-"],
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
