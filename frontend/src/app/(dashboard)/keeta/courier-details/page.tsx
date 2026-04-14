"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

type Slot = { start: string; end: string; label: string; status: string; onShiftMin: number };
type Row = {
  driverId: string; driverName: string; platformDriverId: string | null; vehicleType: string | null;
  date: string; onShift: boolean; validDay: boolean;
  courierAppOnlineTime: number; validOnlineTime: number; peakOnlineHours: number;
  acceptedTasks: number; tasksWithRestaurantArrivals: number; deliveredTasks: number;
  largeOrderTasksCompleted: number; cancelledTasks: number; slots: Slot[];
};

function SlotCell({ slot }: { slot: Slot }) {
  const base = "text-[11px] font-medium text-center py-2 px-1 rounded";
  if (slot.status === "ON_SHIFT") return <div className={cn(base, "bg-green-100 text-green-800")}>On Shift 3 hr</div>;
  if (slot.status === "PARTIAL") {
    const h = Math.floor(slot.onShiftMin / 60);
    const m = slot.onShiftMin % 60;
    return <div className={cn(base, "bg-amber-100 text-amber-800")}>{h}h {m}m</div>;
  }
  return <div className={cn(base, "bg-yellow-50 text-gray-400")}>No Shift</div>;
}

export default function CourierDetailsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [vehicleType, setVehicleType] = useState("");

  const qs = new URLSearchParams({ from, to, limit: "500" });
  if (vehicleType) qs.set("vehicleType", vehicleType);
  const { data, loading } = useApiGet<{ data: Row[]; pagination: any }>(`/api/keeta/courier-details?${qs}`);
  const rows = data?.data ?? [];

  const exportUrl = `/api/keeta/courier-details/export.xlsx?${new URLSearchParams({ from, to, ...(vehicleType ? { vehicleType } : {}) })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Courier Details</h1>
        <div className="ms-auto flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1" />
          <span className="text-xs text-secondary">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1" />
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1">
            <option value="">All vehicles</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="CAR">Car</option>
          </select>
          <a href={exportUrl} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            <Download size={12} /> Download
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {loading && <div className="p-6 text-center text-secondary text-sm">Loading…</div>}
        {!loading && rows.length === 0 && <div className="p-6 text-center text-secondary text-sm">No data for range.</div>}
        {!loading && rows.length > 0 && (
          <table className="min-w-max text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 text-xs text-secondary">
              <tr>
                <th className="sticky left-0 bg-gray-50 z-20 px-3 py-2 text-left whitespace-nowrap">Courier</th>
                <th className="sticky left-32 bg-gray-50 z-20 px-3 py-2 text-left whitespace-nowrap">Vehicle</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Online</th>
                <th className="px-3 py-2 text-right">Valid Online</th>
                <th className="px-3 py-2 text-right">Peak (h)</th>
                <th className="px-3 py-2 text-right">Accepted</th>
                <th className="px-3 py-2 text-right">R.Arr.</th>
                <th className="px-3 py-2 text-right">Delivered</th>
                <th className="px-3 py-2 text-right">Large</th>
                <th className="px-3 py-2 text-right">Cancelled</th>
                {rows[0].slots.map((s) => (
                  <th key={s.label} className="px-2 py-2 text-center whitespace-nowrap">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.driverId}-${r.date}`} className={i % 2 ? "bg-gray-50/50" : ""}>
                  <td className="sticky left-0 bg-inherit px-3 py-2 font-medium whitespace-nowrap">{r.driverName}</td>
                  <td className="sticky left-32 bg-inherit px-3 py-2 text-secondary whitespace-nowrap">{r.vehicleType}</td>
                  <td className="px-3 py-2 text-secondary">{r.date}</td>
                  <td className="px-3 py-2 text-right">{r.courierAppOnlineTime}m</td>
                  <td className="px-3 py-2 text-right">{r.validOnlineTime}m</td>
                  <td className="px-3 py-2 text-right">{r.peakOnlineHours}</td>
                  <td className="px-3 py-2 text-right">{r.acceptedTasks}</td>
                  <td className="px-3 py-2 text-right">{r.tasksWithRestaurantArrivals}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.deliveredTasks}</td>
                  <td className="px-3 py-2 text-right">{r.largeOrderTasksCompleted}</td>
                  <td className="px-3 py-2 text-right">{r.cancelledTasks}</td>
                  {r.slots.map((s) => (<td key={s.label} className="px-1 py-1 min-w-[90px]"><SlotCell slot={s} /></td>))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
