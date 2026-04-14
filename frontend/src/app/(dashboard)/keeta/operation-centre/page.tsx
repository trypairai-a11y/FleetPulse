"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { MapPin, Package, Search, Users, Activity } from "lucide-react";

const OperationCentreMap = dynamic(() => import("@/components/keeta/OperationCentreMap"), { ssr: false });

export default function OperationCentrePage() {
  const router = useRouter();
  const params = useSearchParams();
  const modeParam = (params.get("mode") ?? "courier") as "courier" | "order";
  const [mode, setMode] = useState<"courier" | "order">(modeParam);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    window.history.replaceState({}, "", url.toString());
  }, [mode]);

  const { data: couriersData, refetch: refetchC } = useApiGet<{ couriers: any[] }>(
    mode === "courier" ? "/api/keeta/operation-centre/by-courier" : null,
  );
  const { data: ordersData, refetch: refetchO } = useApiGet<{ orders: any[] }>(
    mode === "order" ? "/api/keeta/operation-centre/by-order" : null,
  );

  useEffect(() => {
    const i = setInterval(() => { refetchC(); refetchO(); }, 5000);
    return () => clearInterval(i);
  }, [refetchC, refetchO]);

  const couriers = couriersData?.couriers ?? [];
  const orders = ordersData?.orders ?? [];

  const counts = useMemo(() => ({
    working: couriers.filter((c) => c.status === "working").length,
    idle: couriers.filter((c) => c.status === "idle").length,
    offline: couriers.filter((c) => c.status === "offline").length,
  }), [couriers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return couriers;
    return couriers.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.area ?? "").toLowerCase().includes(q) ||
      (c.vehicle ?? "").toLowerCase().includes(q),
    );
  }, [couriers, query]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => (o.id ?? "").toLowerCase().includes(q) || (o.status ?? "").toLowerCase().includes(q));
  }, [orders, query]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white shadow-sm" style={{ height: "calc(100vh - 120px)" }}>
      {/* Map layer */}
      <div className="absolute inset-0">
        <OperationCentreMap
          mode={mode}
          couriers={filtered}
          orders={filteredOrders}
          selectedId={selected}
          onSelect={(id) => setSelected(id)}
        />
      </div>

      {/* Top bar — glass */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex items-start gap-3 z-[1000]">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-white/85 backdrop-blur-md px-3 py-2 shadow-lg ring-1 ring-black/5">
          <Activity size={16} className="text-emerald-600" />
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Operation Centre</p>
            <p className="text-sm font-semibold">Live — Kuwait City</p>
          </div>
        </div>

        <div className="pointer-events-auto inline-flex rounded-full bg-white/85 backdrop-blur-md p-1 shadow-lg ring-1 ring-black/5">
          {(["courier", "order"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mode === m ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              {m === "courier" ? <Users size={12} /> : <Package size={12} />}
              By {m === "courier" ? "Courier" : "Order"}
            </button>
          ))}
        </div>

        <div className="ms-auto pointer-events-auto inline-flex items-center gap-3 rounded-full bg-white/85 backdrop-blur-md px-3 py-1.5 shadow-lg ring-1 ring-black/5 text-xs">
          <Dot color="#22c55e" />
          <span className="font-semibold tabular-nums">{counts.working}</span>
          <span className="text-gray-500">working</span>
          <span className="text-gray-300">·</span>
          <Dot color="#f59e0b" />
          <span className="font-semibold tabular-nums">{counts.idle}</span>
          <span className="text-gray-500">idle</span>
          <span className="text-gray-300">·</span>
          <Dot color="#64748b" />
          <span className="font-semibold tabular-nums">{counts.offline}</span>
          <span className="text-gray-500">offline</span>
        </div>
      </div>

      {/* Left rail — glass list */}
      <aside className="absolute top-20 left-4 bottom-4 w-[300px] rounded-2xl bg-white/90 backdrop-blur-md shadow-xl ring-1 ring-black/5 overflow-hidden flex flex-col z-[999]">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "courier" ? "Search couriers, areas…" : "Search orders…"}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mode === "courier" ? (
            <ul className="divide-y divide-gray-100">
              {filtered.map((c: any) => {
                const dotColor = c.status === "working" ? "#22c55e" : c.status === "idle" ? "#f59e0b" : "#64748b";
                const active = selected === c.id;
                return (
                  <li key={c.id}
                    onClick={() => setSelected(c.id)}
                    onDoubleClick={() => router.push(`/keeta/drivers/${c.id}`)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${active ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex w-2.5 h-2.5">
                        <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: dotColor }} />
                        <span className="absolute inset-0 rounded-full" style={{ background: dotColor }} />
                      </span>
                      <p className="text-sm font-medium truncate flex-1">{c.name}</p>
                    </div>
                    <p className={`mt-1 text-[11px] ms-4 truncate ${active ? "text-white/70" : "text-gray-500"}`}>
                      {c.vehicle ?? "—"} · {c.area ?? "—"}
                    </p>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-gray-400">No couriers match.</li>
              )}
            </ul>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredOrders.map((o: any) => (
                <li key={o.id} className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-gray-400" />
                    <p className="text-sm font-medium truncate flex-1">Order {o.id.slice(0, 10)}</p>
                  </div>
                  <p className="mt-1 text-[11px] ms-5 text-gray-500">{o.status}</p>
                </li>
              ))}
              {filteredOrders.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-gray-400">No active orders.</li>
              )}
            </ul>
          )}
        </div>
        <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
          <span>{mode === "courier" ? `${filtered.length} / ${couriers.length}` : `${filteredOrders.length} / ${orders.length}`}</span>
          <span className="inline-flex items-center gap-1">
            <span className="relative inline-flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              <span className="absolute inset-0 rounded-full bg-emerald-500" />
            </span>
            Live · 5s
          </span>
        </div>
      </aside>

      {/* Floating legend */}
      <div className="absolute bottom-4 right-20 rounded-2xl bg-white/90 backdrop-blur-md px-3 py-2 shadow-lg ring-1 ring-black/5 z-[999]">
        <div className="flex items-center gap-3 text-[11px]">
          <LegendDot color="#22c55e" label="Working" />
          <LegendDot color="#f59e0b" label="Idle" />
          <LegendDot color="#64748b" label="Offline" />
        </div>
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: color }} />
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-700">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
