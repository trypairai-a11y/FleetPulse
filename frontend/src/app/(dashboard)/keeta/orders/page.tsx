"use client";
import { useRef, useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Upload,
  Image as ImageIcon,
  Package,
  TrendingUp,
  Clock,
  Route,
  CreditCard,
  Info,
} from "lucide-react";

const ZONES = ["Hawally", "Salmiya", "Ardiya", "Jahra", "Khiran", "Mishref", "Sabah Al Salem", "Abu Halifa", "Fahaheel", "Mangaf"];

export default function KeetaOrdersPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);
  const ssRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams({ platform: "KEETA", limit: "100" });
  if (filters.date) { params.set("dateFrom", filters.date); params.set("dateTo", filters.date); }
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.driver) params.set("search", filters.driver);

  const { data, loading } = useApiGet<any>(`/api/orders?${params}`);
  const orders: any[] = data?.data || [];

  // Aggregate stats
  const totalOrders = orders.reduce((acc, o) => acc + (o.orderCount ?? o.orders ?? 1), 0);
  const avgOnTime = orders.length
    ? Math.round(orders.reduce((acc, o) => acc + (o.onTimeRate ?? 0), 0) / orders.length)
    : 0;
  const totalDistance = orders.reduce((acc, o) => acc + (o.distanceKm ?? o.distance ?? 0), 0);

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (v: string) => (
        <span className="text-sm">{v ? new Date(v).toLocaleDateString() : "—"}</span>
      ),
    },
    {
      key: "driver",
      label: "Driver",
      render: (_: any, r: any) => (
        <span className="font-medium text-sm">{r.driver?.name || r.driverName || "—"}</span>
      ),
    },
    {
      key: "zone",
      label: "Zone",
      render: (_: any, r: any) => (
        <span className="text-sm text-secondary">{r.driver?.zone || r.zone || "—"}</span>
      ),
    },
    {
      key: "orderCount",
      label: "Orders",
      render: (_: any, r: any) => (
        <span className="text-sm font-semibold">{r.orderCount ?? r.orders ?? "—"}</span>
      ),
    },
    {
      key: "distanceKm",
      label: "Distance",
      render: (_: any, r: any) => {
        const d = r.distanceKm ?? r.distance;
        return <span className="text-sm text-secondary">{d != null ? `${Number(d).toFixed(1)} km` : "—"}</span>;
      },
    },
    {
      key: "onTimeRate",
      label: "On-Time Rate",
      render: (v: number) => {
        const rate = v ?? 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", rate >= 90 ? "bg-green-500" : rate >= 70 ? "bg-orange-400" : "bg-red-400")}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="text-xs text-secondary">{rate}%</span>
          </div>
        );
      },
    },
    {
      key: "source",
      label: "Source",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-blue-50 text-blue-600": v === "API",
          "bg-yellow-50 text-yellow-700": v === "XLSX",
          "bg-purple-50 text-purple-600": v === "SCREENSHOT",
          "bg-gray-100 text-gray-500": !v,
        })}>
          {v || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-keeta" />
          <h1 className="text-xl font-semibold">Keeta — Orders</h1>
          <span className="text-sm text-secondary">Sidra</span>
        </div>
        {/* Import buttons */}
        <div className="flex items-center gap-2">
          {/* XLSX Upload */}
          <input
            ref={xlsxRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setXlsxFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => xlsxRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-keeta/40 bg-keeta/5 text-keeta text-sm font-medium hover:bg-keeta/10 transition-colors"
          >
            <Upload size={15} />
            {xlsxFile ? xlsxFile.name : "Upload Keeta Export XLSX"}
          </button>
          {/* Screenshot Upload */}
          <input
            ref={ssRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => ssRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ImageIcon size={15} />
            {screenshotFile ? screenshotFile.name : "Upload Screenshot"}
          </button>
        </div>
      </div>

      {/* Cashless notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-700">Keeta is cashless</p>
          <p className="text-xs text-blue-500 mt-0.5">
            All Keeta orders are paid digitally. There is no cash collection or cash due tracking for this platform.
          </p>
        </div>
        <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded-md shrink-0">
          <CreditCard size={11} className="inline mr-1" />
          Digital Only
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={totalOrders} icon={Package} />
        <StatCard title="Active Drivers" value={data?.meta?.activeDrivers ?? orders.length} icon={TrendingUp} />
        <StatCard title="Avg On-Time Rate" value={`${avgOnTime}%`} icon={Clock} highlight={avgOnTime < 70} />
        <StatCard title="Total Distance" value={`${totalDistance.toFixed(0)} km`} icon={Route} />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[
          { key: "date", type: "date", label: "Date" },
          { key: "zone", type: "select", label: "All Zones", options: ZONES.map((z) => ({ value: z, label: z })) },
          { key: "driver", type: "search", label: "Driver", placeholder: "Search driver…" },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* Pending import banners */}
      {(xlsxFile || screenshotFile) && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-3">
          <Info size={15} className="text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">
            {xlsxFile && <span>Ready to import: <strong>{xlsxFile.name}</strong>. </span>}
            {screenshotFile && <span>Screenshot queued: <strong>{screenshotFile.name}</strong>. </span>}
            Click <strong>Confirm Import</strong> to process.
          </p>
          <button className="ml-auto px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-xl hover:bg-yellow-600 transition-colors shrink-0">
            Confirm Import
          </button>
          <button
            onClick={() => { setXlsxFile(null); setScreenshotFile(null); }}
            className="text-xs text-yellow-600 hover:underline shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        onRowClick={setSelected}
        emptyMessage={loading ? "Loading…" : "No orders found for the selected filters"}
      />

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || "Order Detail"}
        subtitle="Keeta / Sidra"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", selected.date ? new Date(selected.date).toLocaleDateString() : "—"],
                ["Zone", selected.driver?.zone || selected.zone || "—"],
                ["Order Count", selected.orderCount ?? selected.orders ?? "—"],
                ["Distance", selected.distanceKm != null ? `${Number(selected.distanceKm).toFixed(1)} km` : "—"],
                ["On-Time Rate", selected.onTimeRate != null ? `${selected.onTimeRate}%` : "—"],
                ["Source", selected.source || "—"],
                ["Platform", "KEETA"],
                ["Payment", "Digital (Cashless)"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-[10px] text-secondary uppercase font-medium mb-1">Notes</p>
                <p className="text-sm">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
