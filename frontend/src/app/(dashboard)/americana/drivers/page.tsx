"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import AddDriverModal from "@/components/shared/AddDriverModal";
import { Plus, Users, ShieldCheck, Bike, Car, CheckCircle2, XCircle } from "lucide-react";

const CHAINS = ["12", "13", "14", "15"];
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
const POSITIONS = ["Car", "Bike"];

export default function AmericanaDriversPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "AMERICANA", limit: "100" });
  if (filters.search) params.set("search", filters.search);
  if (filters.store) params.set("store", filters.store);
  if (filters.chain) params.set("chain", filters.chain);
  if (filters.position) params.set("vehicleType", filters.position === "Bike" ? "MOTORCYCLE" : "CAR");
  if (filters.status) params.set("status", filters.status);

  const { data, refetch } = useApiGet<any>(`/api/drivers?${params}`);
  const { data: summary } = useApiGet<any>("/api/drivers/summary?platform=AMERICANA");
  const rawDrivers = data?.data || [];
  // Mock face verification + mismatch data for demo
  const drivers = rawDrivers.map((d: any, i: number) => ({
    ...d,
    faceVerified: d.faceVerified ?? (i % 7 !== 0),
    faceMismatch: d.faceMismatch ?? (i % 7 === 0 || i % 13 === 0),
  }));

  const columns = [
    {
      key: "name",
      label: "Driver Name",
      render: (_: any, r: any) => <span className="font-medium">{r.name}</span>,
    },
    { key: "employeeId", label: "Emp ID", render: (v: string) => <span className="font-mono text-sm text-secondary">{v || "-"}</span> },
    {
      key: "chain",
      label: "Chain",
      render: (v: string) => (
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
          {v || "-"}
        </span>
      ),
    },
    { key: "storeName", label: "Store", render: (v: string) => <span className="text-sm text-secondary">{v || "-"}</span> },
    {
      key: "vehicleType",
      label: "Position",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1",
          v === "MOTORCYCLE" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
        )}>
          {v === "MOTORCYCLE" ? "Bike" : "Car"}
        </span>
      ),
    },
    { key: "costCenter", label: "CC", render: (v: string) => <span className="font-mono text-xs text-secondary">{v || "-"}</span> },
    {
      key: "faceVerified",
      label: "Face",
      render: (_: any, r: any) =>
        r.faceMismatch ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-600">
            <XCircle size={13} /> Mismatch
          </span>
        ) : r.faceVerified != null ? (
          r.faceVerified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
              <CheckCircle2 size={13} /> Pass
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
              <XCircle size={13} /> Fail
            </span>
          )
        ) : (
          <span className="text-xs text-secondary">-</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "ACTIVE",
          "bg-gray-100 text-gray-500": v === "INACTIVE",
          "bg-red-50 text-red-600": v === "SUSPENDED" || v === "TERMINATED",
        })}>
          {v}
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
          <h1 className="text-xl font-semibold">Americana - Drivers</h1>
          <span className="text-sm text-secondary">Al Hazm Express</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Drivers" value={summary?.total || drivers.length} icon={Users} />
        <StatCard title="Active" value={summary?.active || 0} icon={ShieldCheck} />
        <StatCard
          title="Car Drivers"
          value={summary?.carDrivers || drivers.filter((d: any) => d.vehicleType === "CAR").length}
          icon={Car}
        />
        <StatCard
          title="Bike Drivers"
          value={summary?.bikeDrivers || drivers.filter((d: any) => d.vehicleType === "MOTORCYCLE").length}
          icon={Bike}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search name or Emp ID..." },
          { key: "store", type: "select", label: "All Stores", options: STORES.map((s) => ({ value: s, label: s })) },
          { key: "chain", type: "select", label: "All Chains", options: CHAINS.map((c) => ({ value: c, label: `Chain ${c}` })) },
          { key: "position", type: "select", label: "All Positions", options: POSITIONS.map((p) => ({ value: p, label: p })) },
          {
            key: "status",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={drivers} onRowClick={setSelected} emptyMessage="No Americana drivers found" />

      {/* Driver Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle="Americana / Al Hazm Express"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Emp ID", selected.employeeId],
                ["Chain", selected.chain],
                ["Store", selected.storeName],
                ["Position", selected.vehicleType === "MOTORCYCLE" ? "Bike" : "Car"],
                ["Cost Center (CC)", selected.costCenter],
                ["Status", selected.status],
                ["Company Phone", selected.phone],
                ["Personal Phone", selected.personalPhone],
                ["Hire Date", selected.hireDate ? new Date(selected.hireDate).toLocaleDateString() : "-"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
                </div>
              ))}
            </div>

            {selected.vehicle && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Vehicle Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Plate", selected.vehicle.plateNumber],
                    ["Make / Model", `${selected.vehicle.make} ${selected.vehicle.model}`],
                    ["Color", selected.vehicle.color],
                    ["Year", selected.vehicle.year],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Add Driver Modal */}
      {showAdd && (
        <AddDriverModal
          platform="AMERICANA"
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
