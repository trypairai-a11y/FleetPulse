"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  CalendarCheck, Clock, UserX, FileText, ShieldAlert,
  Camera, MapPin, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";

type Tab = "daily" | "monthly" | "leaves";

const FACE_FAIL_REASONS: Record<string, string> = {
  HELMET: "Helmet covering face",
  MASK: "Mask detected",
  SUNGLASSES: "Sunglasses on",
  WRONG_PERSON: "Identity mismatch",
  LOW_QUALITY: "Image too dark / blurry",
};

const TALABAT_ZONES = [
  "Hawally", "Salmiya", "Jabriya", "Rumaithiya", "Bayan",
  "Mishref", "Sabah Al Salem", "Abu Halifa", "Fahaheel", "Mangaf",
];

function YesNoBadge({ value, falseLabel }: { value: boolean; falseLabel?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
      <CheckCircle2 size={11} /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
      <XCircle size={11} /> {falseLabel || "No"}
    </span>
  );
}

export default function TalabatAttendancePage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  const params = new URLSearchParams({
    platform: "TALABAT",
    dateFrom: date,
    dateTo: date,
    limit: "100",
  });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const { data: summary } = useApiGet<any>("/api/attendance/summary?platform=TALABAT");
  const { data: records } = useApiGet<any>(`/api/attendance?${params}`);
  const { data: monthly } = useApiGet<any>(
    tab === "monthly" ? `/api/attendance/monthly?platform=TALABAT&month=${date.slice(0, 7)}` : null
  );
  const { data: leaves } = useApiGet<any>("/api/leave-requests?platform=TALABAT&limit=50");

  const attendanceList = records?.data || [];
  const leaveList = leaves?.data || [];
  const monthlyList = monthly?.data || [];

  // Flag: clocked in from room (GPS zone mismatch with assigned zone)
  const flaggedCount = attendanceList.filter((r: any) => r.gpsZoneMismatch).length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <h1 className="text-xl font-semibold">Talabat — Attendance</h1>
        <span className="text-sm text-secondary">Wahoo International</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Present Today"
          value={`${summary?.present || 0} (${summary?.presentPercentage || 0}%)`}
          icon={CalendarCheck}
        />
        <StatCard title="Late Today" value={summary?.late || 0} icon={Clock} />
        <StatCard
          title="Absent Today"
          value={summary?.absent || 0}
          icon={UserX}
          highlight={(summary?.absent || 0) > 5}
        />
        <StatCard
          title="GPS Zone Flags"
          value={flaggedCount}
          icon={ShieldAlert}
          highlight={flaggedCount > 0}
        />
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
            {t === "leaves" ? "Leave Requests" : `${t === "daily" ? "Daily Log" : "Monthly Summary"}`}
          </button>
        ))}
      </div>

      {/* ── DAILY LOG ── */}
      {tab === "daily" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
                  key: "status", type: "select", label: "All Statuses", options: [
                    { value: "PRESENT", label: "Present" },
                    { value: "LATE", label: "Late" },
                    { value: "ABSENT", label: "Absent" },
                  ],
                },
              ]}
              values={filters}
              onChange={(k, v) => setFilters({ ...filters, [k]: v })}
            />
            {flaggedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle size={13} />
                {flaggedCount} driver{flaggedCount > 1 ? "s" : ""} logged from wrong zone
              </span>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Clock In</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Clock-in Location</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Face Verified</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Equipment Photo</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">GPS Zone Match</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">
                        No attendance records for this date
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((record: any) => (
                      <tr
                        key={record.id}
                        onClick={() => setSelected(record)}
                        className={cn(
                          "border-b border-gray-50 last:border-0 cursor-pointer transition-colors hover:bg-gray-50/50",
                          record.gpsZoneMismatch && "bg-amber-50/40"
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {record.gpsZoneMismatch && (
                              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium">{record.driver?.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                            "bg-green-100 text-green-700": record.status === "PRESENT",
                            "bg-orange-100 text-orange-700": record.status === "LATE",
                            "bg-red-100 text-red-700": record.status === "ABSENT",
                            "bg-gray-100 text-gray-600": record.status === "EXCUSED",
                          })}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary font-mono">
                          {record.shift?.actualStart
                            ? new Date(record.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-secondary">
                            <MapPin size={12} className={record.gpsZoneMismatch ? "text-amber-500" : "text-gray-400"} />
                            <span className={record.gpsZoneMismatch ? "text-amber-600 font-medium" : ""}>
                              {record.clockInLocation || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {record.faceVerified !== undefined ? (
                            <div>
                              <YesNoBadge value={record.faceVerified} falseLabel="Failed" />
                              {!record.faceVerified && record.faceFailReason && (
                                <p className="text-[11px] text-red-500 mt-1">
                                  {FACE_FAIL_REASONS[record.faceFailReason] || record.faceFailReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {record.equipmentPhotoUploaded !== undefined ? (
                            <div className="flex items-center gap-2">
                              <YesNoBadge value={record.equipmentPhotoUploaded} />
                              {record.equipmentPhotoUrl && (
                                <a
                                  href={record.equipmentPhotoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                  <Camera size={12} className="text-secondary" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-secondary">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <YesNoBadge value={!record.gpsZoneMismatch} falseLabel="Mismatch" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MONTHLY SUMMARY ── */}
      {tab === "monthly" && (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="month"
              value={date.slice(0, 7)}
              onChange={(e) => setDate(`${e.target.value}-01`)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3 sticky left-0 bg-white">Driver</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Days Present</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Days Absent</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Late Count</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Face Fails</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Zone Flags</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">
                        No monthly data available
                      </td>
                    </tr>
                  ) : (
                    monthlyList.map((row: any) => (
                      <tr key={row.driverId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm font-medium sticky left-0 bg-white">{row.driverName}</td>
                        <td className="px-5 py-3 text-sm text-green-600 font-medium">{row.present}</td>
                        <td className="px-5 py-3 text-sm text-red-500">{row.absent}</td>
                        <td className="px-5 py-3 text-sm text-orange-500">{row.late}</td>
                        <td className="px-5 py-3 text-sm text-red-400">{row.faceFailCount || 0}</td>
                        <td className="px-5 py-3">
                          {(row.zoneFlagCount || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600">
                              {row.zoneFlagCount}
                            </span>
                          ) : (
                            <span className="text-sm text-secondary">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary font-mono">{row.totalHours || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LEAVE REQUESTS ── */}
      {tab === "leaves" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Start</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">End</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-secondary">
                    No leave requests
                  </td>
                </tr>
              ) : (
                leaveList.map((leave: any) => (
                  <tr key={leave.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-sm font-medium">{leave.driver?.name}</td>
                    <td className="px-5 py-3 text-sm text-secondary">{leave.type}</td>
                    <td className="px-5 py-3 text-sm text-secondary">{new Date(leave.startDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-sm text-secondary">{new Date(leave.endDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                        "bg-yellow-100 text-yellow-700": leave.status === "PENDING",
                        "bg-green-100 text-green-700": leave.status === "APPROVED",
                        "bg-red-100 text-red-700": leave.status === "REJECTED",
                      })}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {leave.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                            Approve
                          </button>
                          <button className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || "Attendance Detail"}
        subtitle={`Talabat / ${date}`}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Status", selected.status],
                ["Clock In", selected.shift?.actualStart ? new Date(selected.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Clock Out", selected.shift?.actualEnd ? new Date(selected.shift.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Late (min)", selected.lateMinutes || "0"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">Verification Checks</h3>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert size={15} className="text-secondary" /> Face Verification
                </div>
                <div className="text-right">
                  <YesNoBadge value={selected.faceVerified} falseLabel="Failed" />
                  {!selected.faceVerified && selected.faceFailReason && (
                    <p className="text-[11px] text-red-500 mt-1">{FACE_FAIL_REASONS[selected.faceFailReason] || selected.faceFailReason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Camera size={15} className="text-secondary" /> Equipment Photo
                </div>
                <YesNoBadge value={selected.equipmentPhotoUploaded} />
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin size={15} className="text-secondary" /> GPS Zone Match
                </div>
                <div className="text-right">
                  <YesNoBadge value={!selected.gpsZoneMismatch} falseLabel="Mismatch" />
                  {selected.gpsZoneMismatch && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Logged from: {selected.clockInLocation || "Unknown"} — Assigned: {selected.assignedZone || "—"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {selected.equipmentPhotoUrl && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Equipment Photo</h3>
                <img
                  src={selected.equipmentPhotoUrl}
                  alt="Equipment check"
                  className="w-full rounded-xl object-cover max-h-48"
                />
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
