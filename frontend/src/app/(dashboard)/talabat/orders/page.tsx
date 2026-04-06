"use client";
import { useState, useRef } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  Package, UploadCloud, Sparkles, Banknote,
  ChevronRight, Image as ImageIcon, Clock,
  ArrowUp, ArrowDown, Minus, Receipt, ShoppingBag, Zap,
  MessageCircle, X, Check, AlertCircle, MapPin, TrendingUp,
} from "lucide-react";

type PageTab = "orders" | "deliveries" | "performance";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-xs text-secondary font-mono">—</span>;
  const pctChange = ((current - previous) / previous) * 100;
  const isUp = pctChange > 0;
  const isFlat = Math.abs(pctChange) < 0.5;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium font-mono", {
      "text-green-600": isUp && !isFlat,
      "text-red-500": !isUp && !isFlat,
      "text-secondary": isFlat,
    })}>
      {isFlat ? <Minus size={11} /> : isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(pctChange).toFixed(1)}%
    </span>
  );
}

export default function TalabatOrdersPage() {
  const [pageTab, setPageTab] = useState<PageTab>("orders");
  const [filters, setFilters] = useState<Record<string, string>>({
    dateFrom: new Date().toISOString().split("T")[0],
  });
  const [selected, setSelected] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waText, setWaText] = useState("");
  const [waParsed, setWaParsed] = useState<any[]>([]);
  const [waParsing, setWaParsing] = useState(false);
  const [waImporting, setWaImporting] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waSuccess, setWaSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const params = new URLSearchParams({ platform: "TALABAT", limit: "100" });
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.driver) params.set("search", filters.driver);
  if (filters.zone) params.set("zone", filters.zone);

  const { data, refetch } = useApiGet<any>(`/api/orders?${params}`);
  const { data: summary } = useApiGet<any>(`/api/orders/summary?platform=TALABAT${filters.dateFrom ? `&dateFrom=${filters.dateFrom}` : ""}`);
  const { data: perfSummary } = useApiGet<any>(
    pageTab === "performance"
      ? `/api/talabat/orders/summary?dateFrom=${filters.dateFrom || ""}&dateTo=${filters.dateTo || ""}`
      : null
  );
  const { data: hourlyData } = useApiGet<{ hour: number; orders: number }[]>(
    `/api/talabat/orders/hourly?${filters.dateFrom ? `dateFrom=${filters.dateFrom}` : ""}${filters.dateTo ? `&dateTo=${filters.dateTo}` : ""}`
  );

  // Individual deliveries
  const deliveryParams = new URLSearchParams({ limit: "200" });
  if (filters.dateFrom) deliveryParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) deliveryParams.set("dateTo", filters.dateTo);
  if (filters.driver) deliveryParams.set("driverId", filters.driver);
  const { data: deliveriesData } = useApiGet<any>(
    pageTab === "deliveries" ? `/api/talabat/deliveries?${deliveryParams}` : null
  );
  const { data: deliverySummary } = useApiGet<any>(
    pageTab === "deliveries"
      ? `/api/talabat/deliveries/summary?${filters.dateFrom ? `dateFrom=${filters.dateFrom}` : ""}${filters.dateTo ? `&dateTo=${filters.dateTo}` : ""}`
      : null
  );
  const deliveries = deliveriesData?.data || [];

  const orders = data?.data || [];

  async function handleScreenshotUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("screenshot", file);
      form.append("platform", "TALABAT");
      if (filters.dateFrom) form.append("date", filters.dateFrom);
      await api.post("/api/orders/ocr-import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  async function handleWaParse() {
    if (!waText.trim()) return;
    setWaParsing(true);
    setWaError(null);
    setWaSuccess(null);
    try {
      const { data } = await api.post("/api/orders/parse-whatsapp", { text: waText });
      setWaParsed(data.orders || []);
      if (data.orders.length === 0) {
        setWaError("No orders could be parsed from the text. Make sure each message has: Date, Time, Order number, Source (cash/knet), Cash collected.");
      }
    } catch (e: any) {
      setWaError(e.response?.data?.error || "Failed to parse messages");
    } finally {
      setWaParsing(false);
    }
  }

  async function handleWaImport() {
    if (waParsed.length === 0) return;
    setWaImporting(true);
    setWaError(null);
    try {
      const { data } = await api.post("/api/orders/whatsapp-import", {
        orders: waParsed,
        platform: "TALABAT",
      });
      setWaSuccess(data.message);
      setWaParsed([]);
      setWaText("");
      refetch();
      setTimeout(() => { setWaOpen(false); setWaSuccess(null); }, 1500);
    } catch (e: any) {
      setWaError(e.response?.data?.error || "Failed to import orders");
    } finally {
      setWaImporting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Talabat — Orders</h1>
          <span className="text-sm text-secondary">Wahoo International</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleScreenshotUpload(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => { setWaOpen(true); setWaText(""); setWaParsed([]); setWaError(null); setWaSuccess(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <MessageCircle size={15} className="text-green-600" />
            WhatsApp Import
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
            ) : (
              <UploadCloud size={15} className="text-secondary" />
            )}
            Upload Screenshot
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white">
              <Sparkles size={9} /> AI OCR
            </span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["orders", "deliveries", "performance"] as PageTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setPageTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              pageTab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t === "orders" ? "Orders List" : t === "deliveries" ? "All Deliveries" : "Performance"}
          </button>
        ))}
      </div>

      {/* ── ORDERS LIST TAB ── */}
      {pageTab === "orders" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Total Deliveries"
              value={summary?.totalDeliveries || 0}
              icon={Package}
            />
            <StatCard
              title="Orders / Hour"
              value={summary?.ordersPerHour || 0}
              icon={Clock}
            />
            <StatCard
              title="Cash Collected"
              value={`${(summary?.totalCashKd || 0).toFixed(3)} KD`}
              icon={Banknote}
            />
          </div>

          {/* Orders by Hour Chart */}
          {hourlyData && hourlyData.some((h) => h.orders > 0) && (() => {
            const maxOrders = Math.max(...hourlyData.map((h) => h.orders), 1);
            return (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">
                  Orders by Hour
                </h3>
                <div className="flex items-end gap-1 h-40">
                  {hourlyData.map((h) => (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      {h.orders > 0 && (
                        <span className="text-[9px] font-mono font-medium text-secondary">
                          {h.orders}
                        </span>
                      )}
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-orange-400 to-orange-300 transition-all duration-300 min-w-[8px]"
                        style={{ height: h.orders > 0 ? `${(h.orders / maxOrders) * 100}%` : "0%" }}
                      />
                      <span className="text-[9px] text-secondary font-mono">
                        {h.hour.toString().padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Filters */}
          <FilterBar
            filters={[
              { key: "driver", type: "search", label: "Search", placeholder: "Search driver name..." },
              { key: "dateFrom", type: "date", label: "From" },
              { key: "dateTo", type: "date", label: "To" },
              {
                key: "zone", type: "select", label: "All Zones",
                options: TALABAT_ZONES.map(z => ({ value: z, label: z })),
              },
            ]}
            values={filters}
            onChange={(k, v) => setFilters({ ...filters, [k]: v })}
          />

          {/* Orders Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Zone</th>
                    <th className="text-right text-xs font-medium text-secondary px-5 py-3">Deliveries</th>
                    <th className="text-right text-xs font-medium text-secondary px-5 py-3">Cash (KD)</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-secondary">
                        No order records found.{" "}
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="text-orange-500 hover:underline font-medium"
                        >
                          Upload a screenshot
                        </button>{" "}
                        to import via AI OCR.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelected(order)}
                        className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-5 py-3 text-sm text-secondary">
                          {order.date ? new Date(order.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium">{order.driver?.name || order.driverName || "—"}</td>
                        <td className="px-5 py-3 text-sm text-secondary">{order.zone || "—"}</td>
                        <td className="px-5 py-3 text-sm text-right font-mono font-medium">{order.deliveriesCount ?? "—"}</td>
                        <td className="px-5 py-3 text-sm text-right font-mono text-orange-600">
                          {order.cashCollectedKd != null ? order.cashCollectedKd.toFixed(3) : "—"}
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

          {/* Order Detail Panel */}
          <SlidePanel
            open={!!selected}
            onClose={() => setSelected(null)}
            title={selected?.driver?.name || selected?.driverName || "Order Detail"}
            subtitle={`Talabat / ${selected?.date ? new Date(selected.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : ""}`}
          >
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Date", selected.date ? new Date(selected.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"],
                    ["Zone", selected.zone || "—"],
                    ["Deliveries", selected.deliveriesCount ?? "—"],
                    ["Cash Collected", selected.cashCollectedKd != null ? `${selected.cashCollectedKd.toFixed(3)} KD` : "—"],
                    ["Platform Order ID", selected.platformOrderId || "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Individual Orders */}
                {selected.items && selected.items.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Individual Orders</h3>
                    <div className="space-y-2">
                      {selected.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium">Order #{item.orderId || i + 1}</p>
                            {item.restaurantName && (
                              <p className="text-xs text-secondary mt-0.5">{item.restaurantName}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {item.amount != null && (
                              <p className="text-sm font-mono font-medium">{item.amount.toFixed(3)} KD</p>
                            )}
                            {item.tip != null && (
                              <p className="text-xs text-green-600 font-mono">+{item.tip.toFixed(3)} tip</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Screenshot */}
                {selected.screenshotUrl && (
                  <div>
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Source Screenshot</h3>
                    <a href={selected.screenshotUrl} target="_blank" rel="noreferrer">
                      <img
                        src={selected.screenshotUrl}
                        alt="Order screenshot"
                        className="w-full rounded-xl object-cover max-h-64 border border-gray-100"
                      />
                    </a>
                  </div>
                )}
                {!selected.screenshotUrl && (
                  <div className="flex flex-col items-center gap-2 py-6 bg-gray-50 rounded-xl">
                    <ImageIcon size={24} className="text-gray-300" />
                    <p className="text-xs text-secondary">No screenshot attached</p>
                  </div>
                )}
              </div>
            )}
          </SlidePanel>
        </>
      )}

      {/* ── DELIVERIES TAB ── */}
      {pageTab === "deliveries" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="Total Deliveries"
              value={deliverySummary?.totalDeliveries || 0}
              icon={Package}
            />
            <StatCard
              title="Total Distance"
              value={`${(deliverySummary?.totalDistanceKm || 0).toFixed(1)} km`}
              icon={MapPin}
            />
            <StatCard
              title="Tips"
              value={`${(deliverySummary?.totalTips || 0).toFixed(3)} KD`}
              icon={TrendingUp}
            />
            <StatCard
              title="Total Amount"
              value={`${(deliverySummary?.totalAmount || 0).toFixed(3)} KD`}
              icon={Banknote}
            />
          </div>

          {/* Filters */}
          <FilterBar
            filters={[
              { key: "dateFrom", type: "date", label: "From" },
              { key: "dateTo", type: "date", label: "To" },
            ]}
            values={filters}
            onChange={(k, v) => setFilters({ ...filters, [k]: v })}
          />

          {/* Deliveries Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Order ID</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Code</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Finished At</th>
                    <th className="text-right text-xs font-medium text-secondary px-5 py-3">Distance</th>
                    <th className="text-right text-xs font-medium text-secondary px-5 py-3">Amount</th>
                    <th className="text-right text-xs font-medium text-secondary px-5 py-3">Tip</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-sm text-secondary">
                        No individual deliveries found for this date range.
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((d: any) => {
                      const TypeIcon = d.orderType === "grocery" ? ShoppingBag : d.orderType === "express" ? Zap : Receipt;
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setSelected({ ...d, _type: "delivery" })}
                          className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-3 text-sm font-mono font-medium">{d.platformOrderId}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-600 font-mono">
                              {d.shortCode}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-medium">{d.driver?.name || "—"}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 text-xs text-secondary capitalize">
                              <TypeIcon size={12} />
                              {d.orderType || "food"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-secondary font-mono">
                            {d.finishedAt ? new Date(d.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="px-5 py-3 text-sm text-right font-mono text-secondary">
                            {d.distanceKm != null ? `${Number(d.distanceKm).toFixed(1)} km` : "—"}
                          </td>
                          <td className="px-5 py-3 text-sm text-right font-mono font-medium">
                            {d.amount != null ? `${Number(d.amount).toFixed(3)} KD` : "—"}
                          </td>
                          <td className="px-5 py-3 text-sm text-right font-mono text-green-600">
                            {d.tip != null && Number(d.tip) > 0 ? `+${Number(d.tip).toFixed(3)}` : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                              d.status === "COMPLETED" ? "bg-green-50 text-green-600" :
                              d.status === "CANCELLED" ? "bg-red-50 text-red-500" :
                              "bg-gray-100 text-gray-500"
                            )}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {pageTab === "performance" && (
        <div className="space-y-6">
          {/* Date Filters for Performance */}
          <div className="flex gap-3 items-center">
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <span className="text-sm text-secondary">to</span>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {/* Week-over-Week Comparison Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                title: "Deliveries",
                current: perfSummary?.thisWeek?.deliveries || 0,
                previous: perfSummary?.lastWeek?.deliveries || 0,
                format: (v: number) => String(v),
              },
              {
                title: "Distance (km)",
                current: perfSummary?.thisWeek?.distanceKm || 0,
                previous: perfSummary?.lastWeek?.distanceKm || 0,
                format: (v: number) => v.toFixed(1),
              },
              {
                title: "Tips (KD)",
                current: perfSummary?.thisWeek?.tipsKd || 0,
                previous: perfSummary?.lastWeek?.tipsKd || 0,
                format: (v: number) => v.toFixed(3),
              },
              {
                title: "Cash (KD)",
                current: perfSummary?.thisWeek?.cashKd || 0,
                previous: perfSummary?.lastWeek?.cashKd || 0,
                format: (v: number) => v.toFixed(3),
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-secondary mb-1">{card.title}</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-semibold font-mono">{card.format(card.current)}</p>
                  <ChangeIndicator current={card.current} previous={card.previous} />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-secondary">Last week:</span>
                  <span className="text-xs font-mono text-secondary">{card.format(card.previous)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Top 5 Earners Bar Chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">Top 5 Earners (by Deliveries)</h3>
            {(perfSummary?.topEarners || []).length === 0 ? (
              <p className="text-sm text-secondary py-6 text-center">No performance data available for this period</p>
            ) : (
              <div className="space-y-3">
                {(perfSummary?.topEarners || []).slice(0, 5).map((earner: any, i: number) => {
                  const maxDeliveries = perfSummary?.topEarners?.[0]?.deliveries || 1;
                  const pct = Math.round((earner.deliveries / maxDeliveries) * 100);
                  return (
                    <div key={earner.driverId || i} className="flex items-center gap-3">
                      <div className="w-32 flex-shrink-0">
                        <p className="text-sm font-medium truncate">{earner.driverName || "—"}</p>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="h-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-end pr-2 transition-all duration-500"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-[10px] font-semibold text-white font-mono">
                            {earner.deliveries}
                          </span>
                        </div>
                      </div>
                      <div className="w-20 text-right flex-shrink-0">
                        <p className="text-xs font-mono text-orange-600">{(earner.cashKd || 0).toFixed(3)} KD</p>
                        <p className="text-[10px] font-mono text-green-600">+{(earner.tipsKd || 0).toFixed(3)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WHATSAPP IMPORT MODAL ── */}
      {waOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setWaOpen(false)}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <MessageCircle size={18} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">WhatsApp Import</h2>
                  <p className="text-xs text-secondary">Paste driver messages to import orders</p>
                </div>
              </div>
              <button onClick={() => setWaOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Instructions */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-secondary mb-2">Expected message format (each on its own line):</p>
                <div className="grid grid-cols-5 gap-2">
                  {["Date", "Time of arrival", "Order number", "Source (cash/knet)", "Cash collected"].map((f) => (
                    <div key={f} className="bg-white rounded-lg px-2.5 py-1.5 text-center">
                      <p className="text-[10px] font-medium text-secondary">{f}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <textarea
                value={waText}
                onChange={(e) => { setWaText(e.target.value); setWaParsed([]); setWaError(null); setWaSuccess(null); }}
                placeholder={"04/04/2026\n8:25 PM\nORD-12345\nCash\n5.500\n\n04/04/2026\n9:10 PM\nORD-12346\nKnet\n3.200"}
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 resize-none placeholder:text-gray-300"
              />

              {/* Parse Button */}
              <button
                onClick={handleWaParse}
                disabled={waParsing || !waText.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {waParsing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <MessageCircle size={15} />
                )}
                Parse Messages
              </button>

              {/* Error */}
              {waError && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  {waError}
                </div>
              )}

              {/* Success */}
              {waSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                  <Check size={16} />
                  {waSuccess}
                </div>
              )}

              {/* Parsed Preview */}
              {waParsed.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">
                      Parsed Orders ({waParsed.length})
                    </h3>
                    <button
                      onClick={handleWaImport}
                      disabled={waImporting}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {waImporting ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      Import {waParsed.length} Order{waParsed.length > 1 ? "s" : ""}
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/50">
                          <th className="text-left text-[10px] font-medium text-secondary px-4 py-2 uppercase">Date</th>
                          <th className="text-left text-[10px] font-medium text-secondary px-4 py-2 uppercase">Time</th>
                          <th className="text-left text-[10px] font-medium text-secondary px-4 py-2 uppercase">Order #</th>
                          <th className="text-left text-[10px] font-medium text-secondary px-4 py-2 uppercase">Source</th>
                          <th className="text-right text-[10px] font-medium text-secondary px-4 py-2 uppercase">Cash (KD)</th>
                          <th className="text-left text-[10px] font-medium text-secondary px-4 py-2 uppercase">Driver</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waParsed.map((order: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2.5 text-sm font-mono">{order.date || "—"}</td>
                            <td className="px-4 py-2.5 text-sm font-mono">{order.arrivalTime || "—"}</td>
                            <td className="px-4 py-2.5 text-sm font-mono font-medium">{order.orderNumber || "—"}</td>
                            <td className="px-4 py-2.5">
                              {order.paymentSource ? (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                                  order.paymentSource === "CASH" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                )}>
                                  {order.paymentSource}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right font-mono font-medium text-orange-600">
                              {order.cashCollected != null ? order.cashCollected.toFixed(3) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-secondary truncate max-w-[120px]">{order.driverName || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
