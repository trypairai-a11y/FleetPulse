"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight } from "lucide-react";

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

const ATTENTION_KINDS: Array<{ key: string; match: (id: string) => boolean; label: string }> = [
  { key: "absent", match: (id) => id.startsWith("absent-"), label: "Absent" },
  { key: "late", match: (id) => id.startsWith("late-"), label: "Late" },
  { key: "gps", match: (id) => id.startsWith("gps-"), label: "GPS stale" },
  { key: "rejections", match: (id) => id.startsWith("rejections-"), label: "Order activity" },
  { key: "other", match: () => true, label: "Other" },
];

function categorize(item: AttentionItem) {
  return ATTENTION_KINDS.find((k) => k.match(item.id))!;
}

function Dod({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs text-gray-400">—</span>;
  if (pct === 0) return <span className="text-xs text-gray-500">0%</span>;
  const Icon = pct > 0 ? ArrowUpRight : ArrowDownRight;
  const color = pct > 0 ? "text-emerald-600" : "text-rose-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}>
      <Icon size={12} strokeWidth={2.5} />
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
  const [expandedKind, setExpandedKind] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, AttentionItem[]>();
    for (const item of data?.attention ?? []) {
      const kind = categorize(item);
      if (!map.has(kind.key)) map.set(kind.key, []);
      map.get(kind.key)!.push(item);
    }
    return ATTENTION_KINDS
      .map((k) => ({ kind: k, items: map.get(k.key) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [data?.attention]);

  const zones = data?.zones ?? [];
  const totalAttention = (data?.attention ?? []).length;

  const kpis = [
    {
      label: "Orders today",
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
      label: "UTR (orders/hr)",
      today: data?.kpis.today.utr ?? null,
      dod: data?.kpis.dodPct.utr ?? null,
      fmt: (v: number | null) => (v == null ? "—" : v.toFixed(2)),
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
        {kpis.map((k) => (
          <div key={k.label} className="px-5 py-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-500">{k.label}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-gray-900 tabular-nums">{k.fmt(k.today as number | null)}</span>
              <Dod pct={k.dod} />
            </div>
          </div>
        ))}
      </div>

      {/* Zones + Attention, side by side on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Zones */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white lg:col-span-3">
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-[13px] font-medium text-gray-900">Live ops · by zone</h2>
            <span className="text-xs text-gray-500">Refreshes every 60s</span>
          </header>
          {zones.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No zones have scheduled drivers right now.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Zone</th>
                  <th className="px-3 py-2 text-right font-medium">Sched</th>
                  <th className="px-3 py-2 text-right font-medium">Online</th>
                  <th className="px-3 py-2 text-right font-medium">Late</th>
                  <th className="px-3 py-2 text-right font-medium">No-show</th>
                  <th className="px-3 py-2 text-right font-medium">GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zones.map((z) => (
                  <tr
                    key={z.name}
                    onClick={() => router.push(`/talabat/drivers?zone=${encodeURIComponent(z.name)}`)}
                    className="cursor-pointer text-sm hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 font-medium text-gray-900">{z.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{z.scheduled}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{z.online}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${z.late > 0 ? "text-orange-600" : "text-gray-300"}`}>{z.late}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${z.noShow > 0 ? "text-rose-600" : "text-gray-300"}`}>{z.noShow}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${z.gpsStale > 0 ? "text-rose-600" : "text-gray-300"}`}>{z.gpsStale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Attention */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white lg:col-span-2">
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-[13px] font-medium text-gray-900">Attention</h2>
            <span className="text-xs text-gray-500">{totalAttention}</span>
          </header>
          {grouped.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">Nothing requires attention.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {grouped.map(({ kind, items }) => {
                const isOpen = expandedKind === kind.key;
                return (
                  <li key={kind.key}>
                    <button
                      onClick={() => setExpandedKind(isOpen ? null : kind.key)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-sm text-gray-900">{kind.label}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{items.length}</span>
                      </span>
                      {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-gray-100 bg-gray-50/50 px-4 pb-1">
                        {items.slice(0, 12).map((item) => {
                          const primaryAction = () => {
                            if (item.action.type === "CALL" && item.action.payload?.phone) {
                              window.location.href = `tel:${item.action.payload.phone}`;
                            } else if (item.action.payload?.driverId) {
                              router.push(`/drivers/${item.action.payload.driverId}?from=talabat`);
                            }
                          };
                          return (
                            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                              <span className="truncate text-gray-700">{item.title}</span>
                              <button onClick={primaryAction} className="shrink-0 text-xs font-medium text-blue-600 hover:underline">
                                {item.action.type === "CALL" ? "Call" : "Open"}
                              </button>
                            </li>
                          );
                        })}
                        {items.length > 12 && (
                          <li className="py-2 text-xs text-gray-500">+{items.length - 12} more</li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
