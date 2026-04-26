"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { Package, Search, Users, Activity, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function OperationCentrePage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const modeParam = (params.get("mode") ?? "courier") as "courier" | "order";
  const [mode, setMode] = useState<"courier" | "order">(modeParam);
  const [query, setQuery] = useState("");

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
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5">
          <Activity size={16} className="text-emerald-600" />
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t("keetaPage.operationCentre")}</p>
            <p className="text-sm font-semibold">{t("keetaPage.liveKuwaitCity")}</p>
          </div>
        </div>

        <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
          {(["courier", "order"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mode === m ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              {m === "courier" ? <Users size={12} /> : <Package size={12} />}
              {m === "courier" ? t("keetaPage.byCourier") : t("keetaPage.byOrder")}
            </button>
          ))}
        </div>

        <div className="ms-auto inline-flex items-center gap-3 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-black/5 text-xs">
          <Dot color="#22c55e" />
          <span className="font-semibold tabular-nums">{counts.working}</span>
          <span className="text-gray-500">{t("keetaPage.workingLabel")}</span>
          <span className="text-gray-300">·</span>
          <Dot color="#f59e0b" />
          <span className="font-semibold tabular-nums">{counts.idle}</span>
          <span className="text-gray-500">{t("keetaPage.idleLabel")}</span>
          <span className="text-gray-300">·</span>
          <Dot color="#64748b" />
          <span className="font-semibold tabular-nums">{counts.offline}</span>
          <span className="text-gray-500">{t("keetaPage.offlineLabel")}</span>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          dir="auto"
          placeholder={mode === "courier" ? t("keetaPage.searchCouriersPh") : t("keetaPage.searchOrdersPh")}
          className="w-full ps-9 pe-3 py-2 text-sm rounded-lg bg-white border border-gray-200 focus:border-gray-300 focus:outline-none shadow-sm"
        />
      </div>

      {mode === "courier" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c: any) => {
            const dotColor = c.status === "working" ? "#22c55e" : c.status === "idle" ? "#f59e0b" : "#64748b";
            return (
              <button key={c.id}
                onClick={() => router.push(`/keeta/drivers/${c.id}`)}
                className="text-left rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 hover:shadow-md hover:ring-blue-200 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative inline-flex w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: dotColor }} />
                    <span className="absolute inset-0 rounded-full" style={{ background: dotColor }} />
                  </span>
                  <p className="text-sm font-semibold truncate flex-1">{c.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500">
                  <span>Vehicle</span>
                  <span className="text-right text-gray-800">{c.vehicle ?? "—"}</span>
                  <span>Area</span>
                  <span className="text-right text-gray-800">{c.area ?? "—"}</span>
                  <span>Online</span>
                  <span className="text-right text-gray-800">{c.onlineMinutes ? `${Math.floor(c.onlineMinutes/60)}h ${c.onlineMinutes%60}m` : "—"}</span>
                  <span>Completed</span>
                  <span className="text-right text-emerald-600 font-semibold">{c.completedOrders ?? 0}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl bg-white p-10 text-center text-sm text-gray-400 ring-1 ring-black/5">
              {t("keetaPage.noCouriersMatch")}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 divide-y divide-gray-100">
          {filteredOrders.map((o: any) => (
            <div key={o.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
              <MapPin size={14} className="text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Order {String(o.id).slice(0, 12)}</p>
                <p className="text-[11px] text-gray-500">{o.status}</p>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-400">{t("keetaPage.noActiveOrders")}</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>{mode === "courier" ? `${filtered.length} / ${couriers.length}` : `${filteredOrders.length} / ${orders.length}`}</span>
        <span className="inline-flex items-center gap-1">
          <span className="relative inline-flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            <span className="absolute inset-0 rounded-full bg-emerald-500" />
          </span>
          {t("keetaPage.liveSec")}
        </span>
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
