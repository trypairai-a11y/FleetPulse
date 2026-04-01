"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  ArrowLeft, CalendarClock, Package, Banknote, ShieldAlert,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";

type Tab = "sessions" | "orders" | "compliance" | "documents";

const DOC_STATUS_COLORS: Record<string, string> = {
  VALID: "bg-green-50 text-green-600",
  EXPIRING: "bg-yellow-50 text-yellow-600",
  EXPIRED: "bg-red-50 text-red-600",
  MISSING: "bg-gray-100 text-gray-500",
};

export default function TalabatDriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  const [tab, setTab] = useState<Tab>("sessions");

  const { data: driver } = useApiGet<any>(`/api/drivers/${driverId}`);

  const { data: sessionsData } = useApiGet<any>(
    tab === "sessions" ? `/api/talabat/sessions?driverId=${driverId}&limit=20` : null
  );
  const sessions = sessionsData?.data || [];

  const { data: ordersData } = useApiGet<any>(
    tab === "orders" ? `/api/orders?platform=TALABAT&driverId=${driverId}&limit=20` : null
  );
  const orders = ordersData?.data || [];

  const { data: complianceData } = useApiGet<any>(
    tab === "compliance" ? `/api/talabat/compliance?driverId=${driverId}&limit=20` : null
  );
  const complianceEvents = complianceData?.data || [];

  const { data: driverSummary } = useApiGet<any>(`/api/drivers/${driverId}/summary`);

  if (!driver) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <div>
          <h1 className="text-xl font-semibold">{(driver.talabatDisplayName || driver.name || "").replace(/\s+\d+[A-Z]?\s*[–—-]\s*\w+$/i, "").trim()}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {driver.platformDriverId && (
              <span className="text-xs font-mono text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">ID: {driver.platformDriverId}</span>
            )}
            <span className="text-sm text-secondary font-mono">{driver.utr || "—"}</span>
            {driver.vehicleType && (
              <span className="text-xs text-secondary">{driver.vehicleType.replace(/_/g, " ").toLowerCase()}</span>
            )}
            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
              "bg-green-50 text-green-600": driver.status === "ACTIVE",
              "bg-gray-100 text-gray-500": driver.status === "INACTIVE",
              "bg-red-50 text-red-600": driver.status === "SUSPENDED" || driver.status === "TERMINATED",
            })}>
              {driver.status}
            </span>
            {driver.zone && (
              <span className="text-xs text-secondary">Zone: {driver.zone}</span>
            )}
            {driver.batchNumber && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                {driver.batchNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Sessions This Month"
          value={driverSummary?.sessionsThisMonth || 0}
          icon={CalendarClock}
        />
        <StatCard
          title="Avg Deliveries/Day"
          value={driverSummary?.avgDeliveriesPerDay != null ? driverSummary.avgDeliveriesPerDay.toFixed(1) : "0"}
          icon={Package}
        />
        <StatCard
          title="Pending Dues"
          value={driverSummary?.pendingDuesKd != null ? `${driverSummary.pendingDuesKd.toFixed(3)} KD` : "0.000 KD"}
          icon={Banknote}
          highlight={(driverSummary?.pendingDuesKd || 0) > 0}
        />
        <StatCard
          title="Compliance Events"
          value={driverSummary?.complianceEvents || 0}
          icon={ShieldAlert}
          highlight={(driverSummary?.complianceEvents || 0) > 0}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["sessions", "orders", "compliance", "documents"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Session Code</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Zone</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Planned</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Actual</th>
                  <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Deliveries</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Face</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  sessions.map((s: any, i: number) => (
                    <tr key={s.id} className={cn(
                      "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                      i % 2 === 1 && "bg-gray-50/30"
                    )}>
                      <td className="px-5 py-2.5 text-sm font-medium">
                        {s.plannedStart ? new Date(s.plannedStart).toLocaleDateString([], { month: "short", day: "numeric" }) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        {s.sessionCode ? (
                          <span className="font-mono text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                            {s.sessionCode}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-secondary">{s.zone || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-secondary">
                        {s.plannedStart
                          ? new Date(s.plannedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                        {s.plannedEnd
                          ? `–${new Date(s.plannedEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </td>
                      <td className="px-5 py-2.5 text-sm font-mono">
                        {s.actualHours != null ? (
                          <span className="font-medium">{Number(s.actualHours).toFixed(1)}<span className="text-secondary text-xs">h</span></span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-right font-mono font-medium">
                        {s.deliveriesCount != null ? s.deliveriesCount : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        {s.faceVerified !== undefined ? (
                          s.faceVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
                              <CheckCircle2 size={11} /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
                              <XCircle size={11} /> Fail
                            </span>
                          )
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-green-50 text-green-600": s.status === "COMPLETED",
                          "bg-blue-50 text-blue-600": s.status === "IN_PROGRESS",
                          "bg-red-50 text-red-600": s.status === "MISSED",
                          "bg-gray-100 text-gray-500": s.status === "CANCELLED",
                        })}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (() => {
        const hasZone = orders.some((o: any) => o.zone);
        const hasDeliveries = orders.some((o: any) => o.deliveriesCount != null);
        const hasTips = orders.some((o: any) => o.tipsKd != null);
        const hasCash = orders.some((o: any) => o.cashCollectedKd != null);
        const totalDistance = orders.reduce((sum: number, o: any) => sum + (o.distanceKm != null ? Number(o.distanceKm) : 0), 0);
        const totalTips = orders.reduce((sum: number, o: any) => sum + (o.tipsKd != null ? Number(o.tipsKd) : 0), 0);
        const totalCash = orders.reduce((sum: number, o: any) => sum + (o.cashCollectedKd != null ? Number(o.cashCollectedKd) : 0), 0);
        const totalDeliveries = orders.reduce((sum: number, o: any) => sum + (o.deliveriesCount ?? 0), 0);

        return (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date</th>
                    {hasZone && <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Zone</th>}
                    {hasDeliveries && <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Deliveries</th>}
                    <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Distance</th>
                    {hasTips && <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Tips</th>}
                    {hasCash && <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Cash</th>}
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    <>
                      {orders.map((o: any, i: number) => (
                        <tr key={o.id} className={cn(
                          "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                          i % 2 === 1 && "bg-gray-50/30"
                        )}>
                          <td className="px-5 py-2.5 text-sm font-medium">
                            {o.date ? new Date(o.date).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                          </td>
                          {hasZone && <td className="px-5 py-2.5 text-sm text-secondary">{o.zone || "—"}</td>}
                          {hasDeliveries && (
                            <td className="px-5 py-2.5 text-sm text-right font-mono font-medium">{o.deliveriesCount ?? "—"}</td>
                          )}
                          <td className="px-5 py-2.5 text-sm text-right font-mono">
                            {o.distanceKm != null ? (
                              <span className="font-medium">{Number(o.distanceKm).toFixed(1)} <span className="text-secondary text-xs">km</span></span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          {hasTips && (
                            <td className="px-5 py-2.5 text-sm text-right font-mono">
                              {o.tipsKd != null ? (
                                <span className="text-green-600 font-medium">{Number(o.tipsKd).toFixed(3)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          )}
                          {hasCash && (
                            <td className="px-5 py-2.5 text-sm text-right font-mono">
                              {o.cashCollectedKd != null ? (
                                <span className="text-orange-600 font-medium">{Number(o.cashCollectedKd).toFixed(3)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-5 py-2.5">
                            {o.fromScreenshot ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 text-violet-600">OCR</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500">Manual</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-5 py-2.5 text-xs font-semibold text-secondary uppercase">
                          Total ({orders.length} days)
                        </td>
                        {hasZone && <td />}
                        {hasDeliveries && (
                          <td className="px-5 py-2.5 text-sm text-right font-mono font-bold">{totalDeliveries}</td>
                        )}
                        <td className="px-5 py-2.5 text-sm text-right font-mono font-bold">
                          {totalDistance.toFixed(1)} <span className="text-secondary text-xs font-normal">km</span>
                        </td>
                        {hasTips && (
                          <td className="px-5 py-2.5 text-sm text-right font-mono font-bold text-green-600">
                            {totalTips.toFixed(3)}
                          </td>
                        )}
                        {hasCash && (
                          <td className="px-5 py-2.5 text-sm text-right font-mono font-bold text-orange-600">
                            {totalCash.toFixed(3)}
                          </td>
                        )}
                        <td />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Compliance Tab */}
      {tab === "compliance" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date / Time</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Severity</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {complianceEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-secondary">
                      No compliance events
                    </td>
                  </tr>
                ) : (
                  complianceEvents.map((evt: any, i: number) => (
                    <tr key={evt.id} className={cn(
                      "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                      i % 2 === 1 && "bg-gray-50/30"
                    )}>
                      <td className="px-5 py-2.5 text-sm font-mono">
                        <span className="font-medium">
                          {evt.createdAt ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                        </span>
                        {evt.createdAt && (
                          <span className="text-xs text-secondary ml-1.5">
                            {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-red-50 text-red-600": evt.type === "SELFIE_FAILURE",
                          "bg-amber-50 text-amber-600": evt.type === "GPS_VIOLATION",
                          "bg-blue-50 text-blue-600": evt.type === "EQUIPMENT",
                          "bg-purple-50 text-purple-600": evt.type === "SHIFT_BOOKING",
                          "bg-gray-100 text-gray-500": !["SELFIE_FAILURE", "GPS_VIOLATION", "EQUIPMENT", "SHIFT_BOOKING"].includes(evt.type),
                        })}>
                          {(evt.type || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-gray-100 text-gray-500": evt.severity === "LOW",
                          "bg-yellow-50 text-yellow-600": evt.severity === "MEDIUM",
                          "bg-orange-50 text-orange-600": evt.severity === "HIGH",
                          "bg-red-50 text-red-600": evt.severity === "CRITICAL",
                        })}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-sm text-secondary max-w-xs truncate">{evt.description || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-green-50 text-green-600": evt.status === "RESOLVED",
                          "bg-red-50 text-red-600": evt.status === "OPEN",
                        })}>
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Talabat Documents</h3>
          <div className="space-y-2">
            {[
              { label: "Health Certificate", key: "healthCertExpiry", status: driver.healthCertStatus },
              { label: "Work Permit", key: "workPermitExpiry", status: driver.workPermitStatus },
              { label: "Food Handling Certificate", key: "foodHandlingCertExpiry", status: driver.foodHandlingCertStatus },
              { label: "Vehicle Registration", key: "vehicleRegExpiry", status: driver.vehicleRegStatus },
              { label: "Vehicle Insurance", key: "vehicleInsuranceExpiry", status: driver.vehicleInsuranceStatus },
              { label: "Driving License", key: "drivingLicenseExpiry", status: driver.drivingLicenseStatus },
            ].map(({ label, key, status }) => (
              <div key={key} className="flex items-center justify-between py-2.5 px-4 bg-white rounded-2xl shadow-sm">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  {driver[key] && (
                    <p className="text-xs text-secondary mt-0.5">
                      Expires {new Date(driver[key]).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", DOC_STATUS_COLORS[status || "MISSING"])}>
                  {status || "MISSING"}
                </span>
              </div>
            ))}
          </div>

          {/* Vehicle Info */}
          {driver.vehicle && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Vehicle Info</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Plate", driver.vehicle.plateNumber],
                  ["Make/Model", `${driver.vehicle.make || ""} ${driver.vehicle.model || ""}`],
                  ["Color", driver.vehicle.color],
                  ["Year", driver.vehicle.year],
                ].map(([label, val]) => (
                  <div key={label} className="bg-white rounded-2xl shadow-sm p-4">
                    <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                    <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
