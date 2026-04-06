"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import AddDriverModal from "@/components/shared/AddDriverModal";
import { Plus, Users, ShieldCheck, AlertTriangle, FileText, CheckCircle2, XCircle } from "lucide-react";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

const BATCH_NUMBERS = ["1", "2", "3", "4", "5", "6", "7"];

const DOC_STATUS_COLORS: Record<string, string> = {
  VALID: "bg-green-50 text-green-600",
  EXPIRING: "bg-yellow-50 text-yellow-600",
  EXPIRED: "bg-red-50 text-red-600",
  MISSING: "bg-gray-100 text-gray-500",
};

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
  const rawDrivers = data?.data || [];
  // Mock face verification + mismatch data for demo
  const drivers = rawDrivers.map((d: any, i: number) => ({
    ...d,
    faceVerified: d.faceVerified ?? (i % 7 !== 0 && i % 11 !== 0),
    faceMismatch: d.faceMismatch ?? (i % 7 === 0),
  }));

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
      key: "uti",
      label: "UTR",
      render: (v: number) => (
        <span className={cn("font-medium text-sm tabular-nums", {
          "text-green-600": v != null && v >= 1.0,
          "text-yellow-600": v != null && v >= 0.5 && v < 1.0,
          "text-red-600": v != null && v < 0.5,
        })}>
          {v != null ? v.toFixed(2) : "—"}
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
          {v === "MOTORCYCLE" ? "Bike" : v === "CAR" ? "Car" : v || "—"}
        </span>
      ),
    },
    { key: "zone", label: "Zone" },
    {
      key: "batchNumber",
      label: "Batch",
      render: (v: string) => (
        <span className="font-medium text-sm tabular-nums">
          {v ? v.replace(/[A-Za-z]/g, "") : "—"}
        </span>
      ),
    },
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
          <span className="text-xs text-secondary">—</span>
        ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (v: string) => (
        <span className="font-mono text-sm text-secondary">
          {v || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "ACTIVE",
          "bg-gray-100 text-gray-500": v === "INACTIVE",
          "bg-red-50 text-red-600": v === "SUSPENDED" || v === "TERMINATED" || v === "TERMINATION",
          "bg-orange-50 text-orange-600": v === "LEAVE",
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
          { key: "search", type: "search", label: "Search", placeholder: "Search name or Talabat ID..." },
          { key: "company", type: "multi-select", label: "All Companies", options: companies.map((c: any) => ({ value: c.id, label: c.name })) },
          { key: "zone", type: "multi-select", label: "All Zones", options: TALABAT_ZONES.map(z => ({ value: z, label: z })) },
          { key: "batch", type: "multi-select", label: "All Batches", options: BATCH_NUMBERS.map(b => ({ value: b, label: b })) },
          {
            key: "status", type: "multi-select", label: "All Statuses", options: [
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "LEAVE", label: "Leave" },
              { value: "TERMINATION", label: "Termination" },
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
                ["Talabat ID", selected.platformDriverId],
                ["Batch", selected.batchNumber],
                ["Zone", selected.zone],
                ["Vehicle", selected.vehicleType === "MOTORCYCLE" ? "Bike" : selected.vehicleType === "CAR" ? "Car" : selected.vehicleType],
                ["Status", selected.status],
                ["Company Phone", selected.phone],
                ["Personal Phone", selected.personalPhone],
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
          platform="TALABAT"
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
