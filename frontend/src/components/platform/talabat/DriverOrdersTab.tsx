"use client";
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  Filter, X, Search, Calendar, ChevronLeft, ChevronRight,
} from "lucide-react";

type PaymentFilter = "ALL" | "CASH" | "KNET";

interface DriverOrdersTabProps {
  orders: any[];
}

export default function DriverOrdersTab({ orders }: DriverOrdersTabProps) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
              ? `${dateFrom ? new Date(dateFrom + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" }) : "Start"} \u2192 ${dateTo ? new Date(dateTo + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" }) : "End"}`
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
}
