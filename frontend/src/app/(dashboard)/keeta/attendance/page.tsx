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
  Camera,
} from "lucide-react";

type Tab = "daily" | "monthly" | "leaves";

const ZONES = ["Hawally", "Salmiya", "Jabriya", "Rumaithiya", "Bayan"];

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-green-50 text-green-700",
  LATE: "bg-orange-50 text-orange-700",
  ABSENT: "bg-red-50 text-red-700",
  EARLY_LEAVE: "bg-yellow-50 text-yellow-700",
  EXCUSED: "bg-gray-100 text-gray-600",
};

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function ShiftValidity({ valid }: { valid: boolean | null }) {
  if (valid === null) return <span className="text-xs text-secondary">—</span>;
  return valid ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <CheckCircle2 size={13} /> Valid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <XCircle size={13} /> Invalid
    </span>
  );
}

export default function KeetaAttendancePage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [filters, setFilters] = useState<Record<string, string>>({
    date: new Date().toISOString().split("T")[0],
  });
  const [selected, setSelected] = useState<any>(null);
  const [leaveAction, setLeaveAction] = useState<Record<string, string>>({});

  const params = new URLSearchParams({ platform: "KEETA", limit: "100" });
  if (filters.date) { params.set("dateFrom", filters.date); params.set("dateTo", filters.date); }
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);

  const { data: records, loading } = useApiGet<any>(`/api/attendance?${params}`);
  const { data: summary } = useApiGet<any>("/api/attendance/summary?platform=KEETA");
  const { data: leaves } = useApiGet<any>("/api/leave-requests?platform=KEETA&limit=50");

  const attendanceList: any[] = records?.data || [];
  const leaveList: any[] = leaves?.data || [];

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
      render: (_: any, r: any) => (
        <span className="font-medium text-sm">{r.driver?.name || "—"}</span>
      ),
    },
    {
      key: "zone",
      label: "Zone",
      render: (_: any, r: any) => (
        <span className="text-sm text-secondary">{r.driver?.zone || r.zone || "—"}</span>
      ),
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
          <span className="text-secondary text-sm">—</span>
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
          <span className="text-secondary text-sm">—</span>
        ),
    },
    {
      key: "selfie",
      label: "Selfie",
      render: (_: any, r: any) =>
        r.selfieUrl ? (
          <img src={r.selfieUrl} alt="selfie" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Camera size={12} className="text-gray-400" />
          </div>
        ),
    },
    {
      key: "gps",
      label: "GPS",
      render: (_: any, r: any) =>
        r.gpsLocation ? (
          <span className="inline-flex items-center gap-1 text-xs text-secondary">
            <MapPin size={11} />
            {r.gpsLocation}
          </span>
        ) : (
          <span className="text-secondary text-sm">—</span>
        ),
    },
    {
      key: "shiftValidity",
      label: "Shift",
      render: (_: any, r: any) => <ShiftValidity valid={r.shift?.isValid ?? null} />,
    },
    {
      key: "status",
      label: "Status",
      render: (_: any, r: any) => {
        const status =
          r.status === "PRESENT" && r.shift?.isValid === false ? "EARLY_LEAVE" : r.status;
        return (
          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_STYLES[status] || "bg-gray-100 text-gray-600")}>
            {status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-keeta" />
        <h1 className="text-xl font-semibold">Keeta — Attendance</h1>
        <span className="text-sm text-secondary">Sidra</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Present" value={summary?.present ?? present} icon={CalendarCheck} />
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
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
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
              { key: "zone", type: "select", label: "All Zones", options: ZONES.map((z) => ({ value: z, label: z })) },
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
            <h2 className="text-sm font-semibold">Monthly Summary — {new Date().toLocaleString("default", { month: "long", year: "numeric" })}</h2>
            <select className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
              <option>All Zones</option>
              {ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-secondary font-medium px-3 py-2 min-w-[140px]">Driver</th>
                  {MONTH_DAYS.map((d) => (
                    <th key={d} className="text-center text-secondary font-medium px-1 py-2 min-w-[28px]">{d}</th>
                  ))}
                  <th className="text-right text-secondary font-medium px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={33} className="px-3 py-10 text-center text-sm text-secondary">
                      Select a date range to view monthly summary
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 font-medium">{r.driver?.name}</td>
                      {MONTH_DAYS.map((d) => (
                        <td key={d} className="px-1 py-2 text-center">
                          <span className="w-5 h-5 rounded-full inline-flex items-center justify-center bg-gray-100 text-gray-400">·</span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 pt-2">
            {[
              { label: "Present", color: "bg-green-50 text-green-700" },
              { label: "Late", color: "bg-orange-50 text-orange-700" },
              { label: "Absent", color: "bg-red-50 text-red-700" },
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
                {["Driver", "Type", "From", "To", "Days", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-secondary px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaveList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">No leave requests</td>
                </tr>
              ) : (
                leaveList.map((leave: any) => {
                  const actionTaken = leaveAction[leave.id] || leave.status;
                  return (
                    <tr key={leave.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 text-sm font-medium">{leave.driver?.name}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{leave.type}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{new Date(leave.startDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{new Date(leave.endDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{leave.days || "—"}</td>
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
        subtitle="Keeta / Sidra"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", filters.date],
                ["Zone", selected.driver?.zone || selected.zone || "—"],
                ["Status", selected.status],
                ["Clock In", selected.shift?.actualStart ? new Date(selected.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Clock Out", selected.shift?.actualEnd ? new Date(selected.shift.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Late (min)", selected.lateMinutes ?? "—"],
                ["Shift Validity", selected.shift?.isValid === true ? "Valid" : selected.shift?.isValid === false ? "Invalid" : "—"],
                ["GPS", selected.gpsLocation || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            {selected.selfieUrl && (
              <div>
                <p className="text-[10px] text-secondary uppercase font-medium mb-2">Clock-In Selfie</p>
                <img src={selected.selfieUrl} alt="Clock-in selfie" className="w-full rounded-xl object-cover max-h-48 border border-gray-100" />
              </div>
            )}
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
