"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { ArrowLeft, Phone, Car, Bike, ShieldAlert } from "lucide-react";
import MonthlyOrdersGrid from "@/components/americana/MonthlyOrdersGrid";

type Tab = "profile" | "assets" | "orders";

export default function AmericanaDriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  const [tab, setTab] = useState<Tab>("profile");

  const { data: driver, loading } = useApiGet<any>(`/api/drivers/${driverId}`);
  const { data: grid } = useApiGet<any>(`/api/americana/drivers/${driverId}/monthly-grid`);
  const { data: attendance } = useApiGet<any>(`/api/americana/drivers/${driverId}/recent-attendance?days=14`);
  const { data: violations } = useApiGet<any>(`/api/americana/drivers/${driverId}/violations?status=OPEN`);

  if (loading || !driver) return <div className="text-sm text-secondary p-6">Loading…</div>;

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/americana/drivers")}
          className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Back to Americana drivers
        </button>
        {driver.performanceTier && (
          <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", {
            "bg-amber-50 text-amber-700": driver.performanceTier === "GOLD",
            "bg-gray-100 text-gray-700": driver.performanceTier === "SILVER",
            "bg-orange-50 text-orange-700": driver.performanceTier === "BRONZE",
          })}>
            Tier: {driver.performanceTier}
          </span>
        )}
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold">
          {(driver.name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{driver.name}</h1>
          <div className="text-xs text-secondary mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Phone size={12} /> {driver.phone || "—"}</span>
            <span className="inline-flex items-center gap-1">
              {driver.vehicleType === "MOTORCYCLE" ? <Bike size={12} /> : <Car size={12} />}
              {driver.vehicleType === "MOTORCYCLE" ? "Bike" : "Car"}
            </span>
            <span className="font-mono">Emp ID: {driver.platformDriverId || "—"}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["profile", "assets", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t === "orders" ? "Americana orders" : t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold">Personal</h3>
            {[
              ["Name", driver.name],
              ["Phone", driver.phone],
              ["Status", driver.status],
              ["Hire date", driver.hireDate ? new Date(driver.hireDate).toLocaleDateString() : "—"],
              ["Civil ID expiry", driver.civilIdExpiry ? new Date(driver.civilIdExpiry).toLocaleDateString() : "—"],
              ["Work permit expiry", driver.workPermitExpiry ? new Date(driver.workPermitExpiry).toLocaleDateString() : "—"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                <span className="text-secondary">{label}</span>
                <span className="font-medium">{val as string || "—"}</span>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold mb-3">Recent attendance (14 days)</h3>
              {attendance?.length ? (
                <div className="grid grid-cols-7 gap-1">
                  {attendance.slice(0, 14).map((a: any) => (
                    <div
                      key={a.id}
                      title={`${new Date(a.date).toLocaleDateString()} · ${a.status}`}
                      className={cn("aspect-square rounded text-[10px] flex items-center justify-center font-medium", {
                        "bg-green-100 text-green-700": a.status === "PRESENT",
                        "bg-amber-100 text-amber-700": a.status === "LATE",
                        "bg-red-100 text-red-700": a.status === "ABSENT",
                        "bg-gray-100 text-gray-500": !["PRESENT", "LATE", "ABSENT"].includes(a.status),
                      })}
                    >
                      {new Date(a.date).getDate()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary">No attendance in the last 14 days.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Open violations</h3>
                {violations?.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600">
                    <ShieldAlert size={12} /> {violations.length}
                  </span>
                )}
              </div>
              {violations?.length ? (
                <div className="space-y-2">
                  {violations.slice(0, 5).map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{v.violationType.replace(/_/g, " ").toLowerCase()}</p>
                        <p className="text-xs text-secondary">{new Date(v.violationTime).toLocaleString()}</p>
                      </div>
                      <a href={`/americana/violations?driverId=${driverId}`} className="text-xs text-blue-600 underline">
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary">No open Americana violations.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "assets" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="text-sm font-semibold mb-1">Assets</h3>
          <p className="text-xs text-secondary mb-3">Vehicle, SIM, uniform. Company-issued assets live here.</p>
          {driver.assignedVehicle ? (
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="font-medium">{driver.assignedVehicle.make} {driver.assignedVehicle.model}</p>
              <p className="text-xs text-secondary">Plate: {driver.assignedVehicle.plateNumber} · Color: {driver.assignedVehicle.color || "—"}</p>
            </div>
          ) : (
            <p className="text-sm text-secondary">No vehicle assigned.</p>
          )}
          <div className="text-sm text-secondary">SIM: {driver.device?.phoneNumber || "—"}</div>
        </div>
      )}

      {tab === "orders" && (
        <MonthlyOrdersGrid rows={grid ?? []} />
      )}
    </div>
  );
}
