"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { Car, ShieldCheck, AlertTriangle, Wrench, Plus, X, CheckCircle2, XCircle } from "lucide-react";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

const EQUIPMENT_ITEMS = [
  "Helmet", "Insulated Bag", "Jacket / Uniform", "ID Badge", "Phone Mount",
];

const DOC_STATUS_COLORS: Record<string, string> = {
  VALID: "bg-green-50 text-green-600",
  EXPIRING: "bg-yellow-50 text-yellow-600",
  EXPIRED: "bg-red-50 text-red-600",
  MISSING: "bg-gray-100 text-gray-500",
};

function EquipmentBadge({ compliant }: { compliant: boolean | null | undefined }) {
  if (compliant === null || compliant === undefined) {
    return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">Not Checked</span>;
  }
  return compliant ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
      <CheckCircle2 size={11} /> Compliant
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
      <XCircle size={11} /> Non-Compliant
    </span>
  );
}

export default function TalabatVehiclesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "TALABAT", limit: "100" });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.type) params.set("vehicleType", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.compliance) params.set("equipmentCompliant", filters.compliance);
  if (filters.search) params.set("search", filters.search);

  const { data } = useApiGet<any>(`/api/vehicles?${params}`);
  const { data: summary } = useApiGet<any>("/api/vehicles/summary?platform=TALABAT");
  const vehicles = data?.data || [];

  const columns = [
    {
      key: "plateNumber",
      label: "Plate",
      render: (v: string) => <span className="font-mono font-medium">{v || "—"}</span>,
    },
    {
      key: "makeModel",
      label: "Make / Model",
      render: (_: any, r: any) => <span>{r.make} {r.model}{r.year ? ` (${r.year})` : ""}</span>,
    },
    {
      key: "vehicleType",
      label: "Type",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
          v === "MOTORCYCLE" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
        )}>
          {v === "MOTORCYCLE" ? "Bike" : "Car"}
        </span>
      ),
    },
    {
      key: "driver",
      label: "Driver",
      render: (_: any, r: any) => r.driver?.name || <span className="text-secondary">Unassigned</span>,
    },
    { key: "zone", label: "Zone" },
    {
      key: "equipmentCompliant",
      label: "Equipment Compliance",
      render: (v: boolean | null) => <EquipmentBadge compliant={v} />,
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "ACTIVE",
          "bg-yellow-50 text-yellow-600": v === "MAINTENANCE",
          "bg-red-50 text-red-600": v === "INACTIVE" || v === "RETIRED",
          "bg-gray-100 text-gray-500": !v,
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
          <h1 className="text-xl font-semibold">Talabat — Vehicles</h1>
          <span className="text-sm text-secondary">Wahoo International</span>
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
          title="Non-Compliant Equipment"
          value={summary?.nonCompliant || 0}
          icon={AlertTriangle}
          highlight={(summary?.nonCompliant || 0) > 0}
        />
        <StatCard title="In Maintenance" value={summary?.maintenance || 0} icon={Wrench} />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search plate or driver..." },
          { key: "zone", type: "select", label: "All Zones", options: TALABAT_ZONES.map(z => ({ value: z, label: z })) },
          {
            key: "type", type: "select", label: "All Types", options: [
              { value: "MOTORCYCLE", label: "Motorcycle" },
              { value: "CAR", label: "Car" },
            ],
          },
          {
            key: "compliance", type: "select", label: "Equipment", options: [
              { value: "true", label: "Compliant" },
              { value: "false", label: "Non-Compliant" },
            ],
          },
          {
            key: "status", type: "select", label: "All Statuses", options: [
              { value: "ACTIVE", label: "Active" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "INACTIVE", label: "Inactive" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={vehicles} onRowClick={setSelected} emptyMessage="No Talabat vehicles found" />

      {/* Vehicle Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${selected?.make || ""} ${selected?.model || ""}${selected?.year ? ` (${selected.year})` : ""}`}
        subtitle={`Talabat / ${selected?.plateNumber || ""}`}
      >
        {selected && (
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Plate Number", selected.plateNumber],
                ["Make", selected.make],
                ["Model", selected.model],
                ["Year", selected.year],
                ["Color", selected.color],
                ["Type", selected.vehicleType],
                ["Zone", selected.zone],
                ["Status", selected.status],
                ["Assigned Driver", selected.driver?.name || "Unassigned"],
                ["Chassis No.", selected.chassisNumber || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Equipment Compliance */}
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Equipment Compliance</h3>
              <div className="space-y-2">
                {EQUIPMENT_ITEMS.map((item) => {
                  const key = item.toLowerCase().replace(/[\s/]+/g, "_");
                  const status = selected.equipmentChecks?.[key];
                  return (
                    <div key={item} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium">{item}</span>
                      {status === true ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 size={13} /> OK
                        </span>
                      ) : status === false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                          <XCircle size={13} /> Missing
                        </span>
                      ) : (
                        <span className="text-xs text-secondary">Not checked</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-secondary mt-3">
                Last checked:{" "}
                {selected.equipmentLastChecked
                  ? new Date(selected.equipmentLastChecked).toLocaleString()
                  : "Never"}
              </p>
            </div>

            {/* Documents */}
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Vehicle Documents</h3>
              <div className="space-y-2">
                {[
                  { label: "Registration", key: "registrationExpiry", status: selected.registrationStatus },
                  { label: "Insurance", key: "insuranceExpiry", status: selected.insuranceStatus },
                  { label: "Inspection (Fahas)", key: "inspectionExpiry", status: selected.inspectionStatus },
                ].map(({ label, key, status }) => (
                  <div key={key} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      {selected[key] && (
                        <p className="text-xs text-secondary mt-0.5">
                          Expires {new Date(selected[key]).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", DOC_STATUS_COLORS[status || "MISSING"])}>
                      {status || "MISSING"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Vehicle</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-secondary">Vehicle form — connects to POST /api/vehicles with platform=TALABAT</p>
          </div>
        </div>
      )}
    </div>
  );
}
