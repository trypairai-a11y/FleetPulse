"use client";
import { useState, useRef } from "react";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import SlidePanel from "@/components/shared/SlidePanel";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  ShoppingBag,
  Banknote,
  Gift,
  Upload,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Package,
} from "lucide-react";

function fmt(n: number) {
  return n?.toFixed(3) ?? "—";
}

function OrderRow({ order }: { order: any }) {
  const duration =
    order.assignedAt && order.deliveredAt
      ? Math.round(
          (new Date(order.deliveredAt).getTime() - new Date(order.assignedAt).getTime()) / 60000
        )
      : null;

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
      <td className="px-4 py-2.5 text-xs text-secondary font-mono">{order.orderNumber || "—"}</td>
      <td className="px-4 py-2.5 text-xs font-medium">{order.restaurantName || "—"}</td>
      <td className="px-4 py-2.5 text-xs text-secondary">
        {order.assignedAt
          ? new Date(order.assignedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs text-secondary">
        {order.deliveredAt
          ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs">
        {duration !== null ? (
          <span className={cn(duration > 45 ? "text-red-500 font-medium" : "text-secondary")}>
            {duration}m
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-secondary">{fmt(order.cashAmount)} KD</td>
    </tr>
  );
}

function DriverCard({ driver, date }: { driver: any; date: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: orderData } = useApiGet<any>(
    expanded ? `/api/orders?driverId=${driver.id}&date=${date}&platform=DELIVEROO&limit=50` : null
  );
  const orders: any[] = orderData?.data || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Driver header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-semibold text-teal-700 shrink-0">
          {driver.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{driver.name}</p>
          <p className="text-[11px] text-secondary font-mono">#{driver.platformDriverId}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-xs text-secondary">Cash</p>
            <p className="text-sm font-semibold text-teal-700">{fmt(driver.cashCollected)} KD</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary">Tips</p>
            <p className="text-sm font-semibold text-green-600">{fmt(driver.tips)} KD</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary">Orders</p>
            <p className="text-sm font-semibold">{driver.deliveriesCount ?? "—"}</p>
          </div>
          {(driver.unassignedOrders || 0) > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-xs font-medium">
              <AlertCircle size={11} />
              {driver.unassignedOrders} unassigned
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-secondary" />
          ) : (
            <ChevronDown size={16} className="text-secondary" />
          )}
        </div>
      </button>

      {/* Order breakdown */}
      {expanded && (
        <div className="border-t border-gray-50">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="text-left text-[10px] font-medium text-secondary px-4 py-2">Order #</th>
                <th className="text-left text-[10px] font-medium text-secondary px-4 py-2">Restaurant</th>
                <th className="text-left text-[10px] font-medium text-secondary px-4 py-2">Assigned</th>
                <th className="text-left text-[10px] font-medium text-secondary px-4 py-2">Delivered</th>
                <th className="text-left text-[10px] font-medium text-secondary px-4 py-2">Duration</th>
                <th className="text-left text-[10px] font-medium text-secondary px-4 py-2">Cash</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-secondary">
                    No orders found for this driver on this date
                  </td>
                </tr>
              ) : (
                orders.map((order) => <OrderRow key={order.id} order={order} />)
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CashDepositSection({ date }: { date: string }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: deposits } = useApiGet<any>(
    `/api/cash-deposits?platform=DELIVEROO&date=${date}`
  );
  const depositList: any[] = deposits?.data || [];

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("platform", "DELIVEROO");
      form.append("date", date);
      form.append("type", "CASH_RECEIPT");
      await api.post("/api/cash-deposits/upload", form);
      setUploaded(true);
    } catch {
      // handle error
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Banknote size={16} className="text-teal-600" />
          Cash Deposit Tracking
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={13} />
              Upload Receipt
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
      </div>

      {uploaded && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2">
          <CheckCircle2 size={13} /> Receipt uploaded successfully
        </div>
      )}

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-[10px] font-medium text-secondary pb-2">Driver</th>
            <th className="text-left text-[10px] font-medium text-secondary pb-2">Daily Total (KD)</th>
            <th className="text-left text-[10px] font-medium text-secondary pb-2">Receipt</th>
            <th className="text-left text-[10px] font-medium text-secondary pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {depositList.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-xs text-secondary">
                No cash deposit records for this date
              </td>
            </tr>
          ) : (
            depositList.map((dep: any) => (
              <tr key={dep.id} className="border-t border-gray-50">
                <td className="py-2.5 text-xs font-medium">{dep.driverName}</td>
                <td className="py-2.5 text-xs font-semibold text-teal-700">{fmt(dep.totalAmount)} KD</td>
                <td className="py-2.5">
                  {dep.receiptUrl ? (
                    <a
                      href={dep.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline"
                    >
                      <ImageIcon size={11} /> View
                    </a>
                  ) : (
                    <span className="text-xs text-secondary">—</span>
                  )}
                </td>
                <td className="py-2.5">
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium", {
                    "bg-green-50 text-green-700": dep.status === "CONFIRMED",
                    "bg-yellow-50 text-yellow-700": dep.status === "PENDING",
                    "bg-red-50 text-red-600": dep.status === "DISCREPANCY",
                  })}>
                    {dep.status || "PENDING"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DeliverooOrdersCashPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const screenshotRef = useRef<HTMLInputElement>(null);

  const { data: summary } = useApiGet<any>(
    `/api/deliveroo/orders/summary?dateFrom=${date}&dateTo=${date}`
  );
  const { data: driversData } = useApiGet<any>(
    `/api/orders/by-driver?platform=DELIVEROO&date=${date}`
  );
  const drivers: any[] = driversData?.data || [];

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("platform", "DELIVEROO");
      form.append("date", date);
      form.append("type", "ORDERS_CASH_COMBINED");
      await api.post("/api/screenshots/upload", form);
      setScreenshotUploaded(true);
    } catch {
      // handle error
    } finally {
      setScreenshotUploading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-teal-500" />
          <h1 className="text-xl font-semibold">Deliveroo — Orders & Cash</h1>
          <span className="text-sm text-secondary">Al Hazm</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <button
            onClick={() => screenshotRef.current?.click()}
            disabled={screenshotUploading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {screenshotUploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={15} />
                Upload Screenshot
              </>
            )}
          </button>
          <input
            ref={screenshotRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleScreenshotUpload}
          />
        </div>
      </div>

      {/* Screenshot hint */}
      <div className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
        <ImageIcon size={15} className="text-teal-500 mt-0.5 shrink-0" />
        <p className="text-xs text-teal-700">
          Deliveroo shows orders and cash together in one screenshot. Upload the combined screenshot above — Darb will extract cash collected, tips, and delivery counts automatically.
        </p>
        {screenshotUploaded && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
            <CheckCircle2 size={12} /> Uploaded
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Cash (KD)"
          value={fmt(summary?.totalCashCollected || 0)}
          icon={Banknote}
        />
        <StatCard
          title="Revenue (KD)"
          value={fmt(summary?.totalRevenue || 0)}
          icon={Gift}
        />
        <StatCard
          title="Total Orders"
          value={summary?.totalOrders ?? "—"}
          icon={ShoppingBag}
        />
        <StatCard
          title="Pending Cash (KD)"
          value={fmt(summary?.pendingCash || 0)}
          icon={Package}
          highlight={(summary?.pendingCash || 0) > 0}
        />
      </div>

      {/* Per-driver breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">Per Driver</h2>
        {drivers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-12 text-center text-sm text-secondary">
            No driver data for this date
          </div>
        ) : (
          drivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} date={date} />
          ))
        )}
      </div>

      {/* Cash Deposit */}
      <CashDepositSection date={date} />
    </div>
  );
}
