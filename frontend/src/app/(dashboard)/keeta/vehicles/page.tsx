"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Car,
  Bike,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  Archive,
  CalendarDays,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  MAINTENANCE: "bg-orange-50 text-orange-600",
  SPARE: "bg-blue-50 text-blue-600",
  SUSPENDED: "bg-red-50 text-red-600",
};

function VehicleTypeIcon({ type }: { type: string }) {
  return type?.toLowerCase().includes("motorcycle") || type?.toLowerCase().includes("bike") ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-600">
      <Bike size={11} /> Motorcycle
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600">
      <Car size={11} /> Car
    </span>
  );
}

function InspectionDue({ date }: { date: string | null }) {
  if (!date) return <span className="text-secondary text-sm">—</span>;
  const d = new Date(date);
  const now = new Date();
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return (
    <span
      className={cn("text-xs font-medium", {
        "text-red-500": daysLeft <= 7,
        "text-orange-500": daysLeft > 7 && daysLeft <= 30,
        "text-secondary": daysLeft > 30,
      })}
    >
      {d.toLocaleDateString()}
      {daysLeft <= 30 && (
        <span className="ml-1 text-[10px]">({daysLeft}d)</span>
      )}
    </span>
  );
}

export default function KeetaVehiclesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  const params = new URLSearchParams({ company: "KEETA", limit: "100" });
  if (filters.type) params.set("vehicleType", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const { data, loading } = useApiGet<any>(`/api/vehicles?${params}`);
  const vehicles: any[] = data?.data || [];

  // Fleet stats
  const total = vehicles.length;
  const motorcycles = vehicles.filter(
    (v) => v.type?.toLowerCase().includes("motorcycle") || v.type?.toLowerCase().includes("bike")
  ).length;
  const cars = total - motorcycles;
  const spares = vehicles.filter((v) => v.status === "SPARE").length;
  const inMaintenance = vehicles.filter((v) => v.status === "MAINTENANCE").length;
  const overdue = vehicles.filter((v) => {
    if (!v.nextInspectionDate) return false;
    return new Date(v.nextInspectionDate) < new Date();
  }).length;

  const motoPercent = total > 0 ? Math.round((motorcycles / total) * 100) : 70;
  const carPercent = 100 - motoPercent;

  const columns = [
    {
      key: "plateNumber",
      label: "Plate",
      render: (v: string) => <span className="font-mono font-semibold text-sm">{v || "—"}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (v: string) => <VehicleTypeIcon type={v} />,
    },
    {
      key: "make",
      label: "Make",
      render: (v: string) => <span className="text-sm">{v || "—"}</span>,
    },
    {
      key: "model",
      label: "Model",
      render: (v: string) => <span className="text-sm">{v || "—"}</span>,
    },
    {
      key: "driver",
      label: "Assigned Driver",
      render: (_: any, r: any) => (
        <span className="text-sm">{r.driver?.name || r.assignedDriverName || "Unassigned"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_STYLES[v] || "bg-gray-100 text-gray-500")}>
          {v || "—"}
        </span>
      ),
    },
    {
      key: "nextInspectionDate",
      label: "Next Inspection",
      render: (v: string) => <InspectionDue date={v} />,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-keeta" />
        <h1 className="text-xl font-semibold">Keeta — Vehicles</h1>
        <span className="text-sm text-secondary">Sidra</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Fleet" value={total} icon={Car} />
        <StatCard title="Spare Pool" value={spares} icon={Archive} trend="Available spare vehicles" />
        <StatCard title="In Maintenance" value={inMaintenance} icon={Wrench} highlight={inMaintenance > 3} />
        <StatCard title="Inspection Overdue" value={overdue} icon={AlertTriangle} highlight={overdue > 0} />
      </div>

      {/* Motorcycle / Car ratio bar */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Fleet Type Ratio</p>
          <div className="flex items-center gap-4 text-xs text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              Motorcycle — {motorcycles} ({motoPercent}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Car — {cars} ({carPercent}%)
            </span>
          </div>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden bg-blue-100 flex">
          <div
            className="h-full bg-orange-400 transition-all duration-500 rounded-l-full"
            style={{ width: `${motoPercent}%` }}
          />
          <div
            className="h-full bg-blue-400 transition-all duration-500 rounded-r-full flex-1"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span>Target: 70% motorcycle / 30% car</span>
          {Math.abs(motoPercent - 70) <= 5 && (
            <span className="flex items-center gap-1 text-green-600">
              <ShieldCheck size={12} /> Within target
            </span>
          )}
          {motoPercent < 65 && (
            <span className="flex items-center gap-1 text-orange-500">
              <AlertTriangle size={12} /> Below motorcycle target
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search plate, driver…" },
          {
            key: "type",
            type: "select",
            label: "All Types",
            options: [
              { value: "MOTORCYCLE", label: "Motorcycle" },
              { value: "CAR", label: "Car" },
            ],
          },
          {
            key: "status",
            type: "select",
            label: "All Statuses",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "SPARE", label: "Spare" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={vehicles}
        onRowClick={setSelected}
        emptyMessage={loading ? "Loading…" : "No vehicles found"}
      />

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.plateNumber || "Vehicle Detail"}
        subtitle="Keeta / Sidra"
      >
        {selected && (
          <div className="space-y-5">
            {/* Core info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Plate Number", selected.plateNumber],
                ["Type", selected.type],
                ["Make", selected.make],
                ["Model", selected.model],
                ["Year", selected.year],
                ["Color", selected.color],
                ["Status", selected.status],
                ["Assigned Driver", selected.driver?.name || selected.assignedDriverName || "Unassigned"],
                ["Next Inspection", selected.nextInspectionDate ? new Date(selected.nextInspectionDate).toLocaleDateString() : "—"],
                ["Insurance Expiry", selected.insuranceExpiry ? new Date(selected.insuranceExpiry).toLocaleDateString() : "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {/* Inspection Log */}
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
                <ShieldCheck size={13} /> Inspection Log
              </p>
              {selected.inspections?.length > 0 ? (
                <div className="space-y-2">
                  {selected.inspections.map((ins: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                      <CalendarDays size={14} className="text-secondary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{new Date(ins.date).toLocaleDateString()}</p>
                        <p className="text-xs text-secondary">{ins.result || ins.notes || "Passed"}</p>
                      </div>
                      <span className={cn("ml-auto text-xs font-medium px-2 py-0.5 rounded-md shrink-0", ins.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                        {ins.passed ? "Pass" : "Fail"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary py-4 text-center bg-gray-50 rounded-xl">No inspection records</p>
              )}
            </div>

            {/* Maintenance History */}
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
                <Wrench size={13} /> Maintenance History
              </p>
              {selected.maintenanceHistory?.length > 0 ? (
                <div className="space-y-2">
                  {selected.maintenanceHistory.map((m: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                      <Wrench size={14} className="text-secondary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.type || m.description || "Service"}</p>
                        <p className="text-xs text-secondary">{new Date(m.date).toLocaleDateString()} · {m.cost ? `KWD ${m.cost}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary py-4 text-center bg-gray-50 rounded-xl">No maintenance records</p>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
