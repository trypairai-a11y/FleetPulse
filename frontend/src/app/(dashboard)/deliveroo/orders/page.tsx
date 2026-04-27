"use client";

import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import { PageSkeleton } from "@/components/shared/Skeleton";
import PlatformPerformanceTab from "@/components/platform/PlatformPerformanceTab";
import { cn } from "@/lib/cn";
import { Briefcase, Package, PackageX, Upload } from "lucide-react";
import Link from "next/link";

type PageTab = "orders" | "performance";

const DELIVEROO_ZONES = [
  "Hawally", "Salmiya", "Jabriya", "Mishref", "Bayan", "Salwa", "Mahboula", "Fahaheel", "Ardiya",
];

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
  const [pageTab, setPageTab] = useState<PageTab>("orders");
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
        <span className="text-xl text-secondary font-medium">Orders</span>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["orders", "performance"] as PageTab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setPageTab(tabKey)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              pageTab === tabKey ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {tabKey === "orders" ? "Orders List" : "Performance"}
          </button>
        ))}
      </div>

      {pageTab === "performance" ? (
        <PlatformPerformanceTab
          platform="DELIVEROO"
          zones={DELIVEROO_ZONES}
          filters={filters}
          setFilters={setFilters}
        />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="Deliveries (selected)" value={deliveriesTotal} icon={Package} />
        <StatCard title="Unassigned (selected)" value={unassignedTotal} icon={PackageX} />
        <StatCard title="Uploads" value={uploads} icon={Upload} />
      </div>

      <FilterBar
        filters={[
          { key: "from", type: "dateRange", label: "Date range", toKey: "to" },
          {
            key: "status",
            type: "select",
            label: "All statuses",
            options: [
              { value: "PARSED", label: "Parsed" },
              { value: "APPROVED", label: "Approved" },
              { value: "PENDING_REVIEW", label: "Pending review" },
              { value: "REJECTED", label: "Rejected" },
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
                <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Rider</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Zone</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Deliveries</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Unassigned</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Cash (KD)</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Tips (KD)</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-xs text-gray-400">
                    No ingested metrics in this range yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 text-sm last:border-0 hover:bg-gray-50/40"
                >
                  <td className="px-5 py-3 text-secondary">
                    {new Date(r.shiftDate).toLocaleDateString()}
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
                  <td className="px-5 py-3 text-right tabular-nums">{r.deliveriesCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {r.unassignedCount > 0 ? (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-red-600">
                        {r.unassignedCount}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {Number(r.codCollectedKwd).toFixed(3)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {Number(r.tipsKwd).toFixed(3)}
                  </td>
                  <td className="px-5 py-3 text-right">
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
            Previous
          </button>
          <span className="text-xs text-secondary">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PARSED: "bg-blue-50 text-blue-600",
    APPROVED: "bg-green-50 text-green-600",
    PENDING_REVIEW: "bg-amber-50 text-amber-600",
    REJECTED: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
