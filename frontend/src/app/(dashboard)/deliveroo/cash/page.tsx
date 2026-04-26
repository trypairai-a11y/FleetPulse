"use client";

import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { Banknote, Gift, Download } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatCurrency } from "@/i18n/format";

type CashRow = {
  id: string;
  shiftDate: string;
  status: string;
  codCollectedKwd: number;
  tipsKwd: number;
  totalKwd: number;
  deliveriesCount: number;
  unassignedCount: number;
  driver: { id: string; name: string; phone: string; zone: string | null };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function DeliverooCashPage() {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const limit = 50;

  const params = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.driverId) params.set("driverId", filters.driverId);

  const { data, loading } = useApiGet<{ data: CashRow[]; pagination: any }>(
    `/api/deliveroo/cash/daily?${params}`
  );

  const rows = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const cashTotal = rows.reduce((s, r) => s + r.codCollectedKwd, 0);
  const tipsTotal = rows.reduce((s, r) => s + r.tipsKwd, 0);
  const grandTotal = cashTotal + tipsTotal;

  const exportQuery = new URLSearchParams();
  if (filters.from) exportQuery.set("from", filters.from);
  if (filters.to) exportQuery.set("to", filters.to);
  const exportHref = `${API_BASE}/api/deliveroo/cash/export?${exportQuery.toString()}`;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-deliveroo" />
          <h1 className="text-xl font-semibold">Deliveroo</h1>
          <span className="text-secondary/30 text-lg font-light">/</span>
          <span className="text-xl text-secondary font-medium">{t("deliveroo.cashTitle")}</span>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-lg bg-deliveroo/10 px-3 py-1.5 text-sm font-medium text-deliveroo hover:bg-deliveroo/20"
        >
          <Download size={14} /> {t("ordersPage.exportCsv")}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title={t("deliveroo.cashCollectedShort")} value={formatCurrency(cashTotal, locale)} icon={Banknote} />
        <StatCard title={t("deliveroo.tipsShort")} value={formatCurrency(tipsTotal, locale)} icon={Gift} />
        <StatCard title={t("deliveroo.totalShort")} value={formatCurrency(grandTotal, locale)} />
      </div>

      <FilterBar
        filters={[
          { key: "from", type: "dateRange", label: t("deliveroo.dateRangeLabel"), toKey: "to" },
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
        <PageSkeleton statCards={0} tableRows={8} tableCols={5} />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-5 py-3 text-start text-xs font-medium text-secondary">{t("table.date")}</th>
                <th className="px-5 py-3 text-start text-xs font-medium text-secondary">{t("deliveroo.riderCol")}</th>
                <th className="px-5 py-3 text-start text-xs font-medium text-secondary">{t("table.zone")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("platform.deliveries")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("deliveroo.codKd")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("deliveroo.tipsKd")}</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-secondary">{t("deliveroo.totalKd")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-xs text-gray-400">
                    {t("deliveroo.noCashUploads")}
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
                  <td className="px-5 py-3 text-end tabular-nums">{r.codCollectedKwd.toFixed(3)}</td>
                  <td className="px-5 py-3 text-end tabular-nums">{r.tipsKwd.toFixed(3)}</td>
                  <td className="px-5 py-3 text-end font-medium tabular-nums">
                    {r.totalKwd.toFixed(3)}
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
