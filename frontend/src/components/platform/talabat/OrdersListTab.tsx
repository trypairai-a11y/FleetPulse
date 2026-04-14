"use client";
import React, { useState, useRef, useMemo } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import api from "@/lib/api";
import {
  Package, UploadCloud, Sparkles, Banknote,
  ChevronRight, Clock,
  ArrowUp, ArrowDown, Minus, MapPin,
  MessageCircle, X, Check, AlertCircle,
  Download, ChevronsLeft, ChevronsRight, ChevronLeft,
} from "lucide-react";

type SortField = "date" | "driver" | "deliveries" | "cash" | "zone";
type SortDir = "asc" | "desc";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

/* ─── Sub-components ─── */

function SortableHeader({
  label, field, currentSort, currentDir, onSort, align = "left",
}: {
  label: string; field: SortField; currentSort: SortField; currentDir: SortDir;
  onSort: (f: SortField) => void; align?: "left" | "right";
}) {
  const active = currentSort === field;
  return (
    <th
      className={cn(
        "text-xs font-medium text-secondary px-5 py-3 cursor-pointer select-none hover:text-foreground transition-colors group",
        align === "right" ? "text-right" : "text-left"
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {align === "right" && active && (
          currentDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        )}
        {label}
        {align === "left" && active && (
          currentDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        )}
        {!active && (
          <span className="opacity-0 group-hover:opacity-40 transition-opacity">
            <ArrowDown size={11} />
          </span>
        )}
      </span>
    </th>
  );
}

function Pagination({
  page, totalPages, onPageChange,
}: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronsLeft size={16} />
      </button>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-xs text-secondary">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
              p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-secondary"
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}

/* ─── Props ─── */

interface OrdersListTabProps {
  filters: Record<string, string>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  companyOptions: { value: string; label: string }[];
}

/* ─── Main component ─── */

export default function OrdersListTab({
  filters,
  setFilters,
  uploading,
  setUploading,
  fileRef,
  companyOptions,
}: OrdersListTabProps) {
  const [selected, setSelected] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // WhatsApp import state
  const [waOpen, setWaOpen] = useState(false);
  const [waText, setWaText] = useState("");
  const [waParsed, setWaParsed] = useState<any[]>([]);
  const [waParsing, setWaParsing] = useState(false);
  const [waImporting, setWaImporting] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waSuccess, setWaSuccess] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  }

  // Individual orders (flat list)
  const ordersParams = new URLSearchParams({ platform: "TALABAT", limit: "50", page: String(currentPage) });
  if (filters.dateFrom) ordersParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) ordersParams.set("dateTo", filters.dateTo);
  if (filters.search) ordersParams.set("search", filters.search);
  else if (filters.driverId) ordersParams.set("search", filters.driverId);
  if (filters.zone) ordersParams.set("zone", filters.zone);
  if (filters.companyId) ordersParams.set("companyId", filters.companyId);
  if (filters.timeFrom) ordersParams.set("timeFrom", filters.timeFrom);
  if (filters.timeTo) ordersParams.set("timeTo", filters.timeTo);
  ordersParams.set("sortBy", sortField);
  ordersParams.set("sortOrder", sortDir);

  const { data: ordersData, refetch } = useApiGet<any>(`/api/orders?${ordersParams}`);
  const orders = ordersData?.data || [];
  const ordersPagination = ordersData?.pagination;

  const { data: summary } = useApiGet<any>(
    `/api/orders/summary?platform=TALABAT${filters.dateFrom ? `&dateFrom=${filters.dateFrom}` : ""}${filters.dateTo ? `&dateTo=${filters.dateTo}` : ""}`
  );

  const { data: hourlyData } = useApiGet<{ hour: number; orders: number }[]>(
    `/api/talabat/orders/hourly?${filters.dateFrom ? `dateFrom=${filters.dateFrom}` : ""}${filters.dateTo ? `&dateTo=${filters.dateTo}` : ""}`
  );

  // Drivers list for dropdown
  const { data: driversList } = useApiGet<any[]>("/api/orders/drivers?platform=TALABAT");
  const driverOptions = useMemo(
    () => (driversList || []).map((d: any) => ({ value: d.name, label: d.name })),
    [driversList]
  );

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

  function handleExportCsv() {
    const params = new URLSearchParams({ platform: "TALABAT" });
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.zone) params.set("zone", filters.zone);
    if (filters.search) params.set("search", filters.search);
    else if (filters.driverId) params.set("search", filters.driverId);
    if (filters.companyId) params.set("companyId", filters.companyId);
    window.open(`${api.defaults.baseURL || ""}/api/orders/export-csv?${params}`, "_blank");
  }

  // Expose handleScreenshotUpload & handleExportCsv to parent via fileRef onChange
  // The parent passes fileRef so the header buttons work across components.

  const zones = summary?.zones || [];

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Orders"
          value={summary?.totalDeliveries || 0}
          icon={Package}
        />
        <StatCard
          title="UTR"
          value={summary?.ordersPerHour || 0}
          icon={Clock}
          trend={summary?.ordersPerHour === 0 ? "No session data" : undefined}
        />
        <StatCard
          title="Cash Collected"
          value={`${(summary?.totalCashKd || 0).toFixed(3)} KD`}
          icon={Banknote}
        />
      </div>

      {/* Zone Breakdown */}
      {zones.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {zones.map((z: any) => (
            <div
              key={z.zone}
              className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-50 flex-shrink-0"
            >
              <MapPin size={13} className="text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">{z.zone}</p>
                <p className="text-[10px] text-secondary font-mono">
                  {z.deliveries} orders · {z.cash.toFixed(3)} KD
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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
          {
            key: "search", type: "search", label: "Search",
            placeholder: "Search by driver or order ID\u2026",
          },
          {
            key: "driverId", type: "driver-search", label: "Driver",
            placeholder: "Search driver\u2026",
            options: driverOptions,
          },
          { key: "dateFrom", type: "date", label: "From" },
          { key: "dateTo", type: "date", label: "To" },
          { key: "timeFrom", type: "time", label: "From Time" },
          { key: "timeTo", type: "time", label: "To Time" },
          {
            key: "zone", type: "select", label: "All Zones",
            options: TALABAT_ZONES.map(z => ({ value: z, label: z })),
          },
          {
            key: "companyId", type: "select", label: "All Companies",
            options: companyOptions,
          },
        ]}
        values={filters}
        onChange={(k, v) => { setFilters((prev) => ({ ...prev, [k]: v })); setCurrentPage(1); }}
        defaultValues={{ dateFrom: new Date().toISOString().split("T")[0] }}
        onClear={() => { setFilters({ dateFrom: new Date().toISOString().split("T")[0] }); setCurrentPage(1); }}
      />

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <SortableHeader label="Date" field="date" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                <th className="text-xs font-medium text-secondary px-5 py-3 text-left">Time</th>
                <th className="text-xs font-medium text-secondary px-5 py-3 text-left">Order ID</th>
                <SortableHeader label="Driver" field="driver" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                <th className="text-xs font-medium text-secondary px-5 py-3 text-left">Batch</th>
                <th className="text-xs font-medium text-secondary px-5 py-3 text-left">Company</th>
                <th className="text-xs font-medium text-secondary px-5 py-3 text-left">Zone</th>
                <th className="text-xs font-medium text-secondary px-5 py-3 text-left">Payment</th>
                <SortableHeader label="Cash (KD)" field="cash" currentSort={sortField} currentDir={sortDir} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-secondary">
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
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelected(order)}
                  >
                    <td className="px-5 py-3 text-sm text-secondary whitespace-nowrap">
                      {order.date ? new Date(order.date).toLocaleDateString([], { month: "short", day: "numeric" }) : "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-secondary whitespace-nowrap">
                      {order.arrivalTime
                        ? new Date(order.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono whitespace-nowrap">
                      {order.orderNumber || "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium whitespace-nowrap">
                      {order.driver?.name ? cleanDriverName(order.driver.name) : "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary text-center">
                      {order.batchNumber || order.driver?.batchNumber || "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary whitespace-nowrap">
                      {order.companyName || order.driver?.company?.name || "\u2014"}
                    </td>
                    <td className="px-5 py-3 text-sm text-secondary whitespace-nowrap">
                      {order.zone || order.driver?.zone || "\u2014"}
                    </td>
                    <td className="px-5 py-3">
                      {order.paymentSource ? (
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                          order.paymentSource === "CASH" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {order.paymentSource}
                        </span>
                      ) : (
                        <span className="text-sm text-secondary">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-mono text-orange-600 whitespace-nowrap">
                      {order.paymentSource === "CASH" && order.cashCollectedKd > 0
                        ? `${order.cashCollectedKd.toFixed(3)}`
                        : "\u2014"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {ordersPagination && ordersPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-secondary">
              Showing {((ordersPagination.page - 1) * ordersPagination.limit) + 1}&ndash;{Math.min(ordersPagination.page * ordersPagination.limit, ordersPagination.total)} of {ordersPagination.total} orders
            </p>
            <Pagination
              page={ordersPagination.page}
              totalPages={ordersPagination.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Order Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name ? cleanDriverName(selected.driver.name) : "Order Detail"}
        subtitle={`Talabat / ${selected?.date ? new Date(selected.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : ""}`}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Order #", selected.orderNumber || "\u2014"],
                ["Date", selected.date ? new Date(selected.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "\u2014"],
                ["Time", selected.arrivalTime ? new Date(selected.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "\u2014"],
                ["Driver", selected.driver?.name ? cleanDriverName(selected.driver.name) : "\u2014"],
                ["Batch", selected.batchNumber || selected.driver?.batchNumber || "\u2014"],
                ["Company", selected.companyName || selected.driver?.company?.name || "\u2014"],
                ["Zone", selected.zone || selected.driver?.zone || "\u2014"],
                ["Payment", selected.paymentSource || "\u2014"],
                ["Cash (KD)", selected.paymentSource === "CASH" ? `${(selected.cashCollectedKd ?? 0).toFixed(3)} KD` : "\u2014"],
                ["Orders", selected.deliveriesCount ?? selected.orderCount ?? "\u2014"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* WHATSAPP IMPORT MODAL */}
      {waOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setWaOpen(false)}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
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

              <textarea
                value={waText}
                onChange={(e) => { setWaText(e.target.value); setWaParsed([]); setWaError(null); setWaSuccess(null); }}
                placeholder={"04/04/2026\n8:25 PM\nORD-12345\nCash\n5.500\n\n04/04/2026\n9:10 PM\nORD-12346\nKnet\n3.200"}
                rows={8}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 resize-none placeholder:text-gray-300"
              />

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

              {waError && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  {waError}
                </div>
              )}

              {waSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                  <Check size={16} />
                  {waSuccess}
                </div>
              )}

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
                            <td className="px-4 py-2.5 text-sm font-mono">{order.date || "\u2014"}</td>
                            <td className="px-4 py-2.5 text-sm font-mono">{order.arrivalTime || "\u2014"}</td>
                            <td className="px-4 py-2.5 text-sm font-mono font-medium">{order.orderNumber || "\u2014"}</td>
                            <td className="px-4 py-2.5">
                              {order.paymentSource ? (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-semibold",
                                  order.paymentSource === "CASH" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                )}>
                                  {order.paymentSource}
                                </span>
                              ) : "\u2014"}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-right font-mono font-medium text-orange-600">
                              {order.cashCollected != null ? order.cashCollected.toFixed(3) : "0.000"}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-secondary truncate max-w-[120px]">{order.driverName ? cleanDriverName(order.driverName) : "\u2014"}</td>
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
    </>
  );
}
