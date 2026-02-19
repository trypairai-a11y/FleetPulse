"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAlerts, useUpdateAlert, type AlertItem } from "@/hooks/useAI";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, CheckCircle2, Eye, XCircle,
  ArrowLeft, Filter,
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string; labelAr: string }> = {
  critical: { color: "#E5484D", bg: "#E5484D0D", label: "Critical", labelAr: "حرج" },
  high: { color: "#F59E0B", bg: "#F59E0B0D", label: "High", labelAr: "عالي" },
  medium: { color: "#2563EB", bg: "#2563EB0D", label: "Medium", labelAr: "متوسط" },
  low: { color: "#6B7A8D", bg: "#6B7A8D0D", label: "Low", labelAr: "منخفض" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; labelAr: string }> = {
  active: { color: "#E5484D", bg: "#E5484D0D", label: "Active", labelAr: "نشط" },
  acknowledged: { color: "#F59E0B", bg: "#F59E0B0D", label: "Acknowledged", labelAr: "تم الاطلاع" },
  dismissed: { color: "#6B7A8D", bg: "#6B7A8D0D", label: "Dismissed", labelAr: "مرفوض" },
  resolved: { color: "#12B981", bg: "#12B9810D", label: "Resolved", labelAr: "تم الحل" },
};

export default function AlertsPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAlerts({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    page,
    per_page: 20,
  });
  const updateAlert = useUpdateAlert();

  const alerts = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleAction = async (id: string, status: string) => {
    try {
      await updateAlert.mutateAsync({ id, status });
      toast.success(isAr ? "تم التحديث" : "Alert updated");
    } catch {
      toast.error(isAr ? "خطأ في التحديث" : "Failed to update alert");
    }
  };

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/ai"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F0F2F5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#6B7A8D]" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
            {isAr ? "التنبيهات" : "Alerts"}
          </h1>
          <p className="text-[12px] text-[#6B7A8D] mt-0.5">
            {isAr ? `${total} تنبيه` : `${total} alerts`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-[#6B7A8D]" />
        {/* Status filter */}
        <div className="flex gap-1">
          {["", "active", "acknowledged", "dismissed", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[#2563EB] text-white"
                  : "bg-[#F7F8FA] text-[#6B7A8D] hover:bg-[#E6E9EE]"
              }`}
            >
              {s ? (isAr ? STATUS_CONFIG[s]?.labelAr : STATUS_CONFIG[s]?.label) : (isAr ? "الكل" : "All")}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#E6E9EE] mx-1" />

        {/* Severity filter */}
        <div className="flex gap-1">
          {["", "critical", "high", "medium", "low"].map((s) => (
            <button
              key={s}
              onClick={() => { setSeverityFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                severityFilter === s
                  ? "bg-[#0F2B46] text-white"
                  : "bg-[#F7F8FA] text-[#6B7A8D] hover:bg-[#E6E9EE]"
              }`}
            >
              {s ? (isAr ? SEVERITY_CONFIG[s]?.labelAr : SEVERITY_CONFIG[s]?.label) : (isAr ? "كل الأولويات" : "All severity")}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-[#E6E9EE] p-4">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#12B981] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#0C1825]">
              {isAr ? "لا توجد تنبيهات" : "No alerts found"}
            </p>
            <p className="text-[12px] text-[#6B7A8D] mt-1">
              {isAr ? "كل شي تمام!" : "Everything looks good!"}
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isAr={isAr}
              onAction={handleAction}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#F7F8FA] text-[#6B7A8D] hover:bg-[#E6E9EE] disabled:opacity-50"
          >
            {isAr ? "السابق" : "Previous"}
          </button>
          <span className="text-[12px] text-[#6B7A8D]">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#F7F8FA] text-[#6B7A8D] hover:bg-[#E6E9EE] disabled:opacity-50"
          >
            {isAr ? "التالي" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  isAr,
  onAction,
}: {
  alert: AlertItem;
  isAr: boolean;
  onAction: (id: string, status: string) => void;
}) {
  const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
  const stat = STATUS_CONFIG[alert.status] || STATUS_CONFIG.active;

  return (
    <div className="bg-white rounded-lg border border-[#E6E9EE] p-4 hover:border-[#D0D5DD] transition-colors">
      <div className="flex gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: sev.bg }}
        >
          <AlertTriangle className="w-4.5 h-4.5" style={{ color: sev.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-[#0C1825]">
              {isAr ? (alert.title_ar || alert.title) : alert.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                style={{ color: sev.color, backgroundColor: sev.bg }}
              >
                {isAr ? SEVERITY_CONFIG[alert.severity]?.labelAr : alert.severity}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: stat.color, backgroundColor: stat.bg }}
              >
                {isAr ? stat.labelAr : stat.label}
              </span>
            </div>
          </div>
          <p className="text-[12px] text-[#6B7A8D] mt-1 line-clamp-2">
            {isAr ? (alert.message_ar || alert.message) : alert.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[#9CA3AF]">
              {formatRelativeTime(alert.created_at)}
            </span>
            {alert.status === "active" && (
              <div className="flex gap-1">
                <button
                  onClick={() => onAction(alert.id, "acknowledged")}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-[#2563EB] bg-[#2563EB0D] hover:bg-[#2563EB1A] transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  {isAr ? "اطلعت" : "Acknowledge"}
                </button>
                <button
                  onClick={() => onAction(alert.id, "dismissed")}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-[#6B7A8D] bg-[#6B7A8D0D] hover:bg-[#6B7A8D1A] transition-colors"
                >
                  <XCircle className="w-3 h-3" />
                  {isAr ? "تجاهل" : "Dismiss"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
