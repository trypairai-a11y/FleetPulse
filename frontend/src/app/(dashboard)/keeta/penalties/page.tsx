"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { Ban, ChevronRight, AlertTriangle, GraduationCap, FileWarning, ShieldOff, BellRing, CheckCircle2, RotateCcw } from "lucide-react";

type Solution = { label: string; icon: any; tone: string };

function getSolution(p: any): Solution {
  if (p.penaltyStatus === "COMPLETED") return { label: "No action — closed", icon: CheckCircle2, tone: "bg-green-50 text-green-700" };
  if (p.penaltyStatus === "OVERTURNED") return { label: "Refund / restore record", icon: RotateCcw, tone: "bg-blue-50 text-blue-700" };
  switch (p.penaltyType) {
    case "ONLINE_TRAINING":
      return { label: "Assign training module", icon: GraduationCap, tone: "bg-amber-50 text-amber-700" };
    case "VIOLATION_RECORD":
      return { label: "Review & notify courier", icon: FileWarning, tone: "bg-purple-50 text-purple-700" };
    case "ACCOUNT_SUSPENSION":
      return { label: "Suspend account now", icon: ShieldOff, tone: "bg-red-50 text-red-700" };
    case "WARNING":
      return { label: "Send warning notice", icon: BellRing, tone: "bg-yellow-50 text-yellow-700" };
    default:
      return { label: "Review penalty", icon: AlertTriangle, tone: "bg-gray-50 text-gray-700" };
  }
}

const PENALTY_STATUS_COLORS: Record<string, string> = {
  EFFECTIVE: "bg-red-50 text-red-600",
  COMPLETED: "bg-green-50 text-green-600",
  OVERTURNED: "bg-blue-50 text-blue-600",
};

const VIOLATION_TYPE_COLORS: Record<string, string> = {
  LATE_PICKUP: "bg-amber-50 text-amber-600",
  ORDER_REJECTION_TIMEOUT: "bg-purple-50 text-purple-600",
  DROP_OFF_IN_ADVANCE: "bg-red-50 text-red-600",
  ORDER_SLIGHTLY_LATE: "bg-yellow-50 text-yellow-600",
  ORDER_VERY_LATE: "bg-red-100 text-red-700",
  INVALID_DELIVERY_PHOTO: "bg-blue-50 text-blue-600",
  GPS_NOT_UPLOADING: "bg-orange-50 text-orange-600",
};

export default function KeetaPenaltiesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  // Build query params
  const params = new URLSearchParams({ limit: "100" });
  if (filters.search) params.set("search", filters.search);
  if (filters.penaltyType) params.set("penaltyType", filters.penaltyType);
  if (filters.penaltyStatus) params.set("penaltyStatus", filters.penaltyStatus);

  const { data } = useApiGet<any>(`/api/penalties?${params}`);
  const penalties = data?.data || [];

  // Load full detail when a penalty is selected
  const { data: detail } = useApiGet<any>(selected ? `/api/penalties/${selected.id}` : null);

  const effective = penalties.filter((p: any) => p.penaltyStatus === "EFFECTIVE").length;
  const completed = penalties.filter((p: any) => p.penaltyStatus === "COMPLETED").length;
  const overturned = penalties.filter((p: any) => p.penaltyStatus === "OVERTURNED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-keeta" />
        <h1 className="text-xl font-semibold">Keeta</h1>
        <span className="text-secondary/30 text-lg font-light">/</span>
        <span className="text-xl text-secondary font-medium">Penalties</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Penalties" value={penalties.length} icon={Ban} />
        <StatCard title="Effective" value={effective} icon={AlertTriangle} />
        <StatCard title="Completed" value={completed} icon={Ban} />
        <StatCard title="Overturned" value={overturned} icon={Ban} />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "search", type: "search", label: "Search", placeholder: "Search courier name..." },
          {
            key: "penaltyType", type: "select", label: "All Types",
            options: [
              { value: "ONLINE_TRAINING", label: "Online Training" },
              { value: "VIOLATION_RECORD", label: "Violation Record" },
              { value: "ACCOUNT_SUSPENSION", label: "Account Suspension" },
              { value: "WARNING", label: "Warning" },
            ],
          },
          {
            key: "penaltyStatus", type: "select", label: "All Statuses",
            options: [
              { value: "EFFECTIVE", label: "Effective" },
              { value: "COMPLETED", label: "Completed" },
              { value: "OVERTURNED", label: "Overturned" },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Penalty ID</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Value</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Courier</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Violations</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Solution</th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {penalties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-secondary">
                    No penalties found
                  </td>
                </tr>
              ) : (
                penalties.map((p: any) => {
                  const solution = getSolution(p);
                  const SolutionIcon = solution.icon;
                  return (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-secondary font-mono">{p.id.slice(0, 8)}</td>
                    <td className="px-5 py-3 text-sm font-medium">{p.penaltyType}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PENALTY_STATUS_COLORS[p.penaltyStatus] || "bg-gray-100")}>
                        {p.penaltyStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">{p.penaltyValue || "—"}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium">{p.driver?.name || "—"}</p>
                      <p className="text-xs text-secondary">{p.driver?.platformDriverId || ""}</p>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold">{p._count?.violations ?? 0}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md font-medium", solution.tone)}>
                        <SolutionIcon size={12} />
                        {solution.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-secondary">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3"><ChevronRight size={14} className="text-secondary" /></td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail SlidePanel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.penaltyType || "Penalty"}
        subtitle={`Penalty ${selected?.id?.slice(0, 8) || ""}`}
      >
        {selected && (
          <div className="space-y-6">
            {/* Penalty info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Type</p>
                <p className="text-sm font-medium">{selected.penaltyType}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Status</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PENALTY_STATUS_COLORS[selected.penaltyStatus])}>
                  {selected.penaltyStatus}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Value</p>
                <p className="text-sm font-medium">{selected.penaltyValue || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Courier</p>
                <p className="text-sm font-medium">{selected.driver?.name || "—"}</p>
              </div>
              <div className="col-span-2 bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] text-amber-700 uppercase font-semibold">Recommended Action</p>
                <div className="flex items-center gap-2 mt-1">
                  {(() => { const s = getSolution(selected); const I = s.icon; return <><I size={14} className="text-amber-700" /><p className="text-sm font-medium text-amber-900">{s.label}</p></>; })()}
                </div>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">Created</p>
                <p className="text-sm font-medium">
                  {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            {/* Linked violations */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Linked Violations</h3>
              {(detail?.violations || []).length === 0 ? (
                <p className="text-sm text-secondary text-center py-6">No linked violations</p>
              ) : (
                <div className="space-y-2">
                  {(detail?.violations || []).map((v: any) => (
                    <div
                      key={v.id}
                      onClick={() => { setSelected(null); router.push(`/keeta/violations/${v.id}`); }}
                      className="bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", VIOLATION_TYPE_COLORS[v.violationType] || "bg-gray-100")}>
                            {(v.violationType || "").replace(/_/g, " ")}
                          </span>
                          <p className="text-xs text-secondary mt-1">
                            {v.violationTime ? new Date(v.violationTime).toLocaleString() : "—"}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-secondary" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
