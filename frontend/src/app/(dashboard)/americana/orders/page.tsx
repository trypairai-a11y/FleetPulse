"use client";
import { useState, useRef } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import {
  Upload,
  ShoppingBag,
  CreditCard,
  Banknote,
  TrendingUp,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type PaymentTab = "ALL" | "COD" | "CCOD" | "PAID";

const STORES = [
  "KFC Audiliya",
  "KFC Salwa",
  "KFC Salmiya",
  "KFC Jabriya",
  "KFC Rumaithiya",
  "Pizza Hut Hawally",
  "Pizza Hut Salmiya",
  "Hardees Fahaheel",
];

const PAYMENT_TAB_STYLES: Record<PaymentTab, string> = {
  ALL: "bg-gray-100 text-gray-700",
  COD: "bg-green-50 text-green-700",
  CCOD: "bg-blue-50 text-blue-700",
  PAID: "bg-purple-50 text-purple-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  COD: "bg-green-50 text-green-700",
  CCOD: "bg-blue-50 text-blue-700",
  PAID: "bg-purple-50 text-purple-700",
  PENDING: "bg-yellow-50 text-yellow-700",
  CANCELLED: "bg-red-50 text-red-600",
};

function formatKWD(value: number): string {
  return `${value.toFixed(3)} KWD`;
}

export default function AmericanaOrdersPage() {
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("ALL");
  const [filters, setFilters] = useState<Record<string, string>>({
    date: new Date().toISOString().split("T")[0],
  });
  const [selected, setSelected] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const params = new URLSearchParams({ platform: "AMERICANA", limit: "200" });
  if (filters.date) { params.set("dateFrom", filters.date); params.set("dateTo", filters.date); }
  if (filters.store) params.set("store", filters.store);
  if (filters.search) params.set("search", filters.search);
  if (paymentTab !== "ALL") params.set("paymentType", paymentTab);

  const { data: ordersData, loading } = useApiGet<any>(`/api/orders?${params}`);
  const { data: summary } = useApiGet<any>(`/api/orders/summary?platform=AMERICANA&date=${filters.date}`);

  const orders: any[] = ordersData?.data || [];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("platform", "AMERICANA");
      form.append("date", filters.date);
      await api.post("/api/orders/import", form);
      setImportSuccess(true);
    } catch { /* silent */ } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const prevDay = () => {
    const d = new Date(filters.date);
    d.setDate(d.getDate() - 1);
    setFilters((prev) => ({ ...prev, date: d.toISOString().split("T")[0] }));
    setImportSuccess(false);
  };

  const nextDay = () => {
    const d = new Date(filters.date);
    d.setDate(d.getDate() + 1);
    setFilters((prev) => ({ ...prev, date: d.toISOString().split("T")[0] }));
    setImportSuccess(false);
  };

  const columns = [
    {
      key: "orderId",
      label: "Order ID",
      render: (v: string) => <span className="font-mono text-sm font-medium">{v || "—"}</span>,
    },
    {
      key: "amount",
      label: "Amount (KWD)",
      render: (v: number) => <span className="text-sm font-semibold">{v != null ? formatKWD(v) : "—"}</span>,
    },
    { key: "posNumber", label: "POS", render: (v: string) => <span className="font-mono text-xs text-secondary">{v || "—"}</span> },
    { key: "storeName", label: "Store", render: (v: string) => <span className="text-sm text-secondary">{v || "—"}</span> },
    { key: "driverName", label: "Driver", render: (v: string) => <span className="text-sm">{v || "—"}</span> },
    {
      key: "timestamp",
      label: "Time",
      render: (v: string) =>
        v ? (
          <span className="text-sm text-secondary">
            {new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : (
          <span className="text-secondary text-sm">—</span>
        ),
    },
    {
      key: "paymentType",
      label: "Payment",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", PAYMENT_STATUS_STYLES[v] || "bg-gray-100 text-gray-600")}>
          {v || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "DELIVERED",
          "bg-yellow-50 text-yellow-700": v === "PENDING",
          "bg-red-50 text-red-600": v === "CANCELLED",
          "bg-blue-50 text-blue-600": v === "IN_TRANSIT",
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
          <span className="w-3 h-3 rounded-full bg-americana" />
          <h1 className="text-xl font-semibold">Americana — Orders</h1>
          <span className="text-sm text-secondary">Al Hazm Express</span>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {importing ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Import Americana XLSX
          </button>
        </div>
      </div>

      {/* Import Success */}
      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">Orders imported successfully for {filters.date}.</p>
        </div>
      )}

      {/* Cash Note Banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-gray-500 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-700">Cash tracking not available here.</span>{" "}
          Cash is deposited at the store at end of shift and is not tracked in this system.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={summary?.totalOrders ?? orders.length} icon={ShoppingBag} />
        <StatCard
          title="Total Amount"
          value={summary?.totalAmount != null ? formatKWD(summary.totalAmount) : "—"}
          icon={TrendingUp}
        />
        <StatCard
          title="COD Orders"
          value={summary?.codCount ?? orders.filter((o: any) => o.paymentType === "COD").length}
          icon={Banknote}
        />
        <StatCard
          title="Card / CCOD"
          value={summary?.ccodCount ?? orders.filter((o: any) => o.paymentType === "CCOD" || o.paymentType === "PAID").length}
          icon={CreditCard}
        />
      </div>

      {/* Date Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <button onClick={prevDay} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => { setFilters((prev) => ({ ...prev, date: e.target.value })); setImportSuccess(false); }}
            className="text-sm font-medium border-0 focus:outline-none bg-transparent"
          />
          <button onClick={nextDay} className="p-1 hover:bg-gray-50 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <FilterBar
          filters={[
            { key: "search", type: "search", label: "Search", placeholder: "Search KUW_ order ID..." },
            { key: "store", type: "select", label: "All Stores", options: STORES.map((s) => ({ value: s, label: s })) },
          ]}
          values={filters}
          onChange={(k, v) => {
            if (k === "date") setImportSuccess(false);
            setFilters((prev) => ({ ...prev, [k]: v }));
          }}
        />
      </div>

      {/* Payment Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["ALL", "COD", "CCOD", "PAID"] as PaymentTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setPaymentTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              paymentTab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t}
            {t !== "ALL" && summary?.[`${t.toLowerCase()}Count`] != null && (
              <span className={cn("ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold", PAYMENT_TAB_STYLES[t])}>
                {summary[`${t.toLowerCase()}Count`]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={orders}
        onRowClick={setSelected}
        emptyMessage={loading ? "Loading…" : "No orders found. Import an Americana XLSX or adjust filters."}
      />

      {/* Daily Comparison */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold mb-4">Daily Comparison</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Today", value: summary?.todayOrders ?? "—", sub: summary?.todayAmount != null ? formatKWD(summary.todayAmount) : "" },
            { label: "Yesterday", value: summary?.yesterdayOrders ?? "—", sub: summary?.yesterdayAmount != null ? formatKWD(summary.yesterdayAmount) : "" },
            { label: "7-Day Avg", value: summary?.avgOrders ?? "—", sub: summary?.avgAmount != null ? formatKWD(summary.avgAmount) : "" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-secondary font-medium mb-1">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
              {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Order Detail Slide Panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">{selected.orderId}</h2>
                <p className="text-xs text-secondary mt-0.5">Americana / Al Hazm Express</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-50 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Order ID", selected.orderId],
                ["Amount", selected.amount != null ? formatKWD(selected.amount) : "—"],
                ["POS Number", selected.posNumber],
                ["Store", selected.storeName],
                ["Driver", selected.driverName],
                ["Payment Type", selected.paymentType],
                ["Status", selected.status],
                ["Timestamp", selected.timestamp ? new Date(selected.timestamp).toLocaleString() : "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
