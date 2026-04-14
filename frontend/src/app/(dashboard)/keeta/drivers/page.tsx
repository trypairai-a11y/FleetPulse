"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import { cn } from "@/lib/cn";
import { Plus, CheckCircle2, XCircle } from "lucide-react";

const AddDriverModal = dynamic(() => import("@/components/shared/AddDriverModal"), {
  ssr: false,
  loading: () => null,
});

const ZONES = ["Hawally", "Salmiya", "Ardiya", "Jahra", "Khiran", "Mishref", "Sabah Al Salem", "Abu Halifa", "Fahaheel", "Mangaf"];

export default function KeetaDriversPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "KEETA", limit: "100" });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const { data, refetch } = useApiGet<any>(`/api/drivers?${params}`);
  const rawDrivers = data?.data || [];
  // Mock face verification + mismatch data for demo
  const drivers = rawDrivers.map((d: any, i: number) => ({
    ...d,
    faceVerified: d.faceVerified ?? (i % 7 !== 0),
    faceMismatch: d.faceMismatch ?? (i % 7 === 0 || i % 13 === 0),
  }));

  const columns = [
    { key: "name", label: "Driver Name", render: (_: any, r: any) => <span className="font-medium">{r.name}</span> },
    { key: "platformDriverId", label: "Courier ID" },
    { key: "zone", label: "Zone" },
    { key: "vehicleType", label: "Vehicle", render: (v: string) => (
      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", v === "MOTORCYCLE" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600")}>
        {v === "MOTORCYCLE" ? "Bike" : "Car"}
      </span>
    )},
    {
      key: "faceVerified",
      label: "Face",
      render: (_: any, r: any) =>
        r.faceVerified != null ? (
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
          <h1 className="text-xl font-semibold">Keeta - Drivers</h1>
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
            { value: "ACTIVE", label: "Active" },
            { value: "LEAVE", label: "Leave" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "RESTRICTED", label: "Restricted" },
            { value: "RESTRICTED_PERMANENTLY", label: "Restricted (Permanent)" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "TERMINATED", label: "Terminated" },
            { value: "TERMINATION", label: "Termination" },
          ]},
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable columns={columns} data={drivers} onRowClick={(row) => router.push(`/keeta/drivers/${row.id}`)} />

      <SlidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ""} subtitle="Keeta / Sidra">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Courier ID", selected.platformDriverId],
                ["Zone", selected.zone],
                ["Vehicle", selected.vehicleType],
                ["Status", selected.status],
                ["Company Phone", selected.phone],
                ["Personal Phone", selected.personalPhone],
                ["Hire Date", new Date(selected.hireDate).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {showAdd && (
        <AddDriverModal
          platform="KEETA"
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
