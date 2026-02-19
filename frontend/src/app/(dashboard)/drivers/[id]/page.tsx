"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MapPin,
  Package,
  Clock,
  Banknote,
  User,
  Smartphone,
  Car,
  ClipboardCheck,
  Ticket,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useDriver, useDriverStats } from "@/hooks/useDrivers";
import { useDriverScore } from "@/hooks/useAI";
import { useOrders } from "@/hooks/useOrders";
import { useAttendance } from "@/hooks/useAttendance";
import { useCash } from "@/hooks/useCash";
import { useTickets } from "@/hooks/useTickets";
import { useVehicle } from "@/hooks/useVehicles";
import type { CapturedOrder } from "@/types/order";
import type { AttendanceRecord } from "@/types/attendance";
import type { CashRecord } from "@/types/cash";
import type { Ticket as TicketType } from "@/types/ticket";
import {
  DRIVER_STATUS_CONFIG,
  PLATFORM_COLORS,
  ATTENDANCE_STATUS_CONFIG,
  CASH_STATUS_CONFIG,
  TICKET_STATUS_CONFIG,
  TICKET_PRIORITY_CONFIG,
  TICKET_CATEGORIES,
  VEHICLE_STATUS_CONFIG,
} from "@/lib/constants";
import { formatKWD, formatDate, formatDateTime } from "@/lib/utils";

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  const id = params.id as string;
  const { data: driver, isLoading: driverLoading } = useDriver(id);
  const { data: stats, isLoading: statsLoading } = useDriverStats(id);

  // Data hooks for tabs
  const { data: ordersData, isLoading: ordersLoading } = useOrders({
    driver_id: id,
    per_page: 20,
  });
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance({
    driver_id: id,
    per_page: 20,
  });
  const { data: cashData, isLoading: cashLoading } = useCash({
    driver_id: id,
    per_page: 20,
  });
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({
    driver_id: id,
    per_page: 20,
  });
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(
    driver?.current_vehicle_id ?? ""
  );
  const { data: scoreHistory } = useDriverScore(id);
  const latestScore = scoreHistory?.[scoreHistory.length - 1];

  const [activeTab, setActiveTab] = useState("overview");

  if (driverLoading) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/drivers")}
          className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isAr ? "العودة" : "Back"}
        </Button>
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 text-center">
          <p className="text-[14px] font-semibold text-[#0C1825]">
            {isAr ? "السائق غير موجود" : "Driver not found"}
          </p>
          <p className="text-[12px] text-[#6B7A8D] mt-1">
            {isAr
              ? "السائق المطلوب غير موجود أو تم حذفه"
              : "The requested driver does not exist or has been removed"}
          </p>
        </div>
      </div>
    );
  }

  const platformColor =
    PLATFORM_COLORS[driver.platform ?? ""]?.color ?? "#6B7A8D";
  const initials = driver.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  const infoItems = [
    {
      icon: Phone,
      labelEn: "Phone",
      labelAr: "الهاتف",
      value: driver.phone,
      dir: "ltr" as const,
    },
    {
      icon: Mail,
      labelEn: "Email",
      labelAr: "البريد الإلكتروني",
      value: driver.email || "\u2014",
      dir: "ltr" as const,
    },
    {
      icon: CreditCard,
      labelEn: "Employee ID",
      labelAr: "الرقم الوظيفي",
      value: driver.employee_id || "\u2014",
      mono: true,
    },
    {
      icon: MapPin,
      labelEn: "Nationality",
      labelAr: "الجنسية",
      value: driver.nationality || "\u2014",
    },
    {
      icon: Calendar,
      labelEn: "Hire Date",
      labelAr: "تاريخ التوظيف",
      value: formatDate(driver.hire_date, language),
    },
    {
      icon: CreditCard,
      labelEn: "License Number",
      labelAr: "رقم الرخصة",
      value: driver.license_number || "\u2014",
    },
    {
      icon: Calendar,
      labelEn: "License Expiry",
      labelAr: "انتهاء الرخصة",
      value: formatDate(driver.license_expiry, language),
    },
    {
      icon: User,
      labelEn: "License Group",
      labelAr: "مجموعة الرخصة",
      value: driver.license_group || "\u2014",
    },
    {
      icon: Car,
      labelEn: "Vehicle",
      labelAr: "المركبة",
      value: driver.current_vehicle_id || "\u2014",
    },
    {
      icon: Smartphone,
      labelEn: "Device",
      labelAr: "الجهاز",
      value: driver.device_id || "\u2014",
    },
  ];

  const tabItems = [
    { value: "overview", labelEn: "Overview", labelAr: "نظرة عامة" },
    { value: "attendance", labelEn: "Attendance", labelAr: "الحضور" },
    { value: "orders", labelEn: "Orders", labelAr: "الطلبات" },
    { value: "vehicle", labelEn: "Vehicle", labelAr: "المركبة" },
    { value: "cash", labelEn: "Cash", labelAr: "النقدية" },
    { value: "tickets", labelEn: "Tickets", labelAr: "التذاكر" },
  ];

  // Recent orders for overview tab (last 5)
  const recentOrders = (ordersData?.items ?? []).slice(0, 5);

  // Attendance table columns
  const attendanceColumns = [
    {
      key: "date",
      headerEn: "Date",
      headerAr: "التاريخ",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#0C1825]">
          {formatDate(r.date, language)}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (r: AttendanceRecord) => (
        <StatusBadge
          status={r.status}
          config={ATTENDANCE_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "scheduled_start",
      headerEn: "Scheduled Start",
      headerAr: "البداية المجدولة",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#0C1825]">
          {r.scheduled_start ?? "\u2014"}
        </span>
      ),
    },
    {
      key: "actual_start",
      headerEn: "Actual Start",
      headerAr: "البداية الفعلية",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#0C1825]">
          {r.actual_start ?? "\u2014"}
        </span>
      ),
    },
    {
      key: "late_minutes",
      headerEn: "Late Minutes",
      headerAr: "دقائق التأخير",
      render: (r: AttendanceRecord) => (
        <span
          className={`text-[12px] ${r.late_minutes > 0 ? "text-[#E5484D] font-semibold" : "text-[#6B7A8D]"}`}
        >
          {r.late_minutes > 0 ? `${r.late_minutes}m` : "\u2014"}
        </span>
      ),
    },
    {
      key: "source",
      headerEn: "Source",
      headerAr: "المصدر",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#6B7A8D] capitalize">
          {r.source}
        </span>
      ),
    },
  ];

  // Orders table columns
  const orderColumns = [
    {
      key: "captured_at",
      headerEn: "Date",
      headerAr: "التاريخ",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#0C1825]">
          {formatDateTime(o.captured_at, language)}
        </span>
      ),
    },
    {
      key: "order_ref",
      headerEn: "Order Ref",
      headerAr: "رقم الطلب",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#0C1825] font-mono">
          {o.order_ref ?? "\u2014"}
        </span>
      ),
    },
    {
      key: "platform",
      headerEn: "Platform",
      headerAr: "المنصة",
      render: (o: CapturedOrder) => <PlatformBadge platform={o.platform} />,
    },
    {
      key: "amount",
      headerEn: "Amount",
      headerAr: "المبلغ",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#0C1825] font-semibold">
          {o.amount != null ? formatKWD(o.amount) : "\u2014"}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#6B7A8D] capitalize">
          {o.status}
        </span>
      ),
    },
  ];

  // Cash table columns
  const cashColumns = [
    {
      key: "date",
      headerEn: "Date",
      headerAr: "التاريخ",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#0C1825]">
          {formatDate(r.date, language)}
        </span>
      ),
    },
    {
      key: "record_type",
      headerEn: "Type",
      headerAr: "النوع",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#0C1825] capitalize">
          {r.record_type}
        </span>
      ),
    },
    {
      key: "amount",
      headerEn: "Amount",
      headerAr: "المبلغ",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#0C1825] font-semibold">
          {formatKWD(r.amount)}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (r: CashRecord) => (
        <StatusBadge
          status={r.status}
          config={CASH_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "notes",
      headerEn: "Notes",
      headerAr: "ملاحظات",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#6B7A8D] truncate max-w-[200px] block">
          {r.notes ?? "\u2014"}
        </span>
      ),
    },
  ];

  // Tickets table columns
  const ticketColumns = [
    {
      key: "title",
      headerEn: "Title",
      headerAr: "العنوان",
      render: (t: TicketType) => (
        <span className="text-[12px] text-[#0C1825] font-medium">
          {isAr && t.title_ar ? t.title_ar : t.title}
        </span>
      ),
    },
    {
      key: "category",
      headerEn: "Category",
      headerAr: "الفئة",
      render: (t: TicketType) => {
        const cat = TICKET_CATEGORIES.find((c) => c.value === t.category);
        return (
          <span className="text-[12px] text-[#6B7A8D]">
            {cat ? (isAr ? cat.labelAr : cat.labelEn) : t.category}
          </span>
        );
      },
    },
    {
      key: "priority",
      headerEn: "Priority",
      headerAr: "الأولوية",
      render: (t: TicketType) => (
        <StatusBadge
          status={t.priority}
          config={TICKET_PRIORITY_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (t: TicketType) => (
        <StatusBadge
          status={t.status}
          config={TICKET_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "created_at",
      headerEn: "Created",
      headerAr: "تاريخ الإنشاء",
      render: (t: TicketType) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {formatDate(t.created_at, language)}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/drivers")}
        className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1 -mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isAr ? "العودة للسائقين" : "Back to Drivers"}
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
            style={{ background: platformColor }}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
                {driver.name}
              </h1>
              <PlatformBadge platform={driver.platform} />
              <StatusBadge
                status={driver.status}
                config={DRIVER_STATUS_CONFIG}
                language={language}
              />
            </div>
            {driver.name_ar && (
              <p className="text-[12px] text-[#6B7A8D] mt-0.5">
                {driver.name_ar}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="h-8 px-3 text-[12px] text-[#6B7A8D] border-[#E6E9EE] gap-1.5"
        >
          <Edit className="w-3 h-3" />
          {isAr ? "تعديل" : "Edit"}
        </Button>
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {infoItems.map((item) => (
            <div key={item.labelEn} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <item.icon className="w-3 h-3 text-[#9CA3AF]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D]">
                  {isAr ? item.labelAr : item.labelEn}
                </span>
              </div>
              <p
                className={`text-[13px] text-[#0C1825] ${item.mono ? "font-mono" : ""}`}
                dir={item.dir}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {driver.notes && (
          <div className="mt-4 pt-3 border-t border-[#F0F2F5]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D]">
              {isAr ? "ملاحظات" : "Notes"}
            </span>
            <p className="text-[12px] text-[#374151] mt-1 leading-relaxed">
              {driver.notes}
            </p>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingUp}
          iconColor="#7C3AED"
          label={isAr ? "درجة الأداء" : "AI Score"}
          value={
            latestScore
              ? `${latestScore.composite_score.toFixed(0)}/100`
              : "\u2014"
          }
        />
        <StatCard
          icon={Package}
          iconColor="#2563EB"
          label={isAr ? "عدد الطلبات" : "Order Count"}
          value={statsLoading ? "\u2014" : (stats?.order_count ?? 0)}
        />
        <StatCard
          icon={Clock}
          iconColor="#12B981"
          label={isAr ? "نسبة الحضور" : "Attendance Rate"}
          value={
            statsLoading
              ? "\u2014"
              : `${(stats?.attendance_rate ?? 0).toFixed(1)}%`
          }
        />
        <StatCard
          icon={Banknote}
          iconColor="#F59E0B"
          label={isAr ? "نقدية معلقة" : "Outstanding Cash"}
          value={
            statsLoading
              ? "\u2014"
              : formatKWD(stats?.outstanding_cash ?? 0)
          }
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="border-b border-[#E6E9EE] w-full justify-start">
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-[12px] px-3 py-2"
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Recent Activity Section */}
            <div className="bg-white rounded-lg border border-[#E6E9EE]">
              <div className="px-4 py-3 border-b border-[#E6E9EE]">
                <h3 className="text-[13px] font-semibold text-[#0C1825]">
                  {isAr ? "النشاط الأخير" : "Recent Activity"}
                </h3>
                <p className="text-[11px] text-[#6B7A8D] mt-0.5">
                  {isAr ? "آخر 5 طلبات" : "Last 5 orders"}
                </p>
              </div>
              {ordersLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[12px] text-[#6B7A8D]">
                    {isAr ? "لا توجد طلبات حديثة" : "No recent orders"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F2F5]">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-[#6B7A8D]">
                          {formatDateTime(order.captured_at, language)}
                        </span>
                        <PlatformBadge platform={order.platform} />
                        {order.order_ref && (
                          <span className="text-[12px] text-[#0C1825] font-mono">
                            {order.order_ref}
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-[#0C1825] font-semibold">
                        {order.amount != null ? formatKWD(order.amount) : "\u2014"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          {attendanceLoading ? (
            <DataTable<AttendanceRecord>
              columns={attendanceColumns}
              data={[]}
              loading={true}
              language={language}
              rowKey={(r) => r.id}
            />
          ) : (attendanceData?.items ?? []).length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              titleEn="No attendance records"
              titleAr="لا توجد سجلات حضور"
              descriptionEn="Attendance records for this driver will appear here"
              descriptionAr="سجلات حضور وانصراف هذا السائق ستظهر هنا"
            />
          ) : (
            <DataTable<AttendanceRecord>
              columns={attendanceColumns}
              data={attendanceData?.items ?? []}
              language={language}
              rowKey={(r) => r.id}
            />
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          {ordersLoading ? (
            <DataTable<CapturedOrder>
              columns={orderColumns}
              data={[]}
              loading={true}
              language={language}
              rowKey={(o) => o.id}
            />
          ) : (ordersData?.items ?? []).length === 0 ? (
            <EmptyState
              icon={Package}
              titleEn="No orders"
              titleAr="لا توجد طلبات"
              descriptionEn="Orders for this driver will appear here"
              descriptionAr="طلبات هذا السائق ستظهر هنا"
            />
          ) : (
            <DataTable<CapturedOrder>
              columns={orderColumns}
              data={ordersData?.items ?? []}
              language={language}
              rowKey={(o) => o.id}
            />
          )}
        </TabsContent>

        {/* Vehicle Tab */}
        <TabsContent value="vehicle">
          {!driver.current_vehicle_id ? (
            <EmptyState
              icon={Car}
              titleEn="No vehicle assigned"
              titleAr="لا توجد مركبة مخصصة"
              descriptionEn="This driver does not have a vehicle assigned"
              descriptionAr="لم يتم تخصيص مركبة لهذا السائق"
            />
          ) : vehicleLoading ? (
            <div className="bg-white rounded-lg border border-[#E6E9EE] p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </div>
          ) : !vehicle ? (
            <EmptyState
              icon={AlertCircle}
              titleEn="Vehicle not found"
              titleAr="المركبة غير موجودة"
              descriptionEn="The assigned vehicle could not be loaded"
              descriptionAr="تعذر تحميل بيانات المركبة المخصصة"
            />
          ) : (
            <div className="bg-white rounded-lg border border-[#E6E9EE] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-[#0C1825]">
                  {vehicle.plate_number}
                </h3>
                <StatusBadge
                  status={vehicle.status}
                  config={VEHICLE_STATUS_CONFIG}
                  language={language}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  {
                    labelEn: "Plate Number",
                    labelAr: "رقم اللوحة",
                    value: vehicle.plate_number,
                  },
                  {
                    labelEn: "Make",
                    labelAr: "الشركة المصنعة",
                    value: vehicle.make ?? "\u2014",
                  },
                  {
                    labelEn: "Model",
                    labelAr: "الموديل",
                    value: vehicle.model ?? "\u2014",
                  },
                  {
                    labelEn: "Year",
                    labelAr: "السنة",
                    value: vehicle.year?.toString() ?? "\u2014",
                  },
                  {
                    labelEn: "Type",
                    labelAr: "النوع",
                    value: vehicle.vehicle_type,
                  },
                  {
                    labelEn: "Ownership",
                    labelAr: "الملكية",
                    value: vehicle.ownership,
                  },
                  {
                    labelEn: "Mileage",
                    labelAr: "المسافة المقطوعة",
                    value:
                      vehicle.current_mileage != null
                        ? `${vehicle.current_mileage.toLocaleString()} km`
                        : "\u2014",
                  },
                  {
                    labelEn: "Color",
                    labelAr: "اللون",
                    value: vehicle.color ?? "\u2014",
                  },
                  {
                    labelEn: "Fuel Type",
                    labelAr: "نوع الوقود",
                    value: vehicle.fuel_type ?? "\u2014",
                  },
                  {
                    labelEn: "Insurance Expiry",
                    labelAr: "انتهاء التأمين",
                    value: formatDate(vehicle.insurance_expiry, language),
                  },
                  {
                    labelEn: "Registration Expiry",
                    labelAr: "انتهاء التسجيل",
                    value: formatDate(vehicle.registration_expiry, language),
                  },
                  ...(vehicle.rental_company
                    ? [
                        {
                          labelEn: "Rental Company",
                          labelAr: "شركة التأجير",
                          value: vehicle.rental_company,
                        },
                      ]
                    : []),
                ].map((field) => (
                  <div key={field.labelEn} className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D]">
                      {isAr ? field.labelAr : field.labelEn}
                    </span>
                    <p className="text-[13px] text-[#0C1825] capitalize">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
              {vehicle.notes && (
                <div className="mt-4 pt-3 border-t border-[#F0F2F5]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D]">
                    {isAr ? "ملاحظات" : "Notes"}
                  </span>
                  <p className="text-[12px] text-[#374151] mt-1 leading-relaxed">
                    {vehicle.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Cash Tab */}
        <TabsContent value="cash">
          {cashLoading ? (
            <DataTable<CashRecord>
              columns={cashColumns}
              data={[]}
              loading={true}
              language={language}
              rowKey={(r) => r.id}
            />
          ) : (cashData?.items ?? []).length === 0 ? (
            <EmptyState
              icon={Banknote}
              titleEn="No cash records"
              titleAr="لا توجد سجلات نقدية"
              descriptionEn="Cash records for this driver will appear here"
              descriptionAr="سجلات النقدية لهذا السائق ستظهر هنا"
            />
          ) : (
            <DataTable<CashRecord>
              columns={cashColumns}
              data={cashData?.items ?? []}
              language={language}
              rowKey={(r) => r.id}
            />
          )}
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          {ticketsLoading ? (
            <DataTable<TicketType>
              columns={ticketColumns}
              data={[]}
              loading={true}
              language={language}
              rowKey={(t) => t.id}
            />
          ) : (ticketsData?.items ?? []).length === 0 ? (
            <EmptyState
              icon={Ticket}
              titleEn="No tickets"
              titleAr="لا توجد تذاكر"
              descriptionEn="Tickets for this driver will appear here"
              descriptionAr="تذاكر هذا السائق ستظهر هنا"
            />
          ) : (
            <DataTable<TicketType>
              columns={ticketColumns}
              data={ticketsData?.items ?? []}
              language={language}
              rowKey={(t) => t.id}
              onRowClick={(t) => router.push(`/tickets/${t.id}`)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
