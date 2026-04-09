"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Clock,
  CalendarCheck,
  UserX,
  FileText,
  AlertTriangle,
  Camera,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";

type AttendanceMode = "FREELANCE" | "CORE_FLEET";
type Tab = "daily" | "monthly" | "leaves";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  LATE: "bg-orange-100 text-orange-700",
  ABSENT: "bg-red-100 text-red-700",
  EARLY_LEAVE: "bg-yellow-100 text-yellow-700",
  EXCUSED: "bg-gray-100 text-gray-600",
};

function HoursBar({ hours, target = 12 }: { hours: number; target?: number }) {
  const pct = Math.min((hours / target) * 100, 100);
  const hit = hours >= target;
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", hit ? "bg-green-500" : "bg-amber-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium tabular-nums", hit ? "text-green-700" : "text-amber-600")}>
        {hours.toFixed(1)}h
      </span>
    </div>
  );
}

function FaceVerifCell({ status }: { status: "VERIFIED" | "FAILED" | "PENDING" | null }) {
  if (!status || status === "PENDING") {
    return <span className="text-xs text-secondary">-</span>;
  }
  if (status === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle2 size={12} /> Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
      <XCircle size={12} /> Failed
    </span>
  );
}

export default function DeliverooAttendancePage() {
  const [mode, setMode] = useState<AttendanceMode>("FREELANCE");
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: summary } = useApiGet<any>("/api/attendance/summary?platform=DELIVEROO");
  const { data: records } = useApiGet<any>(
    `/api/attendance?platform=DELIVEROO&operatingModel=${mode}&dateFrom=${date}&dateTo=${date}&limit=100`
  );
  const { data: leaves } = useApiGet<any>("/api/leave-requests?platform=DELIVEROO&limit=50");
  const { data: monthly } = useApiGet<any>(
    `/api/attendance/monthly?platform=DELIVEROO&operatingModel=${mode}`
  );

  const rawAttendance = records?.data || [];
  // Mock face verification + mismatch data for demo
  const attendanceList = rawAttendance.map((r: any, i: number) => ({
    ...r,
    faceVerifStatus: r.faceVerifStatus ?? (i % 7 === 0 ? "FAILED" : "VERIFIED"),
    faceMismatch: r.faceMismatch ?? (i % 7 === 0 || i % 13 === 0),
  }));
  const leaveList = leaves?.data || [];
  const monthlyList = monthly?.data || [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-teal-500" />
        <h1 className="text-xl font-semibold">Deliveroo - Attendance</h1>
        <span className="text-sm text-secondary">Al Hazm</span>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-secondary font-medium">Operating Model:</p>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["FREELANCE", "CORE_FLEET"] as AttendanceMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                mode === m ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
              )}
            >
              {m === "FREELANCE" ? "Freelance" : "Core Fleet"}
            </button>
          ))}
        </div>

        {mode === "FREELANCE" && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">
            <Clock size={12} />
            12h daily target - no fixed clock-in/out
          </span>
        )}
        {mode === "CORE_FLEET" && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
            <Camera size={12} />
            Selfie + GPS verified clock-in/out
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {mode === "FREELANCE" ? (
          <>
            <StatCard title="Online Today" value={summary?.present || 0} icon={CheckCircle2} />
            <StatCard
              title="Hit 12h Target"
              value={summary?.hitTarget || 0}
              icon={Clock}
            />
            <StatCard
              title="Below 12h"
              value={summary?.belowTarget || 0}
              icon={AlertTriangle}
              highlight={(summary?.belowTarget || 0) > 0}
            />
            <StatCard title="Pending Leaves" value={summary?.pendingLeaves || 0} icon={FileText} />
          </>
        ) : (
          <>
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
            <StatCard title="Pending Leaves" value={summary?.pendingLeaves || 0} icon={FileText} />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["daily", "monthly", "leaves"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              tab === t
                ? "bg-white text-foreground shadow-sm"
                : "text-secondary hover:text-foreground"
            )}
          >
            {t === "leaves" ? "Leave Requests" : `${t === "daily" ? "Daily" : "Monthly"} Log`}
          </button>
        ))}
      </div>

      {/* Daily Log */}
      {tab === "daily" && (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                  {mode === "FREELANCE" ? (
                    <>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Online Hours</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">vs 12h Target</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Flag</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Clock In</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Clock Out</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Late (min)</th>
                    </>
                  )}
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                    Face <span className="text-teal-500">(Darb)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-secondary">
                      No attendance records for this date
                    </td>
                  </tr>
                ) : (
                  attendanceList.map((record: any) => {
                    const hours = record.onlineHours || 0;
                    const belowTarget = mode === "FREELANCE" && hours < 12;
                    return (
                      <tr
                        key={record.id}
                        className={cn(
                          "border-b border-gray-50 last:border-0",
                          belowTarget && "bg-amber-50/40"
                        )}
                      >
                        <td className="px-5 py-3 text-sm font-medium">{record.driver?.name}</td>
                        {mode === "FREELANCE" ? (
                          <>
                            <td className="px-5 py-3 text-sm tabular-nums">{hours.toFixed(1)}h</td>
                            <td className="px-5 py-3">
                              <HoursBar hours={hours} />
                            </td>
                            <td className="px-5 py-3">
                              {belowTarget ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                  <AlertTriangle size={11} /> Below 12h
                                </span>
                              ) : (
                                <span className="text-xs text-green-600 font-medium">On target</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3">
                              <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_COLORS[record.status])}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm text-secondary">
                              {record.shift?.actualStart
                                ? new Date(record.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "-"}
                            </td>
                            <td className="px-5 py-3 text-sm text-secondary">
                              {record.shift?.actualEnd
                                ? new Date(record.shift.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "-"}
                            </td>
                            <td className="px-5 py-3 text-sm text-secondary">{record.lateMinutes || "-"}</td>
                          </>
                        )}
                        <td className="px-5 py-3">
                          <FaceVerifCell status={record.faceVerifStatus} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {tab === "monthly" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                  {mode === "FREELANCE" ? (
                    <>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Total Hours</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Days Below 12h</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Target Hit Rate</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Days Present</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Days Absent</th>
                      <th className="text-left text-xs font-medium text-secondary px-5 py-3">Avg Hours/Day</th>
                    </>
                  )}
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Face Verif Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-secondary">
                      No monthly data available
                    </td>
                  </tr>
                ) : (
                  monthlyList.map((row: any) => (
                    <tr key={row.driverId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm font-medium">{row.driverName}</td>
                      {mode === "FREELANCE" ? (
                        <>
                          <td className="px-5 py-3 text-sm tabular-nums">{row.totalHours?.toFixed(1)}h</td>
                          <td className="px-5 py-3 text-sm">
                            <span className={cn(row.daysBelowTarget > 0 ? "text-amber-600 font-medium" : "text-secondary")}>
                              {row.daysBelowTarget ?? "-"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            <HoursBar hours={row.targetHitRate || 0} target={100} />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3 text-sm">{row.daysPresent ?? "-"}</td>
                          <td className="px-5 py-3 text-sm text-red-500">{row.daysAbsent ?? "-"}</td>
                          <td className="px-5 py-3 text-sm tabular-nums">{row.avgHours?.toFixed(1)}h</td>
                        </>
                      )}
                      <td className="px-5 py-3 text-sm">
                        <span className="text-teal-600 font-medium">{row.faceVerifRate ?? "-"}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Requests */}
      {tab === "leaves" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Model</th>
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
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">
                    No leave requests
                  </td>
                </tr>
              ) : (
                leaveList.map((leave: any) => (
                  <tr key={leave.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-sm font-medium">{leave.driver?.name}</td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        leave.driver?.operatingModel === "FREELANCE"
                          ? "bg-green-50 text-green-700"
                          : "bg-blue-50 text-blue-700"
                      )}>
                        {leave.driver?.operatingModel === "FREELANCE" ? "Freelance" : "Core Fleet"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary">{leave.type}</td>
                    <td className="px-5 py-3 text-sm text-secondary">
                      {new Date(leave.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary">
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
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
    </div>
  );
}
