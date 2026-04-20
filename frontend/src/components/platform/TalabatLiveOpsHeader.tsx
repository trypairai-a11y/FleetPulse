"use client";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Phone,
  UserX,
  Clock,
  MapPinOff,
  AlertTriangle,
} from "lucide-react";

type Zone = {
  name: string;
  scheduled: number;
  online: number;
  late: number;
  noShow: number;
  gpsStale: number;
};

type AttentionItem = {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  action: { type: string; payload: any };
};

type LivePayload = {
  window: { start: string; end: string };
  zones: Zone[];
  attention: AttentionItem[];
  kpis: {
    today: { ordersCompleted: number; onTimeRate: number | null; utr: number | null };
    yesterday: { ordersCompleted: number; onTimeRate: number | null; utr: number | null };
    dodPct: { ordersCompleted: number | null; onTimeRate: number | null; utr: number | null };
  };
};

const SEVERITY_STYLES: Record<AttentionItem["severity"], string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
  LOW: "bg-gray-50 text-gray-700 border-gray-200",
};

function Dod({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs text-gray-400">—</span>;
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  const color = pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : "text-gray-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}>
      <Icon size={12} />
      {Math.abs(pct)}%
    </span>
  );
}

export default function TalabatLiveOpsHeader() {
  const router = useRouter();
  const { data } = useApiQuery<LivePayload>(
    ["talabat-live"],
    "/api/platform-overview/talabat/live",
    { refetchInterval: 60_000 }
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Live Ops zone strip */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Live Ops · by zone</h2>
          <span className="text-xs text-gray-500">Refreshes every 60s</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {(data?.zones ?? []).length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
              No zones have scheduled drivers right now.
            </div>
          )}
          {(data?.zones ?? []).map((z) => (
            <button
              key={z.name}
              onClick={() =>
                router.push(`/talabat/drivers?zone=${encodeURIComponent(z.name)}`)
              }
              className="rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-300 hover:shadow-sm"
            >
              <div className="mb-1 text-xs font-semibold text-gray-800">{z.name}</div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span className="text-gray-500">Scheduled</span>
                <span className="text-right font-medium">{z.scheduled}</span>
                <span className="text-gray-500">Online</span>
                <span className="text-right font-medium text-green-600">{z.online}</span>
                <span className="text-gray-500">Late</span>
                <span className="text-right font-medium text-orange-600">{z.late}</span>
                <span className="text-gray-500">No-show</span>
                <span className="text-right font-medium text-red-600">{z.noShow}</span>
                <span className="text-gray-500">GPS stale</span>
                <span className="text-right font-medium text-rose-600">{z.gpsStale}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Attention list */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Attention</h2>
          <span className="text-xs text-gray-500">
            {(data?.attention ?? []).length} item(s)
          </span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white">
          {(data?.attention ?? []).length === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">
              Nothing requires attention. Quiet moment.
            </div>
          )}
          <ul className="divide-y divide-gray-100">
            {(data?.attention ?? []).slice(0, 10).map((item) => {
              const Icon =
                item.action.type === "CALL"
                  ? Phone
                  : item.action.type === "OPEN_DRIVER"
                    ? UserX
                    : item.action.type === "OPEN_ORDER"
                      ? Clock
                      : AlertTriangle;
              const primaryAction = () => {
                if (item.action.type === "CALL" && item.action.payload?.phone) {
                  window.location.href = `tel:${item.action.payload.phone}`;
                } else if (item.action.payload?.driverId) {
                  router.push(`/talabat/drivers/${item.action.payload.driverId}`);
                }
              };
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${SEVERITY_STYLES[item.severity]}`}
                    >
                      <Icon size={12} />
                    </span>
                    <span className="text-sm text-gray-800">{item.title}</span>
                  </div>
                  <button
                    onClick={primaryAction}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    {item.action.type === "CALL"
                      ? "Call"
                      : item.action.type === "OPEN_DRIVER"
                        ? "Open driver"
                        : "Open"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Daily KPI strip */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Today vs. yesterday</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              label: "Orders completed",
              today: data?.kpis.today.ordersCompleted ?? 0,
              dod: data?.kpis.dodPct.ordersCompleted ?? null,
              fmt: (v: number | null) => (v == null ? "—" : String(v)),
            },
            {
              label: "On-time rate",
              today: data?.kpis.today.onTimeRate ?? null,
              dod: data?.kpis.dodPct.onTimeRate ?? null,
              fmt: (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`),
            },
            {
              label: "UTR (orders/hour)",
              today: data?.kpis.today.utr ?? null,
              dod: data?.kpis.dodPct.utr ?? null,
              fmt: (v: number | null) => (v == null ? "—" : v.toFixed(2)),
            },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">{k.label}</div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-semibold">{k.fmt(k.today as number | null)}</span>
                <Dod pct={k.dod} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
