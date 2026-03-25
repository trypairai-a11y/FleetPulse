"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { cn } from "@/lib/cn";
import { CalendarCheck, Clock, UserX, FileText } from "lucide-react";

type Tab = "daily" | "monthly" | "leaves";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  LATE: "bg-orange-100 text-orange-700",
  ABSENT: "bg-red-100 text-red-700",
  EARLY_LEAVE: "bg-yellow-100 text-yellow-700",
  EXCUSED: "bg-gray-100 text-gray-600",
};

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [platform, setPlatform] = useState("");

  const { data: summary } = useApiGet<any>("/api/attendance/summary");
  const { data: records } = useApiGet<any>(
    `/api/attendance?dateFrom=${date}&dateTo=${date}&limit=100${platform ? `&platform=${platform}` : ""}`
  );
  const { data: leaves } = useApiGet<any>("/api/leave-requests?limit=50");

  const attendanceList = records?.data || [];
  const leaveList = leaves?.data || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-xl font-semibold">Attendance</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Present Today"
          value={`${summary?.present || 0} (${summary?.presentPercentage || 0}%)`}
          icon={CalendarCheck}
        />
        <StatCard title="Late Today" value={summary?.late || 0} icon={Clock} />
        <StatCard title="Absent Today" value={summary?.absent || 0} icon={UserX} highlight={(summary?.absent || 0) > 5} />
        <StatCard title="Pending Leaves" value={summary?.pendingLeaves || 0} icon={FileText} />
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
            {t === "leaves" ? "Leave Requests" : `${t} Log`}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Platforms</option>
              <option value="KEETA">Keeta</option>
              <option value="TALABAT">Talabat</option>
              <option value="DELIVEROO">Deliveroo</option>
              <option value="AMERICANA">Americana</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Platform</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Clock In</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Clock Out</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Late (min)</th>
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
                  attendanceList.map((record: any) => (
                    <tr key={record.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-25">
                      <td className="px-5 py-3 text-sm font-medium">{record.driver?.name}</td>
                      <td className="px-5 py-3">
                        <PlatformBadge platform={record.driver?.platform} />
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_COLORS[record.status])}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">
                        {record.shift?.actualStart
                          ? new Date(record.shift.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">
                        {record.shift?.actualEnd
                          ? new Date(record.shift.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">{record.lateMinutes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "monthly" && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-sm text-secondary">Monthly calendar heatmap — populated with data in Prompt 5</p>
        </div>
      )}

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
