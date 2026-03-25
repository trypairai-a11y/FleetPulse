"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Plus,
  X,
  Smartphone,
  CheckCircle2,
  XCircle,
  WifiOff,
  Battery,
  Signal,
} from "lucide-react";

const STORES = [
  "KFC Audiliya",
  "KFC Salwa",
  "KFC Salmiya",
  "KFC Jabriya",
  "KFC Rumaithiya",
  "Pizza Hut Hawally",
  "Pizza Hut Salmiya",
  "Hardees Fahaheel",
];

const STATUS_STYLES: Record<string, string> = {
  ONLINE: "bg-green-50 text-green-700",
  OFFLINE: "bg-gray-100 text-gray-500",
  ASSIGNED: "bg-blue-50 text-blue-700",
  UNASSIGNED: "bg-yellow-50 text-yellow-700",
  LOST: "bg-red-50 text-red-600",
  MAINTENANCE: "bg-orange-50 text-orange-600",
};

function BatteryIndicator({ level }: { level: number | null }) {
  if (level == null) return <span className="text-xs text-secondary">—</span>;
  const color = level < 20 ? "text-red-500" : level < 50 ? "text-yellow-600" : "text-green-600";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", color)}>
      <Battery size={13} />
      {level}%
    </span>
  );
}

function OnlineIndicator({ online }: { online: boolean | null }) {
  if (online === null) return <span className="text-xs text-secondary">—</span>;
  return online ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <Signal size={12} /> Online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
      <WifiOff size={12} /> Offline
    </span>
  );
}

export default function AmericanaPhonePage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "AMERICANA", limit: "100" });
  if (filters.search) params.set("search", filters.search);
  if (filters.store) params.set("store", filters.store);
  if (filters.status) params.set("status", filters.status);

  const { data } = useApiGet<any>(`/api/devices?${params}`);
  const { data: summary } = useApiGet<any>("/api/devices/summary?platform=AMERICANA");
  const devices = data?.data || [];

  const columns = [
    {
      key: "deviceId",
      label: "Device ID",
      render: (v: string) => <span className="font-mono text-xs font-medium">{v || "—"}</span>,
    },
    {
      key: "imei",
      label: "IMEI",
      render: (v: string) => <span className="font-mono text-xs text-secondary">{v || "—"}</span>,
    },
    {
      key: "model",
      label: "Model",
      render: (v: string) => <span className="text-sm">{v || "—"}</span>,
    },
    {
      key: "storeName",
      label: "Store",
      render: (v: string) => (
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
          {v || "—"}
        </span>
      ),
    },
    {
      key: "assignedDriver",
      label: "Assigned Driver",
      render: (_: any, r: any) => (
        <span className="text-sm">{r.driver?.name || r.assignedDriver || <span className="text-secondary">Unassigned</span>}</span>
      ),
    },
    {
      key: "online",
      label: "Connectivity",
      render: (v: boolean) => <OnlineIndicator online={v ?? null} />,
    },
    {
      key: "batteryLevel",
      label: "Battery",
      render: (v: number) => <BatteryIndicator level={v ?? null} />,
    },
    {
      key: "appVersion",
      label: "App Version",
      render: (v: string) => <span className="font-mono text-xs text-secondary">{v || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_STYLES[v] || "bg-gray-100 text-gray-600")}>
          {v || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-americana" />
          <h1 className="text-xl font-semibold">Americana — Phones</h1>
          <span className="text-sm text-secondary">Al Hazm Express</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Device
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Devices" value={summary?.total || devices.length} icon={Smartphone} />
        <StatCard
          title="Online Now"
          value={summary?.online || devices.filter((d: any) => d.online === true).length}
          icon={Signal}
        />
        <StatCard
          title="Unassigned"
          value={summary?.unassigned || devices.filter((d: any) => d.status === "UNASSIGNED").length}
          icon={XCircle}
          highlight={(summary?.unassigned || 0) > 0}
        />
        <StatCard
          title="Low Battery"
          value={summary?.lowBattery || devices.filter((d: any) => (d.batteryLevel ?? 100) < 20).length}
          icon={Battery}
          highlight={(summary?.lowBattery || 0) > 0}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search device ID, IMEI or driver..." },
          { key: "store", type: "select", label: "All Stores", options: STORES.map((s) => ({ value: s, label: s })) },
          {
            key: "status",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "ONLINE", label: "Online" },
              { value: "OFFLINE", label: "Offline" },
              { value: "ASSIGNED", label: "Assigned" },
              { value: "UNASSIGNED", label: "Unassigned" },
              { value: "LOST", label: "Lost" },
              { value: "MAINTENANCE", label: "Maintenance" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={devices} onRowClick={setSelected} emptyMessage="No Americana devices found" />

      {/* Device Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.deviceId || "Device Detail"}
        subtitle="Americana / Al Hazm Express"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Device ID", selected.deviceId],
                ["IMEI", selected.imei],
                ["Model", selected.model],
                ["OS Version", selected.osVersion],
                ["App Version", selected.appVersion],
                ["Store", selected.storeName],
                ["Assigned Driver", selected.driver?.name || selected.assignedDriver || "Unassigned"],
                ["Status", selected.status],
                ["Battery", selected.batteryLevel != null ? `${selected.batteryLevel}%` : "—"],
                ["Connectivity", selected.online ? "Online" : "Offline"],
                ["Last Seen", selected.lastSeen ? new Date(selected.lastSeen).toLocaleString() : "—"],
                ["Last Location", selected.lastLocation || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Remote Actions */}
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Remote Actions</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Lock Device", style: "bg-red-50 text-red-600 hover:bg-red-100" },
                  { label: "Wipe Device", style: "bg-red-50 text-red-600 hover:bg-red-100" },
                  { label: "Send Message", style: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
                  { label: "Locate", style: "bg-green-50 text-green-600 hover:bg-green-100" },
                ].map(({ label, style }) => (
                  <button
                    key={label}
                    className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", style)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {selected.notes && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium mb-1">Notes</p>
                <p className="text-sm">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Add Device Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Americana Device</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-secondary">Device form — connects to POST /api/devices with platform=AMERICANA</p>
          </div>
        </div>
      )}
    </div>
  );
}
