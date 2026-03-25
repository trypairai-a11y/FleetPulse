"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import { cn } from "@/lib/cn";
import { Plus, X } from "lucide-react";

const ZONES = ["Hawally", "Salmiya", "Jabriya"];

export default function KeetaDriversPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "KEETA", limit: "100" });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const { data } = useApiGet<any>(`/api/drivers?${params}`);
  const drivers = data?.data || [];

  const columns = [
    { key: "name", label: "Driver Name", render: (_: any, r: any) => <span className="font-medium">{r.name}</span> },
    { key: "platformDriverId", label: "Courier ID" },
    { key: "zone", label: "Zone" },
    { key: "vehicleType", label: "Vehicle", render: (v: string) => (
      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", v === "MOTORCYCLE" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600")}>
        {v === "MOTORCYCLE" ? "Bike" : "Car"}
      </span>
    )},
    { key: "status", label: "Status", render: (v: string) => (
      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
        "bg-green-50 text-green-600": v === "ACTIVE", "bg-gray-100 text-gray-500": v === "INACTIVE",
        "bg-red-50 text-red-600": v === "SUSPENDED" || v === "TERMINATED",
      })}>{v}</span>
    )},
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-keeta" />
          <h1 className="text-xl font-semibold">Keeta — Drivers</h1>
          <span className="text-sm text-secondary">Sidra</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
          <Plus size={16} /> Add Driver
        </button>
      </div>

      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search name or ID..." },
          { key: "zone", type: "select", label: "All Zones", options: ZONES.map(z => ({ value: z, label: z })) },
          { key: "status", type: "select", label: "All Statuses", options: [
            { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" },
          ]},
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={drivers} onRowClick={setSelected} />

      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ""} subtitle="Keeta / Sidra">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Courier ID", selected.platformDriverId],
                ["Zone", selected.zone],
                ["Vehicle", selected.vehicleType],
                ["Status", selected.status],
                ["Phone", selected.phone],
                ["Hire Date", new Date(selected.hireDate).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Keeta Driver</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-50 rounded-lg"><X size={18} /></button>
            </div>
            <p className="text-sm text-secondary">Driver form — connects to POST /api/drivers</p>
          </div>
        </div>
      )}
    </div>
  );
}
