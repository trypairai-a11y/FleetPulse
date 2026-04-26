"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

type Rollup = {
  date: string;
  threshold: number;
  perBranch: { branchId: string; branchName: string; totalRegistered: number; scheduled: number; notOnShift: number; scheduledGte10h: number }[];
  underShift: { driverId: string; name: string; branch: string; hours: number }[];
};

export default function ShiftMonitorPage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [open, setOpen] = useState(true);
  const { data, loading } = useApiGet<Rollup>(`/api/keeta/shift-monitor/rollup?date=${date}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Shift Live Monitor</h1>
        <div className="ms-auto flex items-center gap-2 text-sm">
          <label className="text-secondary text-xs">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm" />
          {data && (
            <span className="text-xs text-secondary">Threshold: {data.threshold} h</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-right">Total Registered</th>
              <th className="px-4 py-3 text-right">Scheduled</th>
              <th className="px-4 py-3 text-right">Not on Shift</th>
              <th className="px-4 py-3 text-right">Scheduled ≥ {data?.threshold ?? 10} h</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-6 text-center text-secondary">Loading…</td></tr>}
            {data?.perBranch.map((b) => (
              <tr key={b.branchId} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{b.branchName}</td>
                <td className="px-4 py-2 text-right">{b.totalRegistered}</td>
                <td className="px-4 py-2 text-right">{b.scheduled}</td>
                <td className="px-4 py-2 text-right text-red-600">{b.notOnShift}</td>
                <td className="px-4 py-2 text-right text-green-700">{b.scheduledGte10h}</td>
              </tr>
            ))}
            {data?.perBranch.length === 0 && !loading && (
              <tr><td colSpan={5} className="p-6 text-center text-secondary">No shifts scheduled for this date.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.underShift.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm">
          <button onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left border-b border-gray-100">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <AlertCircle size={14} className="text-amber-500" />
            <span className="text-sm font-semibold">
              Couriers with scheduled shifts &lt; {data.threshold} h
            </span>
            <span className="ms-auto text-xs text-secondary">{data.underShift.length} couriers</span>
          </button>
          {open && (
            <ul className="divide-y divide-gray-100">
              {data.underShift.map((d) => (
                <li key={d.driverId} className="px-4 py-2 flex items-center">
                  <a href={`/keeta/drivers/${d.driverId}`} className="text-sm font-medium hover:underline">{d.name}</a>
                  <span className="ms-3 text-xs text-secondary">{d.branch}</span>
                  <span className="ms-auto text-sm font-mono">{d.hours.toFixed(1)} h</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
