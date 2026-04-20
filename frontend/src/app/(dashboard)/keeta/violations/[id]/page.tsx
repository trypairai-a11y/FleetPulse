"use client";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { ArrowLeft, ShieldAlert, AlertTriangle, Scale } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ESTABLISHED: "bg-red-50 text-red-600",
  UNDER_REVIEW: "bg-amber-50 text-amber-600",
  OVERTURNED: "bg-green-50 text-green-600",
  EXPIRED: "bg-gray-100 text-gray-500",
};

const APPEAL_COLORS: Record<string, string> = {
  NOT_RAISED: "bg-gray-100 text-gray-500",
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-green-50 text-green-600",
  REJECTED: "bg-red-50 text-red-600",
};

const PENALTY_STATUS_COLORS: Record<string, string> = {
  EFFECTIVE: "bg-red-50 text-red-600",
  COMPLETED: "bg-green-50 text-green-600",
  OVERTURNED: "bg-blue-50 text-blue-600",
};

export default function ViolationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: violation, loading } = useApiGet<any>(`/api/violations/${id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-keeta" />
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="text-center py-24 text-secondary">
        <p className="text-lg font-medium">Violation not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-keeta hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const penalties = violation.penalties || [];
  const appeals = violation.appeals || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-keeta" />
          <h1 className="text-xl font-semibold">Violation Detail</h1>
          <span className="text-xs text-secondary font-mono bg-gray-100 px-2 py-1 rounded">{violation.id.slice(0, 12)}</span>
        </div>
      </div>

      {/* ═══ Violation Info Section ═══ */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={18} className="text-keeta" />
          <h2 className="text-lg font-semibold">Violation Information</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">Type</p>
            <p className="text-sm font-semibold">{(violation.violationType || "").replace(/_/g, " ")}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">Status</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", STATUS_COLORS[violation.violationStatus])}>
              {violation.violationStatus}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">1st Appeal</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", APPEAL_COLORS[violation.firstAppealStatus || "NOT_RAISED"])}>
              {violation.firstAppealStatus || "NOT_RAISED"}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">2nd Appeal</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", APPEAL_COLORS[violation.secondAppealStatus || "NOT_RAISED"])}>
              {violation.secondAppealStatus || "NOT_RAISED"}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">Courier</p>
            <p className="text-sm font-medium">{violation.driver?.name || "—"}</p>
            <p className="text-xs text-secondary">{violation.driver?.platformDriverId || ""}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">Vehicle</p>
            <p className="text-sm font-medium">{violation.driver?.vehicleType || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium">Violation Time</p>
            <p className="text-sm font-medium">
              {violation.violationTime ? new Date(violation.violationTime).toLocaleString() : "—"}
            </p>
          </div>
          {violation.taskId && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-secondary uppercase font-medium">Task ID</p>
              <p className="text-sm font-mono">{violation.taskId}</p>
            </div>
          )}
        </div>

        {violation.details && (
          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-secondary uppercase font-medium mb-1">Description</p>
            <p className="text-sm">{violation.details}</p>
          </div>
        )}
      </div>

      {/* ═══ Penalty Info Section ═══ */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-amber-500" />
          <h2 className="text-lg font-semibold">Penalty Information</h2>
          <span className="text-xs text-secondary bg-gray-100 px-2 py-0.5 rounded-full">{penalties.length}</span>
        </div>

        {penalties.length === 0 ? (
          <p className="text-sm text-secondary text-center py-8">No penalties linked to this violation</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Penalty ID</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Type</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Status</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Value</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 text-xs font-mono text-secondary">{p.id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-sm">{p.penaltyType}</td>
                    <td className="px-4 py-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", PENALTY_STATUS_COLORS[p.penaltyStatus] || "bg-gray-100")}>
                        {p.penaltyStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{p.penaltyValue || "—"}</td>
                    <td className="px-4 py-2 text-xs text-secondary">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Appeal Info Section ═══ */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className="text-blue-500" />
          <h2 className="text-lg font-semibold">Appeal History</h2>
          <span className="text-xs text-secondary bg-gray-100 px-2 py-0.5 rounded-full">{appeals.length}</span>
        </div>

        {appeals.length === 0 ? (
          <p className="text-sm text-secondary text-center py-8">No appeals submitted</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Level</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Date</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Status</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Channel</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Reason</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Reviewed At</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {appeals.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-bold text-secondary bg-gray-100 px-1.5 py-0.5 rounded">
                        {a.appealLevel === 2 ? "2ND" : "1ST"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-secondary">
                      {a.appealedAt ? new Date(a.appealedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", APPEAL_COLORS[a.appealStatus] || "bg-gray-100")}>
                        {a.appealStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{a.channel || "—"}</td>
                    <td className="px-4 py-2 text-sm max-w-[200px] truncate">{a.reason || "—"}</td>
                    <td className="px-4 py-2 text-xs text-secondary">
                      {a.reviewedAt ? new Date(a.reviewedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm max-w-[200px] truncate">{a.rejectionNote || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
