"use client";

import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { Package, PackageX, Upload } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatCurrency } from "@/i18n/format";

type MetricRow = {
  id: string;
  shiftDate: string;
  codCollectedKwd: string;
  tipsKwd: string;
  deliveriesCount: number;
  unassignedCount: number;
  status: string;
  hourlyBuckets: number[] | null;
  driver: { id: string; name: string; phone: string; zone: string | null };
};

export default function DeliverooOrdersPage() {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const limit = 50;

  const params = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.driverId) params.set("driverId", filters.driverId);
  if (filters.status) params.set("status", filters.status);

  const { data, loading } = useApiGet<{ data: MetricRow[]; pagination: any }>(
    `/api/deliveroo/metrics?${params}`
  );

  const rows = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const deliveriesTotal = rows.reduce((s, r) => s + (r.deliveriesCount ?? 0), 0);
  const unassignedTotal = rows.reduce((s, r) => s + (r.unassignedCount ?? 0), 0);
  const uploads = rows.length;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-deliveroo" />
        <h1 className="text-xl font-semibold">Deliveroo</h1>
        <span className="text-secondary/30 text-lg font-light">/</span>
        <span className="text-xl text-secondary font-medium">{t("deliveroo.ordersTitle")}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title={t("deliveroo.deliveriesSelected")} value={deliveriesTotal} icon={Package} />
        <StatCard title={t("deliveroo.unassignedSelected")} value={unassignedTotal} icon={PackageX} />
        <StatCard title={t("deliveroo.uploads")} value={uploads} icon={Upload} />
      </div>

      <FilterBar
        filters={[
          { key: "from", type: "dateRange", label: t("deliveroo.dateRangeLabel"), toKey: "to" },
          {
            key: "status",
            type: "select",
            label: t("deliveroo.allStatuses"),
            options: [
              { value: "PARSED", label: t("deliveroo.statusParsed") },
              { value: "APPROVED", label: t("deliveroo.statusApproved") },
              { value: "PENDING_REVIEW", label: t("deliveroo.statusPendingReview") },
              { value: "REJECTED", label: t("deliveroo.statusRejected") },
            ],
          },
        ]}
        values={filters}
        onChange={(k, v) => {
          setFilters((prev) => ({ ...prev, [k]: v }));
          setPage(1);
        }}
        onClear={() => {
          setFilters({});
          setPage(1);
        }}
        defaultValues={{}}
      />

      {loading && rows.length === 0 ? (
        <PageSkeleton statCards={0} tableRows={8} tableCols={6} />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-5 py-3 text-start text-xs font-medium text-secondary">{t("table.date")}</th>
                <th className="px-5 py-3 text-start text-xs font-medium text-secondary">{t("deliveroo.riderCol")}</th>
                <th className="px-5 py-3 text-start text-xs font-medium text-secondary">{t("table.zone")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("platform.deliveries")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("deliveroo.unassigned")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("deliveroo.cashKd")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("deliveroo.tipsKd")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-xs text-gray-400">
                    {t("deliveroo.noMetricsInRange")}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 text-sm last:border-0 hover:bg-gray-50/40"
                >
                  <td className="px-5 py-3 text-secondary">
                    {formatDate(r.shiftDate, locale)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/deliveroo/drivers/${r.driver.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.driver.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-secondary">{r.driver.zone ?? "—"}</td>
                  <td className="px-5 py-3 text-end tabular-nums">{r.deliveriesCount}</td>
                  <td className="px-5 py-3 text-end tabular-nums">
                    {r.unassignedCount > 0 ? (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-red-600">
                        {r.unassignedCount}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-5 py-3 text-end tabular-nums">
                    {Number(r.codCollectedKwd).toFixed(3)}
                  </td>
                  <td className="px-5 py-3 text-end tabular-nums">
                    {Number(r.tipsKwd).toFixed(3)}
                  </td>
                  <td className="px-5 py-3 text-end">
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-secondary disabled:opacity-40"
          >
            {t("actions.previous")}
          </button>
          <span className="text-xs text-secondary">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-secondary disabled:opacity-40"
          >
            {t("actions.next")}
          </button>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, string> = {
    PARSED: "bg-blue-50 text-blue-600",
    APPROVED: "bg-green-50 text-green-600",
    PENDING_REVIEW: "bg-amber-50 text-amber-600",
    REJECTED: "bg-gray-100 text-gray-500",
  };
  const label = (() => {
    switch (status) {
      case "PARSED": return t("deliveroo.statusParsed");
      case "APPROVED": return t("deliveroo.statusApproved");
      case "PENDING_REVIEW": return t("deliveroo.statusPendingReview");
      case "REJECTED": return t("deliveroo.statusRejected");
      default: return status.replace(/_/g, " ");
    }
  })();
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100"}`}>
      {label}
    </span>
  );
}
