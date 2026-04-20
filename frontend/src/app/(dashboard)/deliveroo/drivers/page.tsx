"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Users,
  ShieldCheck,
  AlertCircle,
  Plus,
  Camera,
  MapPin,
  Phone,
  Bike,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const AddDriverModal = dynamic(() => import("@/components/shared/AddDriverModal"), {
  ssr: false,
  loading: () => null,
});

const ZONES = ["Al Hazm", "Madinat Al Hareer", "Abu Halifa", "Mangaf", "Fahaheel"];

type OperatingModel = "FREELANCE" | "CORE_FLEET";

function ModelBadge({ model }: { model: OperatingModel }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-md text-xs font-medium",
        model === "FREELANCE"
          ? "bg-green-50 text-green-700"
          : "bg-blue-50 text-blue-700"
      )}
    >
      {model === "FREELANCE" ? "Freelance" : "Core Fleet"}
    </span>
  );
}

function FaceVerifBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        verified ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"
      )}
    >
      <Camera size={10} />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

export default function DeliverooDriversPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  const params = new URLSearchParams({ platform: "DELIVEROO", limit: "100" });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.status) params.set("status", filters.status);
  if (filters.model) params.set("operatingModel", filters.model);
  if (filters.search) params.set("search", filters.search);

  const { data, refetch } = useApiGet<any>(`/api/drivers?${params}`);
  const { data: summary } = useApiGet<any>("/api/deliveroo/drivers/summary");

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
      render: (_: any, r: any) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-700">
            {r.name?.charAt(0) || "D"}
          </div>
          <span className="font-medium">{r.name}</span>
        </div>
      ),
    },
    {
      key: "platformDriverId",
      label: "Rider ID",
      render: (v: string) => (
        <span className="font-mono text-xs text-secondary">
          #{v || "-"}
        </span>
      ),
    },
    {
      key: "operatingModel",
      label: "Operating Model",
      render: (v: OperatingModel) => <ModelBadge model={v || "FREELANCE"} />,
    },
    { key: "zone", label: "Zone" },
    {
      key: "vehicleType",
      label: "Vehicle",
      render: (v: string) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded-md text-xs font-medium",
            v === "MOTORCYCLE"
              ? "bg-orange-50 text-orange-600"
              : "bg-blue-50 text-blue-600"
          )}
        >
          {v === "MOTORCYCLE" ? "Bike" : "Car"}
        </span>
      ),
    },
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
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span
          className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
            "bg-green-50 text-green-600": v === "ACTIVE",
            "bg-gray-100 text-gray-500": v === "INACTIVE",
            "bg-red-50 text-red-600": v === "SUSPENDED" || v === "TERMINATED",
          })}
        >
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
          <span className="w-3 h-3 rounded-full bg-teal-500" />
          <h1 className="text-xl font-semibold">Deliveroo - Drivers</h1>
          <span className="text-sm text-secondary">Al Hazm</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} /> Add Driver
        </button>
      </div>

      {/* Note banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          <span className="font-semibold">Note:</span> Deliveroo does not have native face verification. Darb adds this capability via the Android agent - see the "Face Verif (Darb)" column.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Drivers" value={summary?.total || drivers.length} icon={Users} />
        <StatCard title="Freelance" value={summary?.freelance || "-"} icon={Bike} />
        <StatCard title="Core Fleet" value={summary?.coreFleet || "-"} icon={Users} />
        <StatCard
          title="Face Verified"
          value={summary?.faceVerified || "-"}
          icon={ShieldCheck}
        />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          {
            key: "search",
            type: "search",
            label: "Search",
            placeholder: "Search name or Rider ID...",
          },
          {
            key: "zone",
            type: "select",
            label: "All Zones",
            options: ZONES.map((z) => ({ value: z, label: z })),
          },
          {
            key: "model",
            type: "select",
            label: "All Models",
            options: [
              { value: "FREELANCE", label: "Freelance" },
              { value: "CORE_FLEET", label: "Core Fleet" },
            ],
          },
          {
            key: "status",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "LEAVE", label: "Leave" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "RESTRICTED", label: "Restricted" },
              { value: "RESTRICTED_PERMANENTLY", label: "Restricted (Permanent)" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "TERMINATED", label: "Terminated" },
              { value: "TERMINATION", label: "Pending Termination" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      <DataTable
        columns={columns}
        data={drivers}
        onRowClick={(row) => router.push(`/deliveroo/drivers/${row.id}`)}
        emptyMessage="No Deliveroo drivers found"
      />

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle="Deliveroo / Al Hazm"
      >
        {selected && (
          <div className="space-y-5">
            {/* Operating model highlight */}
            <div className="flex items-center gap-2">
              <ModelBadge model={selected.operatingModel || "FREELANCE"} />
              <FaceVerifBadge verified={!!selected.faceVerified} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Rider ID", `#${selected.platformDriverId || "-"}`],
                ["Zone", selected.zone],
                ["Vehicle", selected.vehicleType],
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

            <div className="bg-teal-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                Darb Face Verification
              </p>
              <div className="flex items-center gap-2">
                <Camera size={14} className="text-teal-600" />
                <span className="text-sm text-teal-800">
                  {selected.faceVerified
                    ? "Selfie captured & matched at last clock-in"
                    : "Not yet verified - Android agent required"}
                </span>
              </div>
              {selected.lastFaceVerifAt && (
                <p className="text-xs text-teal-600">
                  Last verified: {new Date(selected.lastFaceVerifAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="border-t border-gray-50 pt-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">
                Location
              </p>
              <div className="flex items-center gap-2 text-sm text-secondary">
                <MapPin size={14} />
                <span>{selected.zone || "Zone not assigned"}</span>
              </div>
            </div>

            <div className="border-t border-gray-50 pt-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">
                Contact
              </p>
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Phone size={14} />
                <span>{selected.phone || "-"}</span>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Add Driver Modal */}
      {showAdd && (
        <AddDriverModal
          platform="DELIVEROO"
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
