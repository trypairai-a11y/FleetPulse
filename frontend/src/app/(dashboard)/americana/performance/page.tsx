"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Store,
  ChevronRight,
  ChevronLeft,
  Car,
  Bike,
} from "lucide-react";

/** Safely convert Prisma Decimal (returned as string) to number */
function n(v: any): number {
  return v != null ? Number(v) : 0;
}

/** Get current month as YYYY-MM */
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Get days in a month */
function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function PositionBadge({ position }: { position: string }) {
  const isCar = position?.toLowerCase() === "car";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        isCar
          ? "bg-blue-50 text-blue-600"
          : "bg-green-50 text-green-600"
      )}
    >
      {isCar ? <Car size={11} /> : <Bike size={11} />}
      {position || "-"}
    </span>
  );
}

export default function AmericanaPerformancePage() {
  const [month, setMonth] = useState(currentMonth());
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);

  const params = new URLSearchParams({ month, limit: "100" });
  if (filters.search) params.set("search", filters.search);
  if (filters.store) params.set("store", filters.store);

  const { data: summary } = useApiGet<any>(
    `/api/americana/orders/summary?month=${month}`
  );
  const { data, loading } = useApiGet<any>(
    `/api/americana/orders?${params}`
  );
  const rows: any[] = data?.data || [];

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  // Build store breakdown from rows
  const storeMap: Record<string, number> = {};
  rows.forEach((r: any) => {
    const store = r.storeName || r.store || "Unknown";
    storeMap[store] = (storeMap[store] || 0) + n(r.totalOrders);
  });
  const storeEntries = Object.entries(storeMap).sort((a, b) => b[1] - a[1]);
  const maxStoreOrders = storeEntries.length
    ? Math.max(...storeEntries.map((e) => e[1]))
    : 1;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-americana" />
        <h1 className="text-xl font-semibold">
          Americana - Store Performance
        </h1>
        <span className="text-sm text-secondary">Al Hazm Express</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Drivers"
          value={summary?.totalDrivers ?? rows.length}
          icon={Users}
        />
        <StatCard
          title="Total Orders"
          value={summary?.totalOrders ?? 0}
          icon={ShoppingBag}
        />
        <StatCard
          title="Avg Orders/Driver"
          value={n(summary?.avgOrdersPerDriver).toFixed(1)}
          icon={TrendingUp}
        />
        <StatCard
          title="Stores Active"
          value={summary?.storesActive ?? Object.keys(storeMap).length}
          icon={Store}
        />
      </div>

      {/* Month Picker & Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm font-medium border-0 focus:outline-none bg-transparent"
          />
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <FilterBar
          filters={[
            {
              key: "search",
              type: "search",
              label: "Search",
              placeholder: "Search driver...",
            },
            {
              key: "store",
              type: "select",
              label: "All Stores",
              options: storeEntries.map(([s]) => ({ value: s, label: s })),
            },
          ]}
          values={filters}
          onChange={(k, v) => setFilters({ ...filters, [k]: v })}
        />
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                  Driver
                </th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                  Emp ID
                </th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                  Store
                </th>
                <th className="text-left text-xs font-medium text-secondary px-5 py-3">
                  Position
                </th>
                <th className="text-right text-xs font-medium text-secondary px-5 py-3">
                  Total Orders
                </th>
                <th className="text-right text-xs font-medium text-secondary px-5 py-3">
                  Daily Average
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-secondary"
                  >
                    {loading
                      ? "Loading..."
                      : "No store performance data found for this month"}
                  </td>
                </tr>
              ) : (
                rows.map((row: any, idx: number) => (
                  <tr
                    key={row.id || idx}
                    onClick={() => setSelected(row)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm font-medium">
                      {row.driver?.name || row.driverName || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {row.employeeId || row.driver?.employeeId || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary">
                      {row.storeName || row.store || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <PositionBadge position={row.position || row.vehicleType || "-"} />
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-mono font-semibold">
                      {row.totalOrders ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-mono text-secondary">
                      {row.dailyAverage != null
                        ? n(row.dailyAverage).toFixed(1)
                        : row.totalOrders != null
                          ? (n(row.totalOrders) / daysInMonth(month)).toFixed(1)
                          : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight size={15} className="text-gray-300" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store Breakdown */}
      {storeEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold mb-4">Store Breakdown</h3>
          <div className="space-y-3">
            {storeEntries.map(([store, total]) => (
              <div key={store} className="flex items-center gap-3">
                <span className="text-sm text-secondary w-40 truncate shrink-0">
                  {store}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-americana h-3 rounded-full transition-all"
                    style={{
                      width: `${(total / maxStoreOrders) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-mono font-semibold w-16 text-right shrink-0">
                  {total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected?.driver?.name || selected?.driverName || "Driver Detail"
        }
        subtitle="Americana / Al Hazm Express - Store Performance"
      >
        {selected && (
          <div className="space-y-5">
            {/* Driver Info */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
                Driver
              </p>
              <p className="text-lg font-semibold text-blue-800">
                {selected.driver?.name || selected.driverName || "-"}
              </p>
              <p className="text-sm text-blue-600 font-mono mt-0.5">
                {selected.employeeId || selected.driver?.employeeId || "-"}{" "}
                &middot; {selected.storeName || selected.store || "-"}{" "}
                &middot;{" "}
                <span className="capitalize">
                  {selected.position || selected.vehicleType || "-"}
                </span>
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">
                  Total Orders
                </p>
                <p className="text-xl font-semibold mt-0.5 font-mono">
                  {selected.totalOrders ?? 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium">
                  Daily Average
                </p>
                <p className="text-xl font-semibold mt-0.5 font-mono">
                  {selected.dailyAverage != null
                    ? n(selected.dailyAverage).toFixed(1)
                    : (
                        n(selected.totalOrders) / daysInMonth(month)
                      ).toFixed(1)}
                </p>
              </div>
            </div>

            {/* Daily Order Calendar Grid */}
            {selected.dailyOrders && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">
                  Daily Orders - {month}
                </h3>
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Day labels */}
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div
                      key={i}
                      className="text-center text-[10px] font-medium text-secondary py-1"
                    >
                      {d}
                    </div>
                  ))}
                  {/* Offset for first day of month */}
                  {(() => {
                    const [y, m] = month.split("-").map(Number);
                    const firstDay = new Date(y, m - 1, 1).getDay();
                    const totalDays = daysInMonth(month);
                    const dailyData: Record<string, number> =
                      typeof selected.dailyOrders === "string"
                        ? JSON.parse(selected.dailyOrders)
                        : selected.dailyOrders || {};

                    const cells = [];
                    // Empty cells for offset
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(
                        <div key={`empty-${i}`} className="aspect-square" />
                      );
                    }
                    // Day cells
                    for (let d = 1; d <= totalDays; d++) {
                      const dayKey =
                        `${month}-${String(d).padStart(2, "0")}`;
                      // Try multiple key formats
                      const count =
                        n(dailyData[dayKey]) ||
                        n(dailyData[String(d)]) ||
                        n(dailyData[d]) ||
                        0;
                      cells.push(
                        <div
                          key={d}
                          className={cn(
                            "aspect-square rounded-lg flex flex-col items-center justify-center text-[10px]",
                            count === 0
                              ? "bg-red-50 text-red-400"
                              : count > 25
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-50 text-gray-600"
                          )}
                        >
                          <span className="font-medium">{d}</span>
                          <span className="font-mono font-semibold text-[11px]">
                            {count}
                          </span>
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-secondary">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-50 border border-red-100" />
                    0 orders
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-gray-50 border border-gray-100" />
                    1-25 orders
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-50 border border-green-100" />
                    25+ orders
                  </div>
                </div>
              </div>
            )}

            {/* Store Breakdown for this driver */}
            {selected.storeBreakdown && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">
                  Store Breakdown
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const breakdown: Record<string, number> =
                      typeof selected.storeBreakdown === "string"
                        ? JSON.parse(selected.storeBreakdown)
                        : selected.storeBreakdown || {};
                    const entries = Object.entries(breakdown).sort(
                      (a, b) => b[1] - a[1]
                    );
                    const max = entries.length
                      ? Math.max(...entries.map((e) => e[1]))
                      : 1;
                    return entries.map(([store, total]) => (
                      <div key={store} className="flex items-center gap-3">
                        <span className="text-xs text-secondary w-32 truncate shrink-0">
                          {store}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-americana h-2 rounded-full transition-all"
                            style={{
                              width: `${(total / max) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold w-10 text-right shrink-0">
                          {total}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Store", selected.storeName || selected.store || "-"],
                ["Position", selected.position || selected.vehicleType || "-"],
                ["Emp ID", selected.employeeId || selected.driver?.employeeId || "-"],
                ["Month", month],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">
                    {label}
                  </p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
