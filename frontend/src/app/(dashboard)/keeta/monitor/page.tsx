"use client";
import { useState, useCallback } from "react";
import { useApiGet } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import InsightBanner from "@/components/shared/InsightBanner";
import IdleDriverRecommendation from "@/components/shared/IdleDriverRecommendation";
import { cn } from "@/lib/cn";
import { StatCardSkeleton, TableSkeleton } from "@/components/shared/Skeleton";
import {
  Activity, Users, Wifi, WifiOff, MapPin, Phone, Clock,
  Package, AlertTriangle, Radio, ChevronRight, Truck, Bike,
  RefreshCw,
} from "lucide-react";

/* ─── Types ─── */
interface Courier {
  id: string;
  name: string;
  phone: string;
  platformDriverId: string | null;
  vehicleType: string;
  zone: string | null;
  status: "working" | "idle" | "offline";
  isOnline: boolean;
  onlineMinutes: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  lastGps: { lat: number | null; lng: number | null; at: string | null } | null;
  batteryLevel: number | null;
  flightMode: boolean;
  shifts: any[];
}

interface AlertBucket {
  count: number;
  drivers: any[];
}

type ViewTab = "courier" | "order";

const STATUS_COLORS: Record<string, string> = {
  working: "bg-green-100 text-green-700",
  idle: "bg-amber-100 text-amber-700",
  offline: "bg-gray-100 text-gray-500",
};

export default function KeetaMonitorPage() {
  const [tab, setTab] = useState<ViewTab>("courier");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Courier | null>(null);
  const [detailTab, setDetailTab] = useState<"current" | "completed" | "shift">("current");

  // Build query params
  const courierParams = new URLSearchParams();
  if (filters.search) courierParams.set("search", filters.search);
  if (filters.zone) courierParams.set("zone", filters.zone);
  if (filters.status) courierParams.set("status", filters.status);

  const { data: monitorData, refetch: refetchCouriers, loading: couriersLoading } = useApiGet<any>(
    `/api/keeta/monitor/couriers?${courierParams}`
  );
  const { data: alertsData, refetch: refetchAlerts } = useApiGet<any>(
    "/api/keeta/monitor/alerts"
  );

  const couriers: Courier[] = monitorData?.couriers || [];
  const summary = monitorData?.summary || { total: 0, working: 0, idle: 0, offline: 0 };
  const alerts = alertsData || {
    scheduledNotOnline: { count: 0, courierIds: [], drivers: [] },
    gpsStale: { count: 0, courierIds: [], drivers: [] },
    rejectionsX3: { count: 0, courierIds: [], drivers: [] },
    flightMode: { count: 0, courierIds: [], drivers: [] },
  };
  const [alertPill, setAlertPill] = useState<null | "scheduledNotOnline" | "gpsStale" | "rejectionsX3" | "flightMode">(null);
  const alertFilteredIds = alertPill ? new Set<string>(alerts[alertPill]?.courierIds ?? []) : null;

  // SSE: refetch monitor data on every server-sent event
  const handleSSEMessage = useCallback(() => {
    refetchCouriers();
    refetchAlerts();
  }, [refetchCouriers, refetchAlerts]);

  const { connected: sseConnected } = useSSE({
    url: "/api/notifications/stream",
    onMessage: handleSSEMessage,
    enabled: true,
  });

  const [refreshing, setRefreshing] = useState(false);
  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCouriers(), refetchAlerts()]);
    setRefreshing(false);
  }, [refetchCouriers, refetchAlerts]);

  function formatOnlineTime(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  if (couriersLoading && !monitorData) {
    return (
      <div className="space-y-6">
        <StatCardSkeleton count={4} />
        <TableSkeleton rows={6} cols={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-keeta" />
          <h1 className="text-xl font-semibold">Keeta</h1>
          <span className="text-secondary/30 text-lg font-light">/</span>
          <span className="text-xl text-secondary font-medium">Monitor</span>
        </div>
        <div className="flex items-center gap-3">
          {/* SSE connection indicator */}
          <span className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
            sseConnected ? "bg-green-50 text-green-700" : "bg-gray-100 text-secondary"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              sseConnected ? "bg-green-500" : "bg-gray-400"
            )} />
            {sseConnected ? "Live" : "Connecting..."}
          </span>
          {/* Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Couriers" value={summary.total} icon={Users} />
        <StatCard title="Working" value={summary.working} icon={Activity} highlight />
        <StatCard title="Idle" value={summary.idle} icon={Clock} />
        <StatCard title="Offline" value={summary.offline} icon={WifiOff} />
      </div>

      {/* Alert Panel — four pills, click to filter courier list */}
      <div className="flex flex-wrap gap-3">
        {([
          { key: "scheduledNotOnline", label: "Scheduled not online", icon: WifiOff, color: "amber" },
          { key: "gpsStale", label: "GPS stale", icon: MapPin, color: "red" },
          { key: "rejectionsX3", label: "Rejections ×3", icon: AlertTriangle, color: "purple" },
          { key: "flightMode", label: "Flight-mode", icon: Activity, color: "rose" },
        ] as const).map(({ key, label, icon: Icon, color }) => {
          const count = alerts[key]?.count ?? 0;
          const active = alertPill === key;
          const base = {
            amber: "bg-amber-50 text-amber-700",
            red: "bg-red-50 text-red-700",
            purple: "bg-purple-50 text-purple-700",
            rose: "bg-rose-50 text-rose-700",
          }[color];
          const chip = {
            amber: "bg-amber-200/50",
            red: "bg-red-200/50",
            purple: "bg-purple-200/50",
            rose: "bg-rose-200/50",
          }[color];
          return (
            <button
              key={key}
              onClick={() => setAlertPill(active ? null : key)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                base,
                active && "ring-2 ring-offset-1 ring-current"
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", chip)}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* AI Insights */}
      <InsightBanner context="keeta/monitor" platform="KEETA" maxInsights={2} />

      {/* View Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["courier", "order"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t === "courier" ? "By Courier" : "By Order"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search courier name..." },
          {
            key: "status", type: "select", label: "All Statuses",
            options: [
              { value: "working", label: "Working" },
              { value: "idle", label: "Idle" },
              { value: "offline", label: "Offline" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Courier List */}
      {tab === "courier" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            const visible = alertFilteredIds
              ? couriers.filter((c) => alertFilteredIds.has(c.id))
              : couriers;
            if (visible.length === 0) {
              return (
                <div className="col-span-full py-16 text-center text-sm text-secondary">
                  {alertPill ? "No couriers match the selected alert." : "No couriers found"}
                </div>
              );
            }
            return visible.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelected(c); setDetailTab("current"); }}
                className="bg-white rounded-2xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-keeta/10 rounded-full flex items-center justify-center">
                      {c.vehicleType === "CAR" ? <Truck size={18} className="text-keeta" /> : <Bike size={18} className="text-keeta" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-secondary">{c.platformDriverId || c.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.flightMode && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-medium">Flight Mode</span>
                    )}
                    <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", STATUS_COLORS[c.status])}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-secondary uppercase font-medium">Online</p>
                    <p className="text-sm font-semibold">{formatOnlineTime(c.onlineMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-secondary uppercase font-medium">Completed</p>
                    <p className="text-sm font-semibold">{c.completedOrders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-secondary uppercase font-medium">Cancelled</p>
                    <p className="text-sm font-semibold">{c.cancelledOrders}</p>
                  </div>
                </div>

                {c.shifts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.shifts.map((s: any) => (
                      <span key={s.id} className="text-[10px] bg-gray-100 text-secondary px-2 py-0.5 rounded-md">
                        {s.zone || "—"} {s.scheduledStart ? new Date(s.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}-
                        {s.scheduledEnd ? new Date(s.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* By Order view — placeholder table */}
      {tab === "order" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Courier</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Completed</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Cancelled</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Rejected</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Online Time</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {couriers.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-secondary">No data</td></tr>
                ) : (
                  couriers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => { setSelected(c); setDetailTab("current"); }}
                      className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-secondary">{c.platformDriverId || ""}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", STATUS_COLORS[c.status])}>{c.status}</span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold">{c.completedOrders}</td>
                      <td className="px-5 py-3 text-sm">{c.cancelledOrders}</td>
                      <td className="px-5 py-3 text-sm">{c.rejectedOrders}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{formatOnlineTime(c.onlineMinutes)}</td>
                      <td className="px-5 py-3"><ChevronRight size={14} className="text-secondary" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail SlidePanel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={`Courier ${selected?.platformDriverId || ""}`}
      >
        {selected && (
          <div className="space-y-6">
            {/* Profile header */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Vehicle</p>
                <p className="text-sm font-medium">{selected.vehicleType}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Phone</p>
                <p className="text-sm font-medium">{selected.phone || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Online Time</p>
                <p className="text-sm font-medium">{formatOnlineTime(selected.onlineMinutes)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Battery</p>
                <p className="text-sm font-medium">{selected.batteryLevel != null ? `${selected.batteryLevel}%` : "—"}</p>
              </div>
            </div>

            {/* Flight mode warning */}
            {selected.flightMode && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                <Radio size={16} />
                <span>Possible flight mode — GPS not updated for &gt;10 min</span>
              </div>
            )}

            {/* Detail tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(["current", "completed", "shift"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDetailTab(t)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-center",
                    detailTab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
                  )}
                >
                  {t === "current" ? "Current" : t === "completed" ? "Completed" : "Shift"}
                </button>
              ))}
            </div>

            {detailTab === "current" && (
              <div className="text-sm text-secondary space-y-3">
                {selected.status === "working" ? (
                  <div className="bg-green-50 rounded-xl p-4 text-green-700">
                    <p className="font-medium">Active delivery in progress</p>
                    <p className="text-xs mt-1">Completed {selected.completedOrders} orders today</p>
                  </div>
                ) : selected.status === "idle" ? (
                  <IdleDriverRecommendation
                    driverId={selected.id}
                    driverName={selected.name}
                    lat={selected.lastGps?.lat ?? null}
                    lng={selected.lastGps?.lng ?? null}
                    platform="KEETA"
                  />
                ) : (
                  <p className="text-center py-8">No active orders</p>
                )}
              </div>
            )}

            {detailTab === "completed" && (
              <div className="text-center py-8 text-sm text-secondary">
                <p className="font-medium">{selected.completedOrders} completed, {selected.cancelledOrders} cancelled</p>
                <p className="text-xs mt-1">Detailed order history available in Orders page</p>
              </div>
            )}

            {detailTab === "shift" && (
              <div className="space-y-2">
                {selected.shifts.length === 0 ? (
                  <p className="text-center py-8 text-sm text-secondary">No shifts today</p>
                ) : (
                  selected.shifts.map((s: any) => (
                    <div key={s.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.zone || "No zone"}</p>
                        <p className="text-xs text-secondary">
                          {s.scheduledStart ? new Date(s.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "?"} — {s.scheduledEnd ? new Date(s.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "?"}
                        </p>
                      </div>
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium",
                        s.status === "IN_PROGRESS" ? "bg-green-100 text-green-700" :
                        s.status === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {s.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Map placeholder — last known GPS */}
            {selected.lastGps?.lat && selected.lastGps?.lng && (
              <div className="mt-4">
                <p className="text-[10px] text-secondary uppercase font-medium mb-2">Last Known Location</p>
                <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center text-sm text-secondary">
                  <MapPin size={16} className="mr-2" />
                  {selected.lastGps.lat.toFixed(5)}, {selected.lastGps.lng.toFixed(5)}
                  {selected.lastGps.at && (
                    <span className="ml-2 text-xs">({new Date(selected.lastGps.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
