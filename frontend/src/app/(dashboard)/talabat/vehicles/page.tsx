"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { Car, ShieldCheck, AlertTriangle, Wrench, Plus, X, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

const OWNER_COMPANIES = ["Wahoo", "Alhazm", "Sidra", "Alhazm Express", "Rent Office"];

const INITIAL_FORM = {
  plateNumber: "",
  vehicleType: "MOTORCYCLE" as "MOTORCYCLE" | "CAR",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  fuelType: "Petrol",
  ownerCompany: "",
  driverIqama: "",
  insuranceExpiry: "",
  registrationExpiry: "",
};

function AddVehicleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: companiesData } = useApiGet<any>("/api/companies?platform=TALABAT&limit=50");
  const companies = companiesData?.data || [];

  const [companyId, setCompanyId] = useState("");

  // Auto-select first company when loaded
  const firstCompanyId = companies[0]?.id;
  if (firstCompanyId && !companyId) {
    setCompanyId(firstCompanyId);
  }

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyId) { setError("No company found for Talabat"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/vehicles", {
        ...form,
        companyId,
        insuranceExpiry: new Date(form.insuranceExpiry).toISOString(),
        registrationExpiry: new Date(form.registrationExpiry).toISOString(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
  const labelClass = "block text-xs font-medium text-secondary mb-1";

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add Vehicle</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plate + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Plate Number *</label>
              <input required className={inputClass} placeholder="KW-12345" value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Vehicle Type *</label>
              <select className={inputClass} value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}>
                <option value="MOTORCYCLE">Motorcycle</option>
                <option value="CAR">Car</option>
              </select>
            </div>
          </div>

          {/* Brand + Model row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Brand *</label>
              <input required className={inputClass} placeholder="Honda" value={form.make} onChange={(e) => set("make", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Model *</label>
              <input required className={inputClass} placeholder="PCX 160" value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
          </div>

          {/* Year + Fuel row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Year *</label>
              <input required type="number" min={2000} max={2030} className={inputClass} value={form.year} onChange={(e) => set("year", parseInt(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>Fuel Type</label>
              <select className={inputClass} value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
          </div>

          {/* Owner Company + Driver Iqama row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Car Belongs to Company *</label>
              <select required className={inputClass} value={form.ownerCompany} onChange={(e) => set("ownerCompany", e.target.value)}>
                <option value="">Select company</option>
                {OWNER_COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Driver Iqama *</label>
              <input required className={inputClass} placeholder="e.g. 2400000000" value={form.driverIqama} onChange={(e) => set("driverIqama", e.target.value)} />
            </div>
          </div>

          {/* Company selector (if multiple) */}
          {companies.length > 1 && (
            <div>
              <label className={labelClass}>Company *</label>
              <select className={inputClass} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Expiry dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Insurance Expiry *</label>
              <input required type="date" className={inputClass} value={form.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Registration Expiry *</label>
              <input required type="date" className={inputClass} value={form.registrationExpiry} onChange={(e) => set("registrationExpiry", e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-50 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Adding..." : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
      render: (v: string) => <span className="font-mono font-medium">{v || "-"}</span>,
    },
    {
      key: "makeModel",
      label: "Model",
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
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "ACTIVE",
          "bg-yellow-50 text-yellow-600": v === "MAINTENANCE",
          "bg-red-50 text-red-600": v === "INACTIVE" || v === "RETIRED",
          "bg-gray-100 text-gray-500": !v,
        })}>
          {v || "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Talabat - Vehicles</h1>
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
                ["Brand", selected.make],
                ["Model", selected.model],
                ["Year", selected.year],
                ["Color", selected.color],
                ["Type", selected.vehicleType],
                ["Zone", selected.zone],
                ["Status", selected.status],
                ["Assigned Driver", selected.driver?.name || "Unassigned"],
                ["Owner Company", selected.ownerCompany || "-"],
                ["Driver Iqama", selected.driverIqama || "-"],
                ["Chassis No.", selected.chassisNumber || "-"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
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
        <AddVehicleModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            // refetch handled by useApiGet re-render
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
