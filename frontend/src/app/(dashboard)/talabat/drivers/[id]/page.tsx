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
          <h1 className="text-xl font-semibold">{driver.talabatDisplayName || driver.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-secondary font-mono">{driver.platformDriverId || "—"}</span>
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
      <div className="grid grid-cols-4 gap-4">
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
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Session Code</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Zone</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Planned</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Actual Hrs</th>
                  <th className="text-right text-xs font-medium text-secondary px-5 py-3">Deliveries</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Face</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
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
                  sessions.map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-secondary">
                        {s.plannedStart ? new Date(s.plannedStart).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                          {s.sessionCode || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">{s.zone || "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs text-secondary">
                        {s.plannedStart
                          ? new Date(s.plannedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                        {s.plannedEnd
                          ? `–${new Date(s.plannedEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-secondary">
                        {s.actualHours != null ? `${s.actualHours.toFixed(1)}h` : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-right font-mono font-medium">{s.deliveriesCount ?? "—"}</td>
                      <td className="px-5 py-3">
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
                          <span className="text-xs text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
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
      {tab === "orders" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Zone</th>
                  <th className="text-right text-xs font-medium text-secondary px-5 py-3">Deliveries</th>
                  <th className="text-right text-xs font-medium text-secondary px-5 py-3">Distance (km)</th>
                  <th className="text-right text-xs font-medium text-secondary px-5 py-3">Tips (KD)</th>
                  <th className="text-right text-xs font-medium text-secondary px-5 py-3">Cash (KD)</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Source</th>
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
                  orders.map((o: any) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-secondary">
                        {o.date ? new Date(o.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">{o.zone || "—"}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono font-medium">{o.deliveriesCount ?? "—"}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono text-secondary">{o.distanceKm?.toFixed(1) ?? "—"}</td>
                      <td className="px-5 py-3 text-sm text-right font-mono text-green-600">
                        {o.tipsKd != null ? o.tipsKd.toFixed(3) : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-right font-mono text-orange-600">
                        {o.cashCollectedKd != null ? o.cashCollectedKd.toFixed(3) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {o.fromScreenshot ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 text-violet-600">OCR</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500">Manual</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {tab === "compliance" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date / Time</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Severity</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
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
                  complianceEvents.map((evt: any) => (
                    <tr key={evt.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-secondary font-mono">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                        <br />
                        <span className="text-xs">
                          {evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-gray-100 text-gray-500": evt.severity === "LOW",
                          "bg-yellow-50 text-yellow-600": evt.severity === "MEDIUM",
                          "bg-orange-50 text-orange-600": evt.severity === "HIGH",
                          "bg-red-50 text-red-600": evt.severity === "CRITICAL",
                        })}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary max-w-xs truncate">{evt.description || "—"}</td>
                      <td className="px-5 py-3">
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
