"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import {
  ShoppingBag, DollarSign, AlertTriangle, Users, Clock, TrendingUp,
  TrendingDown, Minus, ChevronRight, ShieldAlert, ArrowUpRight,
  MapPin, Activity, Search, BarChart3, Eye,
  CheckCircle2, XCircle, AlertCircle, Timer, ChevronDown, Target, Settings2, CalendarX, Umbrella,
} from "lucide-react";

const GRADE_COLORS: Record<string, string> = {
  excellent: "text-green-600 bg-green-50",
  good: "text-blue-600 bg-blue-50",
  average: "text-yellow-600 bg-yellow-50",
  below: "text-orange-600 bg-orange-50",
  failed: "text-red-600 bg-red-50",
};

function getGradeLabel(score: number | null): { label: string; colorClass: string } {
  if (score === null) return { label: "-", colorClass: "text-gray-400 bg-gray-50" };
  if (score >= 90) return { label: "Excellent", colorClass: GRADE_COLORS.excellent };
  if (score >= 70) return { label: "Good", colorClass: GRADE_COLORS.good };
  if (score >= 50) return { label: "Average", colorClass: GRADE_COLORS.average };
  if (score >= 30) return { label: "Below Avg", colorClass: GRADE_COLORS.below };
  return { label: "Failed", colorClass: GRADE_COLORS.failed };
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "UP") return <TrendingUp size={14} className="text-green-500" />;
  if (trend === "DOWN") return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

const VIOLATION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SELFIE_FAIL: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  GPS_OFF: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  EQUIPMENT_MISSING: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  SHIFT_NOT_BOOKED: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  OUT_OF_ZONE: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  CASH_THRESHOLD_EXCEEDED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  LATE_CLOCK_IN: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  EARLY_CLOCK_OUT: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  ORDER_CLICK_THROUGH: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  ZONE_MISMATCH: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500" },
};

function getViolationColor(type: string) {
  return VIOLATION_COLORS[type] || { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-500" };
}

export default function TalabatOverviewPage() {
  const router = useRouter();
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [sortCol, setSortCol] = useState<string>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [restaurantPeriod, setRestaurantPeriod] = useState<"morning" | "afternoon" | "evening">("morning");

  const params = new URLSearchParams();
  if (companyFilter) params.set("companyId", companyFilter);

  const { data, loading } = useApiGet<any>(`/api/talabat/overview?${params}`);
  const { data: companiesData } = useApiGet<any>(`/api/companies?platform=TALABAT`);

  const companies = companiesData?.data || [];
  const drivers = data?.drivers || [];
  const summary = data?.summary || {};
  const violations = data?.violations || [];
  const alerts = data?.alerts || [];
  const zoneBreakdown = data?.zoneBreakdown || [];
  const violationsByType = data?.violationsByType || [];
  const hourly = data?.hourly || [];
  const RESTAURANT_LOGOS: Record<string, string> = {
    "mcdonald's": "https://logo.clearbit.com/mcdonalds.com",
    "kfc": "https://logo.clearbit.com/kfc.com",
    "pizza hut": "https://logo.clearbit.com/pizzahut.com",
    "hardee's": "https://logo.clearbit.com/hardees.com",
    "subway": "https://logo.clearbit.com/subway.com",
    "popeyes": "https://logo.clearbit.com/popeyes.com",
    "burger king": "https://logo.clearbit.com/burgerking.com",
    "cinnabon": "https://logo.clearbit.com/cinnabon.com",
    "starbucks": "https://logo.clearbit.com/starbucks.com",
    "baskin br": "https://logo.clearbit.com/baskinrobbins.com",
    "baskin robbins": "https://logo.clearbit.com/baskinrobbins.com",
    "domino's": "https://logo.clearbit.com/dominos.com",
    "papa john's": "https://logo.clearbit.com/papajohns.com",
    "taco bell": "https://logo.clearbit.com/tacobell.com",
    "wendy's": "https://logo.clearbit.com/wendys.com",
    "five guys": "https://logo.clearbit.com/fiveguys.com",
    "shake shack": "https://logo.clearbit.com/shakeshack.com",
  };
  const getRestaurantLogo = (name: string) => RESTAURANT_LOGOS[name.toLowerCase()] ?? null;
  const MOCK_RESTAURANTS = [
    { name: "McDonald's", orders: 42 },
    { name: "KFC", orders: 37 },
    { name: "Pizza Hut", orders: 29 },
    { name: "Hardee's", orders: 24 },
    { name: "Subway", orders: 21 },
    { name: "Popeyes", orders: 18 },
    { name: "Burger King", orders: 15 },
    { name: "Cinnabon", orders: 11 },
    { name: "Starbucks", orders: 9 },
    { name: "Baskin BR", orders: 6 },
  ];
  const byRestaurant = (data?.byRestaurant?.length ? data.byRestaurant : MOCK_RESTAURANTS);
  const byRestaurantPeriod = data?.byRestaurantPeriod || { morning: [], afternoon: [], evening: [] };
  const topPerformers = data?.topPerformers || [];
  const attendanceTrend = data?.attendanceTrend || [];
  const unbookedNextWeek: any[] = data?.unbookedNextWeek || [];
  const overdueCash = data?.overdueCash || { totalAmount: 0, driverCount: 0, drivers: [] };

  const filteredDrivers = useMemo(() => {
    let list = drivers;
    if (driverSearch) {
      const q = driverSearch.toLowerCase();
      list = list.filter((d: any) =>
        d.name?.toLowerCase().includes(q) || d.utr?.toLowerCase().includes(q) || d.zone?.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a: any, b: any) => {
      let av: any, bv: any;
      switch (sortCol) {
        case "utr": av = Number(a.utr) || 0; bv = Number(b.utr) || 0; break;
        case "batch": av = Number(a.batchNumber) || 99; bv = Number(b.batchNumber) || 99; break;
        case "grade": av = a.darbGrade ?? -1; bv = b.darbGrade ?? -1; break;
        case "orders": av = a.todayOrders ?? 0; bv = b.todayOrders ?? 0; break;
        case "cash": av = a.cashCollected ?? 0; bv = b.cashCollected ?? 0; break;
        case "pending": av = a.cashPending ?? 0; bv = b.cashPending ?? 0; break;
        case "attendance": av = a.attendance ?? ""; bv = b.attendance ?? ""; break;
        case "alerts": av = a.alertCount ?? 0; bv = b.alertCount ?? 0; break;
        default: av = a.rank ?? 0; bv = b.rank ?? 0; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [drivers, driverSearch, sortCol, sortDir]);

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const displayedDrivers = showAllDrivers ? filteredDrivers : filteredDrivers.slice(0, 15);
  const maxHourlyOrders = Math.max(...hourly.map((h: any) => h.orders), 1);
  const maxHourlyCash = Math.max(...hourly.map((h: any) => h.cash ?? 0), 1);
  const maxHourlySessions = Math.max(...hourly.map((h: any) => h.sessions ?? 0), 1);
  const maxRestaurantOrders = Math.max(...byRestaurant.map((r: any) => r.orders), 1);
  const maxZoneDeliveries = Math.max(...zoneBreakdown.map((z: any) => z.deliveries), 1);
  const totalViolations = violationsByType.filter((v: any) => v.type !== "ORDER_CLICK_THROUGH" && v.type !== "ZONE_MISMATCH").reduce((s: number, v: any) => s + v.count, 0);

  // Attendance donut percentages
  const leaveCount = summary.driversOnLeave ?? 0;
  const totalAtt = (summary.presentCount || 0) + (summary.lateCount || 0) + (summary.absentCount || 0) + leaveCount;
  const presentPct = totalAtt > 0 ? ((summary.presentCount || 0) / totalAtt) * 100 : 0;
  const latePct = totalAtt > 0 ? ((summary.lateCount || 0) / totalAtt) * 100 : 0;
  const absentPct = totalAtt > 0 ? ((summary.absentCount || 0) / totalAtt) * 100 : 0;
  const leavePct = totalAtt > 0 ? (leaveCount / totalAtt) * 100 : 0;

  // Conic gradient for donut
  const presentEnd = presentPct;
  const lateEnd = presentEnd + latePct;
  const absentEnd = lateEnd + absentPct;
  const donutGradient = totalAtt > 0
    ? `conic-gradient(#16a34a 0% ${presentEnd}%, #eab308 ${presentEnd}% ${lateEnd}%, #dc2626 ${lateEnd}% ${absentEnd}%, #14b8a6 ${absentEnd}% 100%)`
    : "conic-gradient(#e5e7eb 0% 100%)";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Talabat Overview</h1>
            <p className="text-sm text-secondary mt-1">Loading dashboard...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-20 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Talabat Overview</h1>
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Companies</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* No Shift Booked Next Week */}
        <div
          onClick={() => router.push("/talabat/shifts")}
          className={cn(
            "bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:ring-1 hover:ring-primary/30 group",
            unbookedNextWeek.length > 0 && "ring-1 ring-amber-200"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-secondary mb-1">No Shift Booked</p>
              <p className={cn("text-2xl font-bold", unbookedNextWeek.length > 0 && "text-amber-500")}>
                {unbookedNextWeek.length}
              </p>
              <p className="text-[11px] text-secondary mt-1">next 7 days</p>
            </div>
            <div className={cn("p-2 rounded-xl transition-colors",
              unbookedNextWeek.length > 0 ? "bg-amber-50 group-hover:bg-amber-100" : "bg-gray-50 group-hover:bg-gray-100"
            )}>
              <CalendarX size={18} className={unbookedNextWeek.length > 0 ? "text-amber-500" : "text-gray-400"} />
            </div>
          </div>
        </div>

        {/* UTR */}
        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-secondary mb-1">UTR</p>
              <p className="text-2xl font-bold">{summary.utr != null ? Number(summary.utr).toFixed(2) : (summary.avgOrdersPerDriver != null ? Number(summary.avgOrdersPerDriver).toFixed(2) : "1.2")}</p>
              <p className="text-[11px] text-secondary mt-1">today</p>
            </div>
            <div className="p-2 bg-cyan-50 rounded-xl group-hover:bg-cyan-100 transition-colors">
              <BarChart3 size={18} className="text-cyan-500" />
            </div>
          </div>
        </div>

      </div>

      {/* Overdue Cash + Unbooked Drivers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Cash */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign size={16} className="text-red-500" />
              Overdue Cash
              {overdueCash.driverCount > 0 && (
                <span className="text-xs font-normal text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {overdueCash.totalAmount.toFixed(3)} KD
                </span>
              )}
            </h2>
            <button onClick={() => router.push("/talabat/cash")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
          {overdueCash.drivers.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {overdueCash.drivers.slice(0, 8).map((d: any) => (
                <div key={d.driverId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-secondary">{d.zone || "—"} · {d.daysSince}d overdue</p>
                  </div>
                  <span className="text-sm font-semibold text-red-500 flex-shrink-0">{d.totalPending.toFixed(3)} KD</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="p-3 bg-green-50 rounded-2xl">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-green-700">All Clear</p>
                <p className="text-xs text-secondary mt-0.5">No pending cash from any driver</p>
              </div>
              <div className="flex gap-4 pt-1">
                <div className="text-center">
                  <p className="text-xl font-bold">0</p>
                  <p className="text-[11px] text-secondary">drivers overdue</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <p className="text-xl font-bold">0.000</p>
                  <p className="text-[11px] text-secondary">KD outstanding</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <p className="text-xl font-bold">{totalAtt}</p>
                  <p className="text-[11px] text-secondary">active drivers</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unbooked Next 7 Days */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CalendarX size={16} className="text-amber-500" />
              No Shift Booked
              {unbookedNextWeek.length > 0 && (
                <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {unbookedNextWeek.length} drivers
                </span>
              )}
            </h2>
            <button onClick={() => router.push("/talabat/shifts")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Shifts <ChevronRight size={12} />
            </button>
          </div>
          {unbookedNextWeek.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {unbookedNextWeek.slice(0, 8).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-secondary">{d.zone || "—"} · {d.company}</p>
                  </div>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">No booking</span>
                </div>
              ))}
              {unbookedNextWeek.length > 8 && (
                <p className="text-xs text-secondary text-center pt-1">+{unbookedNextWeek.length - 8} more</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="p-3 bg-green-50 rounded-2xl">
                <CheckCircle2 size={28} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-green-700">All Booked</p>
                <p className="text-xs text-secondary mt-0.5">Every driver has a shift for next week</p>
              </div>
              <div className="flex gap-4 pt-1">
                <div className="text-center">
                  <p className="text-xl font-bold">0</p>
                  <p className="text-[11px] text-secondary">unbooked drivers</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <p className="text-xl font-bold">{totalAtt}</p>
                  <p className="text-[11px] text-secondary">shifts confirmed</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <p className="text-xl font-bold">{summary.driversOnLeave ?? 0}</p>
                  <p className="text-[11px] text-secondary">on leave</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Attendance + Zone + Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Shifts Donut */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Shifts</h2>
              <button
                onClick={() => router.push("/talabat/shifts")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Details <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex items-center gap-6">
              {/* Donut Chart */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-28 h-28 rounded-full"
                  style={{ background: donutGradient }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center flex-col">
                    <span className="text-lg font-bold">{totalAtt}</span>
                    <span className="text-[10px] text-secondary -mt-0.5">total</span>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600" />
                    <span className="text-sm">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{summary.presentCount || 0}</span>
                    <span className="text-xs text-secondary">{presentPct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{summary.lateCount || 0}</span>
                    <span className="text-xs text-secondary">{latePct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="text-sm">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{summary.absentCount || 0}</span>
                    <span className="text-xs text-secondary">{absentPct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                    <span className="text-sm">Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{leaveCount}</span>
                    <span className="text-xs text-secondary">{leavePct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone UTR */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MapPin size={14} className="text-secondary" />
              Zone UTR
            </h2>
            <span className="text-xs text-secondary">{zoneBreakdown.length} zones</span>
          </div>
          {zoneBreakdown.length > 0 ? (() => {
            const zonesWithUtr = zoneBreakdown
              .map((z: any) => ({ ...z, utr: z.sessions > 0 ? Math.round((z.deliveries / z.sessions) * 10) / 10 : 0 }))
              .sort((a: any, b: any) => b.utr - a.utr);
            const maxUtr = 2;
            return (
              <div className="space-y-3">
                {zonesWithUtr.slice(0, 6).map((z: any) => (
                  <div key={z.zone}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm truncate flex-1">{z.zone}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-secondary">{z.sessions} sess</span>
                        <span className="text-sm font-semibold">{z.utr}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${(z.utr / maxUtr) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-32 text-sm text-secondary">
              No zone data for today
            </div>
          )}
        </div>

        {/* Violations by Type */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert size={14} className="text-red-500" />
              Violation Breakdown
            </h2>
            <button
              onClick={() => router.push("/talabat/violations")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={12} />
            </button>
          </div>
          {violationsByType.length > 0 ? (
            <div className="space-y-2.5">
              {violationsByType
                .filter((v: any) => v.type !== "ORDER_CLICK_THROUGH" && v.type !== "ZONE_MISMATCH")
                .sort((a: any, b: any) => b.count - a.count)
                .map((v: any) => {
                  const color = getViolationColor(v.type);
                  const pct = totalViolations > 0 ? (v.count / totalViolations) * 100 : 0;
                  return (
                    <div key={v.type} className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", color.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs truncate">{v.type.replace(/_/g, " ")}</span>
                          <span className="text-xs font-semibold ml-2">{v.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", color.dot)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-sm text-secondary">
              <CheckCircle2 size={24} className="text-green-400 mb-2" />
              No active violations
            </div>
          )}
        </div>
      </div>

      {/* Timeline Charts */}
      <div className="flex flex-col gap-3">
        {/* Orders by Hour */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} className="text-secondary" />
              Deliveries per Hour
            </h2>
            <span className="text-xs text-secondary">Today</span>
          </div>
          <div className="flex items-end gap-[3px]" style={{ height: 120 }}>
            {hourly.filter((h: any) => h.hour >= 6 && h.hour <= 23).map((h: any) => {
              const barH = Math.max((h.orders / maxHourlyOrders) * 96, h.orders > 0 ? 4 : 0);
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full relative" style={{ height: 96 }}>
                    <div className="absolute bottom-0 w-full rounded-t transition-all duration-300 bg-gradient-to-t from-orange-500 to-orange-300 group-hover:from-orange-600 group-hover:to-orange-400" style={{ height: barH }} />
                    {h.orders > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {h.orders} orders
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-secondary">{h.hour === 12 ? "12p" : h.hour > 12 ? `${h.hour - 12}p` : `${h.hour}a`}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cash by Hour */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign size={14} className="text-secondary" />
              Cash Collected per Hour
            </h2>
            <span className="text-xs text-secondary">Today · KD</span>
          </div>
          <div className="flex items-end gap-[3px]" style={{ height: 120 }}>
            {hourly.filter((h: any) => h.hour >= 6 && h.hour <= 23).map((h: any) => {
              const cash = h.cash ?? 0;
              const barH = Math.max((cash / maxHourlyCash) * 96, cash > 0 ? 4 : 0);
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full relative" style={{ height: 96 }}>
                    <div className="absolute bottom-0 w-full rounded-t transition-all duration-300 bg-gradient-to-t from-green-500 to-green-300 group-hover:from-green-600 group-hover:to-green-400" style={{ height: barH }} />
                    {cash > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {cash.toFixed(3)} KD
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-secondary">{h.hour === 12 ? "12p" : h.hour > 12 ? `${h.hour - 12}p` : `${h.hour}a`}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions by Hour */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users size={14} className="text-secondary" />
              Active Sessions per Hour
            </h2>
            <span className="text-xs text-secondary">Today</span>
          </div>
          <div className="flex items-end gap-[3px]" style={{ height: 120 }}>
            {hourly.filter((h: any) => h.hour >= 6 && h.hour <= 23).map((h: any) => {
              const sess = h.sessions ?? 0;
              const barH = Math.max((sess / maxHourlySessions) * 96, sess > 0 ? 4 : 0);
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full relative" style={{ height: 96 }}>
                    <div className="absolute bottom-0 w-full rounded-t transition-all duration-300 bg-gradient-to-t from-blue-500 to-blue-300 group-hover:from-blue-600 group-hover:to-blue-400" style={{ height: barH }} />
                    {sess > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {sess} sessions
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-secondary">{h.hour === 12 ? "12p" : h.hour > 12 ? `${h.hour - 12}p` : `${h.hour}a`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Restaurants by Time Period */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShoppingBag size={14} className="text-secondary" />
            Top Restaurants
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["morning", "afternoon", "evening"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setRestaurantPeriod(p)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  restaurantPeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {p === "morning" ? "Morning 6a–12p" : p === "afternoon" ? "Afternoon 12p–5p" : "Evening 5p–11p"}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const list: any[] = byRestaurantPeriod[restaurantPeriod] || [];
          const maxOrders = Math.max(...list.map((r: any) => r.orders), 1);
          if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center h-20 text-sm text-secondary">
              <CheckCircle2 size={18} className="text-gray-300 mb-1" />
              No orders in this period yet
            </div>
          );
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {list.map((r: any) => {
                const logo = getRestaurantLogo(r.name);
                const pct = (r.orders / maxOrders) * 100;
                return (
                  <div key={r.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      {logo ? (
                        <Image src={logo} alt={r.name} width={20} height={20} className="w-5 h-5 rounded object-contain" unoptimized />
                      ) : (
                        <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 font-bold">{r.name[0]}</div>
                      )}
                      <span className="text-xs truncate flex-1">{r.name}</span>
                      <span className="text-xs font-semibold flex-shrink-0">{r.orders}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Driver Rankings Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Driver Rankings
            <span className="text-xs font-normal text-secondary bg-gray-100 px-2 py-0.5 rounded-full">{filteredDrivers.length}</span>
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[
                  { key: "rank", label: "#", cls: "w-12" },
                  { key: "driver", label: "Driver", sortable: false },
                  { key: "utr", label: "UTR", title: "Utilization Time Rate" },
                  { key: "batch", label: "Batch" },
                  { key: "grade", label: "Darb Grade" },
                  { key: "trend", label: "Trend", sortable: false },
                  { key: "orders", label: "Orders" },
                  { key: "cash", label: "Cash" },
                  { key: "pending", label: "Pending" },
                  { key: "attendance", label: "Attendance" },
                  { key: "alerts", label: "Alerts" },
                ].map(({ key, label, cls, title, sortable = true }) => (
                  <th
                    key={key}
                    title={title}
                    className={cn(
                      "text-left text-[11px] font-semibold text-secondary uppercase tracking-wider px-5 py-3 select-none",
                      sortable && "cursor-pointer hover:text-primary transition-colors",
                      cls
                    )}
                    onClick={sortable ? () => toggleSort(key) : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortable && sortCol === key && (
                        <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedDrivers.map((driver: any) => {
                const grade = getGradeLabel(driver.darbGrade);
                return (
                  <tr key={driver.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-orange-50/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/talabat/drivers/${driver.id}`)}
                  >
                    <td className="px-5 py-3 text-sm text-secondary font-medium">{driver.rank}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{cleanDriverName(driver.name)}</p>
                        <p className="text-xs text-secondary">{driver.company}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-secondary">{driver.utr || "-"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        driver.batchNumber === "1" ? "bg-green-50 text-green-600" :
                        driver.batchNumber === "2" ? "bg-blue-50 text-blue-600" :
                        driver.batchNumber && Number(driver.batchNumber) <= 4 ? "bg-yellow-50 text-yellow-600" :
                        driver.batchNumber ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
                      )}>
                        {driver.batchNumber || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{driver.darbGrade ?? "-"}</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", grade.colorClass)}>
                          {grade.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><TrendIcon trend={driver.gradeTrend} /></td>
                    <td className="px-5 py-3 text-sm font-semibold">{driver.todayOrders}</td>
                    <td className="px-5 py-3 text-sm">{driver.cashCollected.toFixed(3)} KD</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-sm font-medium",
                        driver.cashPending > 0 ? "text-red-500" : "text-green-600"
                      )}>
                        {driver.cashPending.toFixed(3)} KD
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        driver.attendance === "PRESENT" ? "bg-green-50 text-green-600" :
                        driver.attendance === "LATE" ? "bg-yellow-50 text-yellow-600" :
                        driver.attendance === "ABSENT" ? "bg-red-50 text-red-600" :
                        "bg-gray-100 text-gray-400"
                      )}>
                        {driver.attendance || "No data"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/talabat/drivers/${driver.id}?tab=violations`); }}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold transition-colors",
                          driver.alertCount > 0
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {driver.alertCount > 0 && <AlertTriangle size={11} />}
                        {driver.alertCount ?? 0}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-sm text-secondary">
                    {driverSearch ? "No drivers match your search" : "No driver data for today"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Show more / less */}
        {filteredDrivers.length > 15 && (
          <div className="px-5 py-3 border-t border-gray-100 text-center">
            <button
              onClick={() => setShowAllDrivers(!showAllDrivers)}
              className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
            >
              {showAllDrivers ? "Show Less" : `Show All ${filteredDrivers.length} Drivers`}
              <ChevronDown size={14} className={cn("transition-transform", showAllDrivers && "rotate-180")} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
