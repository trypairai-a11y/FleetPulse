"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { Plus, X, Users, ShieldCheck, AlertTriangle, FileText, Loader2 } from "lucide-react";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

const BATCH_NUMBERS = ["Batch A", "Batch B", "Batch C", "Batch D"];

const DOC_STATUS_COLORS: Record<string, string> = {
  VALID: "bg-green-50 text-green-600",
  EXPIRING: "bg-yellow-50 text-yellow-600",
  EXPIRED: "bg-red-50 text-red-600",
  MISSING: "bg-gray-100 text-gray-500",
};

function AddDriverModal({
  zones,
  batches,
  companyId,
  onClose,
  onSuccess,
}: {
  zones: string[];
  batches: string[];
  companyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    utr: "",
    zone: "",
    batchNumber: "",
    vehicleType: "MOTORCYCLE",
    hireDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/drivers", {
        ...form,
        platform: "TALABAT",
        companyId: companyId || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create driver");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add Talabat Driver</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Phone *</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="+965 xxxx xxxx"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">UTR *</label>
            <input
              type="text"
              required
              value={form.utr}
              onChange={(e) => update("utr", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="e.g. UTR-12345"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Zone *</label>
              <select
                required
                value={form.zone}
                onChange={(e) => update("zone", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="">Select zone</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Batch *</label>
              <select
                required
                value={form.batchNumber}
                onChange={(e) => update("batchNumber", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Vehicle Type *</label>
              <select
                required
                value={form.vehicleType}
                onChange={(e) => update("vehicleType", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="MOTORCYCLE">Motorcycle</option>
                <option value="CAR">Car</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Hire Date</label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => update("hireDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Creating..." : "Add Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TalabatDriversPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: companiesData } = useApiGet<any>("/api/companies?platform=TALABAT");
  const companies = companiesData?.data || [];

  const params = new URLSearchParams({ platform: "TALABAT", limit: "100" });
  if (filters.company) params.set("companyId", filters.company);
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);
  if (filters.batch) params.set("batchNumber", filters.batch);
  if (filters.search) params.set("search", filters.search);

  const summaryParams = new URLSearchParams({ platform: "TALABAT" });
  if (filters.company) summaryParams.set("companyId", filters.company);

  const { data, refetch } = useApiGet<any>(`/api/drivers?${params}`);
  const { data: summary } = useApiGet<any>(`/api/drivers/summary?${summaryParams}`);
  const drivers = data?.data || [];

  const columns = [
    {
      key: "name",
      label: "Driver Name",
      render: (_: any, r: any) => {
        const raw = r.talabatDisplayName || r.name || "";
        const cleanName = raw.replace(/\s+\d+[A-Z]?\s*[–—-]\s*\w+$/i, "").trim();
        return (
          <span className="font-medium font-mono text-sm">
            {cleanName || raw}
          </span>
        );
      },
    },
    { key: "utr", label: "UTR" },
    {
      key: "dailyOrders",
      label: "Daily Orders",
      render: (v: number) => (
        <span className="font-medium text-sm tabular-nums">
          {v ?? 0}
        </span>
      ),
    },
    {
      key: "cashCollected",
      label: "Cash",
      render: (v: number) => (
        <span className="font-medium text-sm tabular-nums whitespace-nowrap">
          {v != null ? `${v.toFixed(1)} KD` : "—"}
        </span>
      ),
    },
    {
      key: "workingHours",
      label: "Hours",
      render: (v: number) => (
        <span className="font-medium text-sm tabular-nums">
          {v != null ? `${v.toFixed(1)}h` : "—"}
        </span>
      ),
    },
    {
      key: "vehicleType",
      label: "Vehicle Type",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-blue-50 text-blue-600": v === "MOTORCYCLE",
          "bg-purple-50 text-purple-600": v === "CAR",
        })}>
          {v === "MOTORCYCLE" ? "Motorcycle" : v === "CAR" ? "Car" : v || "—"}
        </span>
      ),
    },
    { key: "zone", label: "Zone" },
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
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Talabat — Drivers</h1>
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
        <StatCard title="Docs Expiring" value={summary?.docsExpiring || 0} icon={AlertTriangle} highlight={(summary?.docsExpiring || 0) > 0} onClick={() => router.push("/talabat/drivers/docs-expiring")} />
        <StatCard title="Missing Docs" value={summary?.docsMissing || 0} icon={FileText} highlight={(summary?.docsMissing || 0) > 0} onClick={() => router.push("/talabat/drivers/missing-docs")} />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search name or UTR..." },
          { key: "company", type: "multi-select", label: "All Companies", options: companies.map((c: any) => ({ value: c.id, label: c.name })) },
          { key: "zone", type: "multi-select", label: "All Zones", options: TALABAT_ZONES.map(z => ({ value: z, label: z })) },
          { key: "batch", type: "multi-select", label: "All Batches", options: BATCH_NUMBERS.map(b => ({ value: b, label: b })) },
          {
            key: "status", type: "multi-select", label: "All Statuses", options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "SUSPENDED", label: "Suspended" },
            ]
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={drivers} onRowClick={(row) => router.push(`/talabat/drivers/${row.id}`)} emptyMessage="No Talabat drivers found" />

      {/* Driver Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={(selected?.talabatDisplayName || selected?.name || "").replace(/\s+\d+[A-Z]?\s*[–—-]\s*\w+$/i, "").trim()}
        subtitle={`Talabat / ${selected?.company?.name || "—"}`}
      >
        {selected && (
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["UTR", selected.utr],
                ["Batch", selected.batchNumber],
                ["Zone", selected.zone],
                ["Vehicle", selected.vehicleType],
                ["Status", selected.status],
                ["Phone", selected.phone],
                ["Hire Date", selected.hireDate ? new Date(selected.hireDate).toLocaleDateString() : "—"],
                ["Company Code", selected.companyCode || "WAHI"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Talabat-Specific Documents */}
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Talabat Documents</h3>
              <div className="space-y-2">
                {[
                  { label: "Health Certificate", key: "healthCertExpiry", status: selected.healthCertStatus },
                  { label: "Work Permit", key: "workPermitExpiry", status: selected.workPermitStatus },
                  { label: "Food Handling Certificate", key: "foodHandlingCertExpiry", status: selected.foodHandlingCertStatus },
                  { label: "Vehicle Registration", key: "vehicleRegExpiry", status: selected.vehicleRegStatus },
                  { label: "Vehicle Insurance", key: "vehicleInsuranceExpiry", status: selected.vehicleInsuranceStatus },
                  { label: "Driving License", key: "drivingLicenseExpiry", status: selected.drivingLicenseStatus },
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

            {/* Vehicle Info */}
            {selected.vehicle && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Vehicle Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Plate", selected.vehicle.plateNumber],
                    ["Make/Model", `${selected.vehicle.make} ${selected.vehicle.model}`],
                    ["Color", selected.vehicle.color],
                    ["Year", selected.vehicle.year],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
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
          zones={TALABAT_ZONES}
          batches={BATCH_NUMBERS}
          companyId={filters.company?.split(",")[0] || companies[0]?.id}
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
