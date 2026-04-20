"use client";
import { useApiQuery } from "@/hooks/useApi";
import { Phone, MessageSquare, UserCheck, Clock, CheckCircle2 } from "lucide-react";

type Row = {
  shiftId: string;
  driverId: string;
  name: string;
  phone: string;
  onlineNow: boolean;
  lateMinutes: number;
  status: "PRESENT" | "LATE" | "NO_SHOW";
};

type Zone = {
  name: string;
  expected: number;
  online: number;
  late: number;
  noShow: number;
  drivers: Row[];
};

type LivePayload = {
  window: { startAt: string; endAt: string; nowAt: string };
  lateThresholdMinutes: number;
  zones: Zone[];
};

const STATUS_STYLES: Record<Row["status"], string> = {
  PRESENT: "bg-green-50 text-green-700",
  LATE: "bg-yellow-50 text-yellow-700",
  NO_SHOW: "bg-red-50 text-red-700",
};

export default function TalabatOnShiftNow() {
  const { data } = useApiQuery<LivePayload>(
    ["talabat-attendance-live"],
    "/api/attendance/live?platform=TALABAT",
    { refetchInterval: 60_000 }
  );

  if (!data) return null;

  const totals = data.zones.reduce(
    (acc, z) => ({
      expected: acc.expected + z.expected,
      online: acc.online + z.online,
      late: acc.late + z.late,
      noShow: acc.noShow + z.noShow,
    }),
    { expected: 0, online: 0, late: 0, noShow: 0 }
  );

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">On shift now</h2>
          <p className="text-xs text-gray-500">
            Late threshold {data.lateThresholdMinutes} min · refreshes every 60 s
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <UserCheck size={12} /> Expected {totals.expected}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-700">
            <CheckCircle2 size={12} /> Online {totals.online}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
            <Clock size={12} /> Late {totals.late}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-red-700">
            No-show {totals.noShow}
          </span>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data.zones.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
            No active shifts right now.
          </div>
        )}
        {data.zones.map((z) => (
          <div
            key={z.name}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <span className="text-sm font-semibold">{z.name}</span>
              <span className="text-xs text-gray-500">
                {z.online}/{z.expected} online
              </span>
            </header>
            <ul className="divide-y divide-gray-100">
              {z.drivers.slice(0, 12).map((d) => (
                <li key={d.shiftId} className="px-4 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_STYLES[d.status]}`}
                    >
                      {d.status === "NO_SHOW" ? "No-show" : d.status.toLowerCase()}
                      {d.lateMinutes > 0 && ` · ${d.lateMinutes}m`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <a
                      href={`tel:${d.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                    >
                      <Phone size={10} /> Call
                    </a>
                    <a
                      href={`sms:${d.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
                    >
                      <MessageSquare size={10} /> SMS
                    </a>
                    {d.onlineNow && <span className="text-green-600">App online</span>}
                  </div>
                </li>
              ))}
              {z.drivers.length > 12 && (
                <li className="px-4 py-2 text-center text-xs text-gray-400">
                  +{z.drivers.length - 12} more
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
