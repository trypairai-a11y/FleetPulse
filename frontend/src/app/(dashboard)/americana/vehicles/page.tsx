"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { Plus, X, Car, Bike, ShieldCheck, AlertTriangle } from "lucide-react";

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

const VEHICLE_TYPES = ["Car", "Bike"];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-600",
  INACTIVE: "bg-gray-100 text-gray-500",
  MAINTENANCE: "bg-yellow-50 text-yellow-700",
  SUSPENDED: "bg-red-50 text-red-600",
};

export default function AmericanaVehiclesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "AMERICANA", limit: "100" });
  if (filters.search) params.set("search", filters.search);
  if (filters.store) params.set("store", filters.store);
  if (filters.type) params.set("type", filters.type === "Bike" ? "MOTORCYCLE" : "CAR");
  if (filters.status) params.set("status", filters.status);

  const { data } = useApiGet<any>(`/api/vehicles?${params}`);
  const { data: summary } = useApiGet<any>("/api/vehicles/summary?platform=AMERICANA");
  const vehicles = data?.data || [];

  const columns = [
    {
      key: "plateNumber",
      label: "Plate",
      render: (v: string) => <span className="font-mono font-semibold text-sm">{v || "-"}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1",
          v === "MOTORCYCLE" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
        )}>
          {v === "MOTORCYCLE" ? "Bike" : "Car"}
        </span>
      ),
    },
    {
      key: "make",
      label: "Model",
      render: (_: any, r: any) => (
        <span className="text-sm">{[r.make, r.model].filter(Boolean).join(" ") || "-"}</span>
      ),
    },
    { key: "year", label: "Year", render: (v: string) => <span className="text-sm text-secondary">{v || "-"}</span> },
    { key: "color", label: "Color", render: (v: string) => <span className="text-sm text-secondary">{v || "-"}</span> },
    {
      key: "storeName",
      label: "Store",
      render: (v: string) => (
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
          {v || "-"}
        </span>
      ),
    },
    {
      key: "driverName",
      label: "Assigned Driver",
      render: (_: any, r: any) => (
        <span className="text-sm">{r.driver?.name || r.driverName || <span className="text-secondary">Unassigned</span>}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_STYLES[v] || "bg-gray-100 text-gray-600")}>
          {v || "-"}
        </span>
      ),
    },
    {
      key: "insuranceExpiry",
      label: "Insurance",
      render: (v: string) => {
        if (!v) return <span className="text-xs text-secondary">-</span>;
        const date = new Date(v);
        const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000);
        const style = daysLeft < 0
          ? "text-red-600 font-medium"
          : daysLeft < 30
          ? "text-yellow-600 font-medium"
          : "text-secondary";
        return <span className={cn("text-xs", style)}>{date.toLocaleDateString()}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-americana" />
          <h1 className="text-xl font-semibold">Americana - Vehicles</h1>
          <span className="text-sm text-secondary">Al Hazm Express</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Vehicles" value={summary?.total || vehicles.length} icon={Car} />
        <StatCard title="Active" value={summary?.active || 0} icon={ShieldCheck} />
        <StatCard
          title="In Maintenance"
          value={summary?.maintenance || vehicles.filter((v: any) => v.status === "MAINTENANCE").length}
          icon={AlertTriangle}
          highlight={(summary?.maintenance || 0) > 0}
        />
        <StatCard
          title="Insurance Expiring"
          value={summary?.insuranceExpiring || 0}
          icon={AlertTriangle}
          highlight={(summary?.insuranceExpiring || 0) > 0}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search plate or driver..." },
          { key: "store", type: "select", label: "All Stores", options: STORES.map((s) => ({ value: s, label: s })) },
          { key: "type", type: "select", label: "All Types", options: VEHICLE_TYPES.map((t) => ({ value: t, label: t })) },
          {
            key: "status",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "SUSPENDED", label: "Suspended" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={vehicles} onRowClick={setSelected} emptyMessage="No Americana vehicles found" />

      {/* Vehicle Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.plateNumber || "Vehicle Detail"}
        subtitle="Americana / Al Hazm Express"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Plate", selected.plateNumber],
                ["Type", selected.type === "MOTORCYCLE" ? "Bike" : "Car"],
                ["Brand", selected.make],
                ["Model", selected.model],
                ["Color", selected.color],
                ["Year", selected.year],
                ["Store", selected.storeName],
                ["Assigned Driver", selected.driver?.name || selected.driverName || "Unassigned"],
                ["Status", selected.status],
                ["Insurance Expiry", selected.insuranceExpiry ? new Date(selected.insuranceExpiry).toLocaleDateString() : "-"],
                ["Registration Expiry", selected.registrationExpiry ? new Date(selected.registrationExpiry).toLocaleDateString() : "-"],
                ["Mileage", selected.mileage ? `${selected.mileage.toLocaleString()} km` : "-"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
                </div>
              ))}
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

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Americana Vehicle</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-secondary">Vehicle form - connects to POST /api/vehicles with platform=AMERICANA</p>
          </div>
        </div>
      )}
    </div>
  );
}
