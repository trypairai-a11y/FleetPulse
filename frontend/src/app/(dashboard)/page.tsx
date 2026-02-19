"use client";

import { useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useDrivers } from "@/hooks/useDrivers";
import { useOrderSummary } from "@/hooks/useOrders";
import { useAttendanceSummary } from "@/hooks/useAttendance";
import { useTicketStats } from "@/hooks/useTickets";
import { useDevices } from "@/hooks/useDevices";
import { useCashSummary } from "@/hooks/useCash";
import { useAlerts } from "@/hooks/useAI";
import { formatKWD, formatRelativeTime } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Package, ArrowUpRight, ArrowDownRight,
  Clock, Bike, Car, AlertTriangle, CheckCircle2,
  Circle, Smartphone,
} from "lucide-react";

/* ── Local platform color map for avatars & bars ── */
const PLATFORM_COLOR_MAP: Record<string, string> = {
  talabat: "#FF5A00",
  keeta: "#FFD500",
  deliveroo: "#00CCBC",
  jahez: "#E31B54",
  carriage: "#E31B54",
};

/* ── Metric card ── */
function Metric({
  label,
  value,
  change,
  positive,
  icon: Icon,
  iconColor,
  delay,
  loading,
}: {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: React.ElementType;
  iconColor: string;
  delay: number;
  loading?: boolean;
}) {
  return (
    <div
      className="bg-white rounded-lg border border-[#E6E9EE] p-4 animate-in-view"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}0D` }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2} />
        </div>
        {change && !loading && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${
            positive ? "text-[#12B981]" : "text-[#E5484D]"
          }`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-[22px] w-16 mb-1" />
      ) : (
        <div className="text-[22px] font-bold text-[#0C1825] tracking-tight leading-none">
          {value}
        </div>
      )}
      <div className="text-[11px] text-[#6B7A8D] mt-1 font-medium">
        {label}
      </div>
    </div>
  );
}

/* ── Driver row ── */
function DriverRow({
  name,
  platform,
  status,
  vehicle,
}: {
  name: string;
  platform: string;
  status: string;
  vehicle: string;
}) {
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "Active", color: "#12B981", bg: "#12B9810D" },
    inactive: { label: "Inactive", color: "#6B7A8D", bg: "#6B7A8D0D" },
    on_leave: { label: "On Leave", color: "#F59E0B", bg: "#F59E0B0D" },
    suspended: { label: "Suspended", color: "#E5484D", bg: "#E5484D0D" },
    terminated: { label: "Terminated", color: "#6B7A8D", bg: "#6B7A8D0D" },
  };
  const s = statusConfig[status] || statusConfig.inactive;

  return (
    <div className="flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: PLATFORM_COLOR_MAP[platform] || "#6B7A8D" }}
        >
          {name.split(" ").map(w => w[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[#0C1825] truncate">{name}</div>
          <div className="text-[11px] text-[#6B7A8D] capitalize">{platform} &middot; {vehicle}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ color: s.color, backgroundColor: s.bg }}
        >
          <Circle className="w-1.5 h-1.5 fill-current" />
          {s.label}
        </span>
      </div>
    </div>
  );
}

/* ── Activity item ── */
function ActivityItem({
  text,
  time,
  type,
}: {
  text: string;
  time: string;
  type: "success" | "warning" | "info";
}) {
  const Icon = type === "success" ? CheckCircle2 : type === "warning" ? AlertTriangle : Clock;
  const color = type === "success" ? "#12B981" : type === "warning" ? "#F59E0B" : "#2563EB";

  return (
    <div className="flex gap-3 py-2.5">
      <div className="mt-0.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#374151] leading-relaxed">{text}</p>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{time}</p>
      </div>
    </div>
  );
}

/* ── Skeleton helpers ── */
function DriverRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-7 h-7 rounded-full" />
        <div>
          <Skeleton className="h-3.5 w-28 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded" />
    </div>
  );
}

function PlatformBarSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

/* ── Page ── */
export default function HomePage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Fetch real data
  const { data: driversData, isLoading: driversLoading } = useDrivers({ per_page: 100 });
  const { data: orderSummary, isLoading: ordersLoading } = useOrderSummary();
  const { data: attendanceSummary, isLoading: attendanceLoading } = useAttendanceSummary();
  const { data: ticketStats, isLoading: ticketsLoading } = useTicketStats();
  const { data: devicesData, isLoading: devicesLoading } = useDevices({ per_page: 100 });
  const { data: cashSummary, isLoading: cashLoading } = useCashSummary();
  const { data: alertsData } = useAlerts({ status: "active", per_page: 5 });
  const activeAlerts = alertsData?.items ?? [];

  // Derived values
  const drivers = useMemo(() => driversData?.items ?? [], [driversData]);
  const devices = useMemo(() => devicesData?.items ?? [], [devicesData]);

  const activeDriverCount = useMemo(
    () => drivers.filter((d) => d.status === "active").length,
    [drivers],
  );

  const ordersTotal = orderSummary?.total ?? 0;

  const attendanceRate = attendanceSummary?.attendance_rate ?? 0;

  const onlineDeviceCount = useMemo(() => {
    const threshold = 30 * 60 * 1000;
    return devices.filter((d) => {
      if (d.status !== "active") return false;
      if (!d.last_heartbeat_at) return false;
      // Compare elapsed time since heartbeat against 30-minute threshold
      return (Date.now() - new Date(d.last_heartbeat_at).getTime()) < threshold; // eslint-disable-line react-hooks/purity
    }).length;
  }, [devices]);

  const totalDevices = devices.length;

  const openTicketCount = useMemo(() => {
    if (!ticketStats?.by_status) return 0;
    return (ticketStats.by_status.open ?? 0) + (ticketStats.by_status.in_progress ?? 0);
  }, [ticketStats]);

  const todaysRevenue = cashSummary?.collected ?? 0;

  // Driver status chip counts
  const driverStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    drivers.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, [drivers]);

  const statusChips = [
    { label: isAr ? "نشط" : "Active", key: "active", color: "#12B981" },
    { label: isAr ? "غير نشط" : "Inactive", key: "inactive", color: "#6B7A8D" },
    { label: isAr ? "في إجازة" : "On Leave", key: "on_leave", color: "#F59E0B" },
    { label: isAr ? "موقوف" : "Suspended", key: "suspended", color: "#E5484D" },
  ];

  // Orders by platform
  const platformEntries = useMemo(() => {
    if (!orderSummary?.by_platform) return [];
    const total = orderSummary.total || 1;
    return Object.entries(orderSummary.by_platform)
      .map(([name, count]) => ({
        name,
        count,
        total,
        pct: Math.round((count / total) * 100),
        color: PLATFORM_COLORS[name.toLowerCase()]?.color || PLATFORM_COLOR_MAP[name.toLowerCase()] || "#6B7A8D",
      }))
      .sort((a, b) => b.count - a.count);
  }, [orderSummary]);

  // Show first 8 drivers
  const displayedDrivers = drivers.slice(0, 8);

  const t = {
    greeting: isAr ? "مرحباً" : "Good morning",
    subtitle: isAr ? "ملخص عمليات الأسطول اليوم" : "Here's your fleet operations summary for today",
    activeDrivers: isAr ? "سائقين نشطين" : "Active Drivers",
    ordersToday: isAr ? "طلبات اليوم" : "Orders Today",
    attendance: isAr ? "نسبة الحضور" : "Attendance",
    devicesOnline: isAr ? "أجهزة متصلة" : "Devices Online",
    openTickets: isAr ? "تذاكر مفتوحة" : "Open Tickets",
    revenue: isAr ? "إيرادات اليوم" : "Today's Revenue",
    liveDrivers: isAr ? "حالة السائقين" : "Driver Status",
    viewAll: isAr ? "عرض الكل" : "View all",
    ordersByPlatform: isAr ? "الطلبات حسب المنصة" : "Orders by Platform",
    recentActivity: isAr ? "النشاط الأخير" : "Recent Activity",
    fleetHealth: isAr ? "حالة الأسطول" : "Fleet Health",
  };

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* Greeting */}
      <div className="animate-in-view">
        <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
          {t.greeting}
        </h1>
        <p className="text-[13px] text-[#6B7A8D] mt-0.5">
          {t.subtitle}
        </p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Metric
          icon={Users}
          iconColor="#2563EB"
          label={t.activeDrivers}
          value={activeDriverCount}
          loading={driversLoading}
          delay={50}
        />
        <Metric
          icon={Package}
          iconColor="#12B981"
          label={t.ordersToday}
          value={ordersTotal}
          loading={ordersLoading}
          delay={100}
        />
        <Metric
          icon={Clock}
          iconColor="#F59E0B"
          label={t.attendance}
          value={`${Math.round(attendanceRate)}%`}
          loading={attendanceLoading}
          delay={150}
        />
        <Metric
          icon={Smartphone}
          iconColor="#8B5CF6"
          label={t.devicesOnline}
          value={`${onlineDeviceCount}/${totalDevices}`}
          loading={devicesLoading}
          delay={200}
        />
        <Metric
          icon={AlertTriangle}
          iconColor="#E5484D"
          label={t.openTickets}
          value={openTicketCount}
          loading={ticketsLoading}
          delay={250}
        />
        <Metric
          icon={Package}
          iconColor="#0C1825"
          label={t.revenue}
          value={formatKWD(todaysRevenue)}
          loading={cashLoading}
          delay={300}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Driver status — takes 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E6E9EE] animate-in-view" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[#0C1825]">{t.liveDrivers}</h3>
            <button className="text-[11px] font-medium text-[#2563EB] hover:text-[#1d4ed8] transition-colors">
              {t.viewAll} →
            </button>
          </div>

          {/* Compact status chips */}
          <div className="flex gap-2 px-4 pb-3">
            {driversLoading ? (
              <>
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
              </>
            ) : (
              statusChips.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F7F8FA]">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-[#6B7A8D]">{s.label}</span>
                  <span className="text-[11px] font-bold text-[#0C1825]">{driverStatusCounts[s.key] || 0}</span>
                </div>
              ))
            )}
          </div>

          {/* Driver list */}
          <div className="px-4 pb-3 divide-y divide-[#F0F2F5]">
            {driversLoading ? (
              Array.from({ length: 6 }).map((_, i) => <DriverRowSkeleton key={i} />)
            ) : displayedDrivers.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#6B7A8D]">
                {isAr ? "لا يوجد سائقين" : "No drivers found"}
              </div>
            ) : (
              displayedDrivers.map((driver) => (
                <DriverRow
                  key={driver.id}
                  name={isAr && driver.name_ar ? driver.name_ar : driver.name}
                  platform={driver.platform || "—"}
                  status={driver.status}
                  vehicle="—"
                />
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* Orders by platform */}
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-4 animate-in-view" style={{ animationDelay: "250ms" }}>
            <h3 className="text-[13px] font-semibold text-[#0C1825] mb-3">{t.ordersByPlatform}</h3>
            <div className="space-y-3">
              {ordersLoading ? (
                Array.from({ length: 4 }).map((_, i) => <PlatformBarSkeleton key={i} />)
              ) : platformEntries.length === 0 ? (
                <div className="py-4 text-center text-[12px] text-[#6B7A8D]">
                  {isAr ? "لا توجد طلبات اليوم" : "No orders today"}
                </div>
              ) : (
                platformEntries.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />
                        <span className="text-[12px] font-medium text-[#374151] capitalize">{p.name}</span>
                      </div>
                      <span className="text-[12px] tabular-nums text-[#6B7A8D]">
                        {p.count} <span className="text-[#B0B8C4]">({p.pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#F0F2F5] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fleet health (static) */}
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-4 animate-in-view" style={{ animationDelay: "300ms" }}>
            <h3 className="text-[13px] font-semibold text-[#0C1825] mb-3">{t.fleetHealth}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Bike, label: isAr ? "دراجات" : "Motorcycles", value: "3/3", status: "ok" },
                { icon: Car, label: isAr ? "سيارات" : "Cars", value: "2/2", status: "ok" },
                { icon: AlertTriangle, label: isAr ? "صيانة" : "Maintenance", value: "1", status: "warn" },
                { icon: CheckCircle2, label: isAr ? "الفحوصات" : "Inspections", value: isAr ? "محدّث" : "Up to date", status: "ok" },
              ].map((item) => (
                <div key={item.label} className="p-2.5 rounded-md bg-[#F7F8FA]">
                  <item.icon
                    className="w-3.5 h-3.5 mb-1.5"
                    style={{ color: item.status === "warn" ? "#F59E0B" : "#12B981" }}
                    strokeWidth={2}
                  />
                  <div className="text-[13px] font-bold text-[#0C1825] leading-none">{item.value}</div>
                  <div className="text-[10px] text-[#6B7A8D] mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts (live data) */}
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-4 animate-in-view" style={{ animationDelay: "350ms" }}>
            <h3 className="text-[13px] font-semibold text-[#0C1825] mb-1">
              {isAr ? "التنبيهات النشطة" : "Active Alerts"}
            </h3>
            <div className="divide-y divide-[#F0F2F5]">
              {activeAlerts.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-[#12B981] mx-auto mb-1" />
                  <p className="text-[11px] text-[#6B7A8D]">
                    {isAr ? "لا توجد تنبيهات" : "No active alerts"}
                  </p>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <ActivityItem
                    key={alert.id}
                    type={alert.severity === "critical" || alert.severity === "high" ? "warning" : alert.severity === "medium" ? "info" : "success"}
                    text={isAr ? (alert.title_ar || alert.title) : alert.title}
                    time={formatRelativeTime(alert.created_at)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
