"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { Smartphone, ShieldCheck, AlertTriangle, Plus, X } from "lucide-react";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

export default function TalabatPhonesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "TALABAT", limit: "100" });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const { data } = useApiGet<any>(`/api/devices?${params}`);
  const { data: summary } = useApiGet<any>("/api/devices/summary?platform=TALABAT");
  const devices = data?.data || [];

  const columns = [
    { key: "model", label: "Model" },
    { key: "imei", label: "IMEI", render: (v: string) => <span className="font-mono text-xs text-secondary">{v || "—"}</span> },
    {
      key: "assignedDriver",
      label: "Assigned Driver",
      render: (_: any, r: any) => r.driver?.name || <span className="text-secondary text-sm">Unassigned</span>,
    },
    {
      key: "mobileNumber",
      label: "Mobile Number",
      render: (_: any, r: any) => (
        <span className="font-mono text-xs text-secondary">{r.driver?.phone || "—"}</span>
      ),
    },
    { key: "zone", label: "Zone" },
    {
      key: "lastSeen",
      label: "Last Seen",
      render: (v: string) => (
        <span className="text-xs text-secondary">
          {v ? new Date(v).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "ACTIVE" || v === "ONLINE",
          "bg-gray-100 text-gray-500": v === "INACTIVE" || v === "OFFLINE",
          "bg-red-50 text-red-600": v === "LOST" || v === "DAMAGED",
          "bg-yellow-50 text-yellow-600": v === "MAINTENANCE",
        })}>
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
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Talabat — Phones</h1>
          <span className="text-sm text-secondary">Wahoo International</span>
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
        <StatCard title="Online" value={summary?.online || 0} icon={ShieldCheck} />
        <StatCard
          title="Lost / Damaged"
          value={summary?.lost || 0}
          icon={AlertTriangle}
          highlight={(summary?.lost || 0) > 0}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search device ID, IMEI or driver..." },
          { key: "zone", type: "select", label: "All Zones", options: TALABAT_ZONES.map(z => ({ value: z, label: z })) },
          {
            key: "status", type: "select", label: "All Statuses", options: [
              { value: "ACTIVE", label: "Active" },
              { value: "ONLINE", label: "Online" },
              { value: "OFFLINE", label: "Offline" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "LOST", label: "Lost" },
              { value: "DAMAGED", label: "Damaged" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={devices} onRowClick={setSelected} emptyMessage="No devices found" />

      {/* Device Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.model || "Device Detail"}
        subtitle={`Talabat / ${selected?.deviceId || ""}`}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Device ID", selected.deviceId],
                ["Model", selected.model],
                ["IMEI", selected.imei],
                ["Serial No.", selected.serialNumber || "—"],
                ["Status", selected.status],
                ["Zone", selected.zone],
                ["Assigned Driver", selected.driver?.name || "Unassigned"],
                ["Mobile Number", selected.driver?.phone || "—"],
                ["OS Version", selected.osVersion || "—"],
                ["App Version", selected.appVersion || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Activity</h3>
              <div className="space-y-2">
                {[
                  ["Last Seen", selected.lastSeen ? new Date(selected.lastSeen).toLocaleString() : "—"],
                  ["Last Location", selected.lastLocation || "—"],
                  ["Issued On", selected.issuedOn ? new Date(selected.issuedOn).toLocaleDateString() : "—"],
                  ["Notes", selected.notes || "—"],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-start justify-between py-2.5 px-3 bg-gray-50 rounded-xl gap-3">
                    <span className="text-xs font-medium text-secondary whitespace-nowrap">{label}</span>
                    <span className="text-sm text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Add Device Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Device</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-secondary">Device form — connects to POST /api/devices with platform=TALABAT</p>
          </div>
        </div>
      )}
    </div>
  );
}
