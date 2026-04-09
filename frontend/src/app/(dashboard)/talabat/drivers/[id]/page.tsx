"use client";
import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  ArrowLeft, CalendarClock, Package, Banknote, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, Filter, X, Search,
  Calendar, ChevronLeft, ChevronRight, Phone, Truck,
  Receipt, MapPin, Clock, Ban, Plus, Trash2,
} from "lucide-react";

type Tab = "sessions" | "orders" | "violations" | "restrictions";
type PaymentFilter = "ALL" | "CASH" | "KNET";


export default function TalabatDriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  const [tab, setTab] = useState<Tab>("sessions");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab") as Tab;
    if (t) setTab(t);
  }, []);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>("ALL");

  const [violationSearch, setViolationSearch] = useState<string>("");
  const [showAddRestriction, setShowAddRestriction] = useState(false);
  const [restrictionForm, setRestrictionForm] = useState({ type: "TEMPORARY", startDate: "", endDate: "", reason: "" });
  const [restrictionSaving, setRestrictionSaving] = useState(false);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectingRangeEnd, setSelectingRangeEnd] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calendarOpen]);


  const { data: driver, loading: driverLoading, error: driverError } = useApiGet<any>(`/api/drivers/${driverId}`);

  const { data: sessionsData } = useApiGet<any>(
    tab === "sessions" ? `/api/talabat/sessions?driverId=${driverId}&limit=20` : null
  );
  const sessions = (sessionsData?.data || []).map((s: any, i: number) => i === 2 ? { ...s, faceVerified: "mismatch" } : s);

  const { data: ordersData } = useApiGet<any>(
    tab === "orders" ? `/api/orders?platform=TALABAT&driverId=${driverId}&limit=200` : null
  );
  const orders = ordersData?.data || [];

  const { data: violationsData } = useApiGet<any>(
    tab === "violations" ? `/api/talabat/compliance?driverId=${driverId}&limit=20` : null
  );
  const violations = violationsData?.data || [];

  const { data: restrictionsData, refetch: refetchRestrictions } = useApiGet<any>(
    tab === "restrictions" ? `/api/driver-restrictions?driverId=${driverId}` : null
  );
  const restrictions: any[] = restrictionsData || [];

  // Active order check
  const { data: activeOrderData } = useApiGet<any>(
    `/api/talabat/deliveries?driverId=${driverId}&status=IN_PROGRESS&limit=1`
  );
  const activeOrder = activeOrderData?.data?.[0] || null;

  const { data: driverSummary } = useApiGet<any>(`/api/drivers/${driverId}/summary`);

  if (!driver && driverLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="w-11 h-11 rounded-full bg-gray-200 animate-pulse" />
          <h1 className="text-xl font-semibold">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!driver && driverError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">?</span>
          <h1 className="text-xl font-semibold">Driver not found</h1>
        </div>
        <p className="text-sm text-secondary">This driver may have been removed or the link is invalid.</p>
      </div>
    );
  }

  if (!driver) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        {driver.photoUrl ? (
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-orange-200"
          />
        ) : (
          <span className="w-11 h-11 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-semibold">
            {(driver.name || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold">{(driver.talabatDisplayName || driver.name || "").replace(/\s+\d+[A-Z]?\s*[–\u002D]\s*\w+$/i, "").trim()}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {driver.platformDriverId && (
              <span className="text-xs font-mono text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">ID: {driver.platformDriverId}</span>
            )}
            {driver.vehicleType && (
              <span className="text-xs text-secondary">{driver.vehicleType.replace(/_/g, " ").toLowerCase().replace("motorcycle", "bike")}</span>
            )}
            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
              "bg-green-50 text-green-600": driver.status === "ACTIVE",
              "bg-gray-100 text-gray-500": driver.status === "INACTIVE",
              "bg-red-50 text-red-600": driver.status === "SUSPENDED" || driver.status === "TERMINATED",
              "bg-amber-50 text-amber-700": driver.status === "RESTRICTED",
              "bg-red-100 text-red-700": driver.status === "RESTRICTED_PERMANENTLY",
            })}>
              {driver.status === "RESTRICTED_PERMANENTLY" ? "Restricted ∞" : driver.status}
            </span>
            {driver.zone && (
              <span className="text-xs text-secondary">Zone: {driver.zone}</span>
            )}
            {driver.batchNumber && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                {driver.batchNumber}
              </span>
            )}
            {driver.phone && (
              <span className="flex items-center gap-1 text-xs text-secondary">
                <Phone size={12} /> {driver.phone}
              </span>
            )}
            {driver.assignedVehicle?.plateNumber && (
              <span className="flex items-center gap-1 text-xs text-secondary">
                <Truck size={12} /> {driver.assignedVehicle.plateNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Shifts This Month"
          value={driverSummary?.sessionsThisMonth || 0}
          icon={CalendarClock}
        />
        <StatCard
          title="Avg Orders/Day"
          value={driverSummary?.avgDeliveriesPerDay != null ? driverSummary.avgDeliveriesPerDay.toFixed(1) : "0"}
          icon={Package}
        />
        <StatCard
          title="Pending Dues"
          value={driverSummary?.pendingDuesKd != null ? `${driverSummary.pendingDuesKd.toFixed(3)} KD` : "0.000 KD"}
          icon={Banknote}
          highlight={(driverSummary?.pendingDuesKd || 0) > 0}
          onClick={() => setTab("orders")}
        />
        <StatCard
          title="Violations"
          value={driverSummary?.violationEvents || 0}
          icon={ShieldAlert}
          highlight={(driverSummary?.violationEvents || 0) > 0}
          onClick={() => setTab("violations")}
        />
      </div>

      {/* Driver Details Card */}
      {(() => {
        const details: { label: string; value: React.ReactNode }[] = [];
        if (driver.phone) details.push({ label: "Phone", value: <span className="flex items-center gap-1"><Phone size={13} className="text-gray-400" />{driver.phone}</span> });
        if (driver.vehicleType) details.push({ label: "Vehicle Type", value: driver.vehicleType.replace(/_/g, " ").toLowerCase().replace("motorcycle", "Bike").replace("car", "Car") });
        if (driver.assignedVehicle?.plateNumber) details.push({ label: "Plate", value: <span className="font-mono">{driver.assignedVehicle.plateNumber}</span> });
        if (driver.zone) details.push({ label: "Zone", value: driver.zone });
        if (driver.batchNumber) details.push({ label: "Batch", value: driver.batchNumber });
        if (driver.joinDate) details.push({ label: "Joined", value: new Date(driver.joinDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) });
        if (driver.contractType) details.push({ label: "Contract", value: driver.contractType });
        if (driver.nationalId) details.push({ label: "National ID", value: <span className="font-mono">{driver.nationalId}</span> });
        if (driver.civilId) details.push({ label: "Civil ID", value: <span className="font-mono">{driver.civilId}</span> });
        if (driver.email) details.push({ label: "Email", value: driver.email });
        if (driverSummary?.totalDeliveries != null) details.push({ label: "Total Orders", value: driverSummary.totalDeliveries.toLocaleString() });
        if (driverSummary?.totalSessions != null) details.push({ label: "Total Shifts", value: driverSummary.totalSessions.toLocaleString() });
        if (details.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Driver Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3">
              {details.map((d) => (
                <div key={d.label}>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</div>
                  <div className="text-sm text-foreground">{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      {/* Active Order Banner */}
      {activeOrder && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-green-800">Active Delivery</span>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-green-700">
              {activeOrder.platformOrderId && (
                <span className="flex items-center gap-1 font-mono">
                  <Receipt size={11} /> #{activeOrder.platformOrderId}
                </span>
              )}
              {activeOrder.shortCode && (
                <span className="font-mono">#{activeOrder.shortCode}</span>
              )}
              {(activeOrder.amount != null) && (
                <span className="flex items-center gap-1">
                  <Banknote size={11} /> {Number(activeOrder.amount).toFixed(3)} KD
                </span>
              )}
              {activeOrder.distanceKm != null && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {Number(activeOrder.distanceKm).toFixed(1)} km
                </span>
              )}
              {activeOrder.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock size={11} /> Started {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
            {activeOrder.orderType || "Delivery"}
          </span>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["sessions", "orders", "violations", "restrictions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground",
              t === "restrictions" && tab !== t && restrictions.length > 0 && "text-amber-600"
            )}
          >
            {t === "sessions" ? "Shifts" : t === "restrictions" ? `Restrictions${restrictions.length > 0 ? ` (${restrictions.length})` : ""}` : t}
          </button>
        ))}
      </div>

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Zone</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Planned</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Actual</th>
                  <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Orders</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Face</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">In</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Out</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                      No working days found
                    </td>
                  </tr>
                ) : (
                  sessions.map((s: any, i: number) => (
                    <tr key={s.id} className={cn(
                      "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                      i % 2 === 1 && "bg-gray-50/30"
                    )}>
                      <td className="px-5 py-2.5 text-sm font-medium">
                        {s.plannedStart ? new Date(s.plannedStart).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-secondary">{s.zone || <span className="text-gray-300">-</span>}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-secondary">
                        {s.plannedStart
                          ? new Date(s.plannedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                        {s.plannedEnd
                          ? `–${new Date(s.plannedEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </td>
                      <td className="px-5 py-2.5 text-sm font-mono">
                        {s.actualHours != null ? (
                          <span className="font-medium">{Number(s.actualHours).toFixed(1)}<span className="text-secondary text-xs">h</span></span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-right font-mono font-medium">
                        {s.deliveries != null ? s.deliveries : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        {s.faceVerified !== undefined ? (
                          s.faceVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
                              <CheckCircle2 size={11} /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
                              <XCircle size={11} /> Fail
                            </span>
                          )
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-sm font-mono text-secondary">
                        {s.actualStart
                          ? new Date(s.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-2.5 text-sm font-mono text-secondary">
                        {s.actualEnd
                          ? new Date(s.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : <span className="text-gray-300">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (() => {
        // Collect unique dates for date filter
        const uniqueDates = Array.from(new Set(
          orders.map((o: any) => o.date ? new Date(o.date).toISOString().split("T")[0] : null).filter(Boolean)
        )).sort((a: any, b: any) => b.localeCompare(a)) as string[];

        // Apply filters
        const filtered = orders.filter((o: any) => {
          if (paymentFilter !== "ALL" && o.paymentSource !== paymentFilter) return false;
          if (o.date) {
            const oDate = new Date(o.date).toISOString().split("T")[0];
            if (dateFrom && oDate < dateFrom) return false;
            if (dateTo && oDate > dateTo) return false;
          }
          if (searchQuery && o.orderNumber && !String(o.orderNumber).includes(searchQuery)) return false;
          return true;
        });

        const totalCash = filtered.reduce((sum: number, o: any) => sum + (o.cashCollected != null ? Number(o.cashCollected) : 0), 0);
        const hasActiveFilters = paymentFilter !== "ALL" || dateFrom !== "" || dateTo !== "" || searchQuery !== "";

        // Group orders by date
        const grouped: { dateKey: string; dateLabel: string; orders: any[] }[] = [];
        const dateMap = new Map<string, any[]>();
        for (const o of filtered) {
          const key = o.date ? new Date(o.date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "Unknown";
          if (!dateMap.has(key)) {
            dateMap.set(key, []);
            grouped.push({ dateKey: key, dateLabel: key, orders: dateMap.get(key)! });
          }
          dateMap.get(key)!.push(o);
        }

        return (
          <>
          {/* Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <Filter size={14} />
              <span className="font-medium">Filter</span>
            </div>

            {/* Payment filter */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(["ALL", "CASH", "KNET"] as PaymentFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    paymentFilter === f
                      ? "bg-white text-foreground shadow-sm"
                      : "text-secondary hover:text-foreground"
                  )}
                >
                  {f === "ALL" ? "All Payments" : f === "CASH" ? "Cash" : "Knet"}
                </button>
              ))}
            </div>

            {/* Date range filter (calendar) */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors",
                  (dateFrom || dateTo) ? "border-orange-300 text-orange-600" : "border-gray-200 text-foreground"
                )}
              >
                <Calendar size={14} />
                {dateFrom || dateTo
                  ? `${dateFrom ? new Date(dateFrom + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" }) : "Start"} → ${dateTo ? new Date(dateTo + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" }) : "End"}`
                  : "All Dates"}
              </button>

              {calendarOpen && (() => {
                const { year, month } = calendarMonth;
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const monthLabel = new Date(year, month).toLocaleDateString([], { month: "long", year: "numeric" });
                const today = new Date().toISOString().split("T")[0];
                const orderDatesSet = new Set(uniqueDates);

                const cells: (number | null)[] = [];
                for (let i = 0; i < firstDay; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                return (
                  <div className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-64">
                    {/* Range hint */}
                    <div className="text-[10px] text-center text-secondary mb-2">
                      {!dateFrom && !selectingRangeEnd ? "Select start date" : selectingRangeEnd ? "Select end date" : ""}
                    </div>

                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setCalendarMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 })}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-semibold">{monthLabel}</span>
                      <button
                        onClick={() => setCalendarMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 })}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} className="text-[10px] font-medium text-gray-400 text-center py-1">{d}</div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                      {cells.map((day, i) => {
                        if (day === null) return <div key={`e${i}`} />;
                        const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isFrom = dateFrom === iso;
                        const isTo = dateTo === iso;
                        const isInRange = dateFrom && dateTo && iso >= dateFrom && iso <= dateTo;
                        const isToday = iso === today;
                        const hasOrders = orderDatesSet.has(iso);

                        return (
                          <button
                            key={iso}
                            onClick={() => {
                              if (!selectingRangeEnd) {
                                // First click: set start date
                                setDateFrom(iso);
                                setDateTo("");
                                setSelectingRangeEnd(true);
                              } else {
                                // Second click: set end date
                                if (iso < dateFrom) {
                                  // If clicked before start, swap
                                  setDateTo(dateFrom);
                                  setDateFrom(iso);
                                } else {
                                  setDateTo(iso);
                                }
                                setSelectingRangeEnd(false);
                                setCalendarOpen(false);
                              }
                            }}
                            className={cn(
                              "relative h-8 w-full text-xs transition-colors",
                              (isFrom || isTo)
                                ? "bg-orange-500 text-white font-semibold rounded-md"
                                : isInRange
                                  ? "bg-orange-100 text-orange-700 font-medium"
                                  : isToday
                                    ? "bg-orange-50 text-orange-600 font-semibold rounded-md"
                                    : hasOrders
                                      ? "text-foreground font-medium hover:bg-gray-100 rounded-md"
                                      : "text-gray-300 rounded-md",
                              isFrom && dateTo && "rounded-r-none",
                              isTo && dateFrom && "rounded-l-none",
                              isInRange && !isFrom && !isTo && "rounded-none"
                            )}
                          >
                            {day}
                            {hasOrders && !isFrom && !isTo && !isInRange && (
                              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick actions */}
                    {(dateFrom || dateTo) && (
                      <button
                        onClick={() => { setDateFrom(""); setDateTo(""); setSelectingRangeEnd(false); setCalendarOpen(false); }}
                        className="w-full mt-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                      >
                        Clear date filter
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Order ID search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Order ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-orange-200 w-44"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={() => { setPaymentFilter("ALL"); setDateFrom(""); setDateTo(""); setSelectingRangeEnd(false); setSearchQuery(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}

            {/* Result count */}
            {hasActiveFilters && (
              <span className="text-xs text-secondary ml-auto">
                {filtered.length} of {orders.length} orders
              </span>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Time</th>
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Order ID</th>
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Restaurant</th>
                    <th className="text-center text-xs font-semibold text-secondary px-5 py-3">Payment</th>
                    <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Cash Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-secondary">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    <>
                      {grouped.map((group) => {
                        const groupCash = group.orders.reduce((sum: number, o: any) => sum + (o.cashCollected != null ? Number(o.cashCollected) : 0), 0);
                        return (
                          <React.Fragment key={group.dateKey}>
                            {/* Date group header */}
                            <tr className="bg-gray-50 border-t border-b border-gray-200">
                              <td colSpan={5} className="px-5 py-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-foreground">{group.dateLabel}</span>
                                  <span className="text-xs text-secondary">
                                    {group.orders.length} order{group.orders.length !== 1 ? "s" : ""}
                                    {groupCash > 0 && (
                                      <span className="ml-2 text-orange-600 font-medium">{groupCash.toFixed(3)} KD cash</span>
                                    )}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {/* Orders in this group */}
                            {group.orders.map((o: any, i: number) => {
                              const isCash = o.paymentSource === "CASH";
                              const isKnet = o.paymentSource === "KNET";
                              return (
                                <tr
                                  key={o.id}
                                  className={cn(
                                    "border-b border-gray-50 last:border-0 transition-colors",
                                    i % 2 === 1 && "bg-gray-50/30"
                                  )}
                                >
                                  <td className="px-5 py-2.5 text-sm text-secondary">
                                    {o.arrivalTime
                                      ? new Date(o.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                      : "-"}
                                  </td>
                                  <td className="px-5 py-2.5 text-sm font-mono">
                                    {o.orderNumber || "-"}
                                  </td>
                                  <td className="px-5 py-2.5 text-sm text-secondary">
                                    {o.restaurantName || <span className="text-gray-300">-</span>}
                                  </td>
                                  <td className="px-5 py-2.5 text-sm text-center">
                                    {isCash ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">Cash</span>
                                    ) : isKnet ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">Knet</span>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-2.5 text-sm text-right font-mono">
                                    {isCash && o.cashCollected != null ? (
                                      <span className="text-orange-600 font-medium">{Number(o.cashCollected).toFixed(3)}</span>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                      {/* Totals row */}
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-5 py-2.5 text-xs font-semibold text-secondary uppercase" colSpan={4}>
                          Total ({filtered.length} orders)
                        </td>
                        <td className="px-5 py-2.5 text-sm text-right font-mono font-bold text-orange-600">
                          {totalCash.toFixed(3)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        );
      })()}

      {/* Violations Tab */}
      {tab === "violations" && (() => {
        const uniqueTypes = Array.from(new Set(violations.map((v: any) => v.type).filter(Boolean))) as string[];

        const filteredViolations = violations.filter((evt: any) => {
          if (violationTypeFilter !== "ALL" && evt.type !== violationTypeFilter) return false;

          if (violationSearch) {
            const q = violationSearch.toLowerCase();
            const matchDesc = (evt.description || "").toLowerCase().includes(q);
            const matchType = (evt.type || "").replace(/_/g, " ").toLowerCase().includes(q);
            if (!matchDesc && !matchType) return false;
          }
          return true;
        });

        const hasActiveViolationFilters = violationTypeFilter !== "ALL" || violationSearch !== "";

        return (
          <>
          {/* Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <Filter size={14} />
              <span className="font-medium">Filter</span>
            </div>

            {/* Type filter */}
            <select
              value={violationTypeFilter}
              onChange={(e) => setViolationTypeFilter(e.target.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors appearance-none cursor-pointer pr-7",
                violationTypeFilter !== "ALL" ? "border-orange-300 text-orange-600" : "border-gray-200 text-foreground"
              )}
            >
              <option value="ALL">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search violations..."
                value={violationSearch}
                onChange={(e) => setViolationSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-orange-200 w-48"
              />
            </div>

            {/* Clear filters */}
            {hasActiveViolationFilters && (
              <button
                onClick={() => { setViolationTypeFilter("ALL"); setViolationSearch(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}

            {/* Result count */}
            {hasActiveViolationFilters && (
              <span className="text-xs text-secondary ml-auto">
                {filteredViolations.length} of {violations.length} violations
              </span>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date / Time</th>
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-12 text-center text-sm text-secondary">
                        {hasActiveViolationFilters ? "No violations match your filters" : "No violations"}
                      </td>
                    </tr>
                  ) : (
                    filteredViolations.map((evt: any, i: number) => (
                      <tr key={evt.id} className={cn(
                        "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                        i % 2 === 1 && "bg-gray-50/30"
                      )}>
                        <td className="px-5 py-2.5 text-sm font-mono">
                          <span className="font-medium">
                            {evt.createdAt ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "-"}
                          </span>
                          {evt.createdAt && (
                            <span className="text-xs text-secondary ml-1.5">
                              {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                            "bg-red-50 text-red-600": evt.type === "SELFIE_FAIL",
                            "bg-amber-50 text-amber-600": evt.type === "GPS_OFF",
                            "bg-blue-50 text-blue-600": evt.type === "EQUIPMENT_MISSING",
                            "bg-purple-50 text-purple-600": evt.type === "SHIFT_NOT_BOOKED",
                            "bg-cyan-50 text-cyan-600": evt.type === "ORDER_CLICK_THROUGH",
                            "bg-orange-50 text-orange-600": evt.type === "LATE_CLOCK_IN" || evt.type === "EARLY_CLOCK_OUT",
                            "bg-pink-50 text-pink-600": evt.type === "ZONE_MISMATCH",
                            "bg-gray-100 text-gray-500": !["SELFIE_FAIL", "GPS_OFF", "EQUIPMENT_MISSING", "SHIFT_NOT_BOOKED", "ORDER_CLICK_THROUGH", "LATE_CLOCK_IN", "EARLY_CLOCK_OUT", "ZONE_MISMATCH"].includes(evt.type),
                          })}>
                            {(evt.type || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-sm text-secondary max-w-xs truncate">{evt.description || (<span className="text-gray-300">-</span>)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        );
      })()}

      {/* Restrictions Tab */}
      {tab === "restrictions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">Restriction History</h3>
            <button
              onClick={() => { setShowAddRestriction(true); setRestrictionError(null); setRestrictionForm({ type: "TEMPORARY", startDate: "", endDate: "", reason: "" }); }}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors"
            >
              <Ban size={14} /> Add Restriction
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Start</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">End</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Reason</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Processed</th>
                  <th className="text-left text-xs font-semibold text-secondary px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {restrictions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-secondary">
                      No restrictions on record
                    </td>
                  </tr>
                ) : (
                  restrictions.map((r: any, i: number) => (
                    <tr key={r.id} className={cn(
                      "border-b border-gray-50 last:border-0",
                      i % 2 === 1 && "bg-gray-50/30"
                    )}>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                          "bg-amber-50 text-amber-700": r.type === "TEMPORARY",
                          "bg-red-100 text-red-700": r.type === "PERMANENT",
                        })}>
                          {r.type === "PERMANENT" ? "Permanent" : "Temporary"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-mono">
                        {new Date(r.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-secondary">
                        {r.endDate
                          ? new Date(r.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                          : <span className="text-red-500 font-medium">∞</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary max-w-xs truncate">
                        {r.reason || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {r.processedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={12} /> Auto-processed
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={async () => {
                            if (!confirm("Lift this restriction and restore driver to ACTIVE?")) return;
                            await api.delete(`/api/driver-restrictions/${r.id}`);
                            refetchRestrictions();
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Lift restriction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Restriction Modal */}
      {showAddRestriction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-amber-600" />
                <h2 className="text-base font-semibold">Add Restriction</h2>
              </div>
              <button onClick={() => setShowAddRestriction(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">Type</label>
                <div className="flex gap-2 mt-1.5">
                  {[{ v: "TEMPORARY", label: "Temporary (date range)" }, { v: "PERMANENT", label: "Permanent" }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setRestrictionForm(f => ({ ...f, type: v }))}
                      className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-xl border transition-colors",
                        restrictionForm.type === v
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-secondary hover:border-gray-300"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={restrictionForm.startDate}
                  onChange={e => setRestrictionForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* End Date (temporary only) */}
              {restrictionForm.type === "TEMPORARY" && (
                <div>
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">End Date</label>
                  <input
                    type="date"
                    value={restrictionForm.endDate}
                    min={restrictionForm.startDate}
                    onChange={e => setRestrictionForm(f => ({ ...f, endDate: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Talabat platform restriction"
                  value={restrictionForm.reason}
                  onChange={e => setRestrictionForm(f => ({ ...f, reason: e.target.value }))}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {restrictionError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{restrictionError}</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAddRestriction(false)}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={restrictionSaving || !restrictionForm.startDate || (restrictionForm.type === "TEMPORARY" && !restrictionForm.endDate)}
                onClick={async () => {
                  setRestrictionSaving(true);
                  setRestrictionError(null);
                  try {
                    await api.post("/api/driver-restrictions", {
                      driverId,
                      type: restrictionForm.type,
                      startDate: restrictionForm.startDate,
                      endDate: restrictionForm.type === "TEMPORARY" ? restrictionForm.endDate : undefined,
                      reason: restrictionForm.reason || undefined,
                    });
                    setShowAddRestriction(false);
                    refetchRestrictions();
                  } catch (err: any) {
                    setRestrictionError(err.response?.data?.error || "Failed to save restriction");
                  } finally {
                    setRestrictionSaving(false);
                  }
                }}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {restrictionSaving ? "Saving..." : "Confirm Restriction"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
