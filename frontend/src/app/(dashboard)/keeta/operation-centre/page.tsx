"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";

const OperationCentreMap = dynamic(() => import("@/components/keeta/OperationCentreMap"), { ssr: false });

export default function OperationCentrePage() {
  const router = useRouter();
  const params = useSearchParams();
  const modeParam = (params.get("mode") ?? "courier") as "courier" | "order";
  const [mode, setMode] = useState<"courier" | "order">(modeParam);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Operation Centre</h1>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
          {(["courier", "order"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md capitalize ${mode === m ? "bg-gray-900 text-white" : "text-gray-600"}`}>
              By {m}
            </button>
          ))}
        </div>
        <div className="ms-auto text-xs text-secondary">
          {mode === "courier" ? `${couriers.length} couriers online` : `${orders.length} active orders`}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <aside className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-sm p-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {mode === "courier" ? (
            <ul className="divide-y divide-gray-100">
              {couriers.map((c: any) => (
                <li key={c.id} className="py-2 cursor-pointer hover:bg-gray-50 rounded px-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.status === "working" ? "bg-green-500" : c.status === "idle" ? "bg-amber-500" : "bg-gray-400"}`} />
                    <p className="text-sm font-medium truncate">{c.name}</p>
                  </div>
                  <p className="text-xs text-secondary">{c.vehicle} · {c.area ?? "—"}</p>
                </li>
              ))}
              {couriers.length === 0 && <li className="text-xs text-secondary py-4">No couriers online</li>}
            </ul>
          ) : (
            <ul className="divide-y divide-gray-100">
              {orders.map((o: any) => (
                <li key={o.id} className="py-2 px-2">
                  <p className="text-sm font-medium truncate">Order {o.id}</p>
                  <p className="text-xs text-secondary">{o.status}</p>
                </li>
              ))}
              {orders.length === 0 && <li className="text-xs text-secondary py-4">No active orders</li>}
            </ul>
          )}
        </aside>
        <div className="col-span-12 lg:col-span-9 bg-white rounded-2xl shadow-sm p-2">
          <OperationCentreMap mode={mode} couriers={couriers} orders={orders} onSelect={(id) => router.push(`/keeta/drivers/${id}`)} />
        </div>
      </div>
    </div>
  );
}
