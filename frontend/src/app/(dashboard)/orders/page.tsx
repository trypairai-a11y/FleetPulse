"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Package, BarChart3, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatCard } from "@/components/shared/StatCard";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportButton } from "@/components/shared/ExportButton";
import { useOrders, useOrderSummary, useHourlyDistribution } from "@/hooks/useOrders";
import { usePagination } from "@/hooks/usePagination";
import { PLATFORM_COLORS } from "@/lib/constants";
import { formatKWD, formatDateTime } from "@/lib/utils";
import type { CapturedOrder } from "@/types/order";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function OrdersPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const [selectedDate, setSelectedDate] = useState("");

  // Pagination
  const { page, perPage, goToPage } = usePagination({
    initialPage: 1,
    initialPerPage: 20,
  });

  // Hooks
  const { data: summary, isLoading: summaryLoading } = useOrderSummary(
    selectedDate || undefined
  );
  const { data: hourlyData, isLoading: hourlyLoading } =
    useHourlyDistribution(selectedDate || undefined);
  const { data: ordersData, isLoading: ordersLoading } = useOrders({
    date_from: selectedDate || undefined,
    date_to: selectedDate || undefined,
    page,
    per_page: perPage,
  });

  const orders = ordersData?.items ?? [];
  const total = ordersData?.total ?? 0;
  const pages = ordersData?.pages ?? 1;

  // Chart data: pad hours 0-23
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const found = hourlyData?.find((h) => h.hour === hour);
    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      count: found?.count ?? 0,
    };
  });

  // Platform breakdown from summary
  const platformBreakdown = summary?.by_platform
    ? Object.entries(summary.by_platform).map(([platform, count]) => ({
        platform,
        count,
        amount: summary.by_platform_amount?.[platform] ?? 0,
        color: PLATFORM_COLORS[platform]?.color ?? "#6B7A8D",
        bg: PLATFORM_COLORS[platform]?.bg ?? "#6B7A8D0D",
      }))
    : [];

  // Table columns
  const columns = [
    {
      key: "platform",
      headerEn: "Platform",
      headerAr: "المنصة",
      render: (o: CapturedOrder) => <PlatformBadge platform={o.platform} />,
    },
    {
      key: "order_ref",
      headerEn: "Order Ref",
      headerAr: "رقم الطلب",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#0C1825] font-mono">
          {o.order_ref || "\u2014"}
        </span>
      ),
    },
    {
      key: "driver_id",
      headerEn: "Driver",
      headerAr: "السائق",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#6B7A8D] font-mono">
          {o.driver_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "amount",
      headerEn: "Amount",
      headerAr: "المبلغ",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#0C1825] font-medium tabular-nums">
          {o.amount != null ? formatKWD(o.amount) : "\u2014"}
        </span>
      ),
    },
    {
      key: "captured_at",
      headerEn: "Captured At",
      headerAr: "وقت الالتقاط",
      render: (o: CapturedOrder) => (
        <span className="text-[12px] text-[#6B7A8D] tabular-nums">
          {formatDateTime(o.captured_at, language)}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (o: CapturedOrder) => (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize"
          style={{
            color:
              o.status === "captured"
                ? "#12B981"
                : o.status === "pending"
                  ? "#F59E0B"
                  : "#6B7A8D",
            backgroundColor:
              o.status === "captured"
                ? "#12B9810D"
                : o.status === "pending"
                  ? "#F59E0B0D"
                  : "#6B7A8D0D",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {o.status}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <PageHeader
        titleEn="Orders"
        titleAr="الطلبات"
        subtitleEn="Auto-captured from platform notifications"
        subtitleAr="طلبات ملتقطة تلقائيا من إشعارات المنصات"
        actions={
          <ExportButton url="/api/orders/export" filename="orders.csv" />
        }
      />

      {/* Date filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-[12px] font-medium text-[#6B7A8D]">
            {isAr ? "التاريخ" : "Date"}
          </Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 w-[160px] text-[12px] bg-white border-[#E6E9EE]"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-[11px] text-[#2563EB] hover:text-[#1d4ed8] font-medium transition-colors"
            >
              {isAr ? "مسح" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          iconColor="#2563EB"
          label={isAr ? "إجمالي الطلبات" : "Total Orders"}
          value={summaryLoading ? "\u2014" : (summary?.total ?? 0)}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="#12B981"
          label={isAr ? "إجمالي المبلغ" : "Total Amount"}
          value={
            summaryLoading
              ? "\u2014"
              : formatKWD(summary?.total_amount ?? 0)
          }
        />
        {platformBreakdown.slice(0, 2).map((pb) => (
          <StatCard
            key={pb.platform}
            icon={Package}
            iconColor={pb.color}
            label={pb.platform.charAt(0).toUpperCase() + pb.platform.slice(1)}
            value={pb.count}
          />
        ))}
      </div>

      {/* Platform breakdown cards (remaining) */}
      {platformBreakdown.length > 2 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {platformBreakdown.slice(2).map((pb) => (
            <div
              key={pb.platform}
              className="bg-white rounded-lg border border-[#E6E9EE] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: pb.color }}
                />
                <span className="text-[12px] font-medium text-[#374151] capitalize">
                  {pb.platform}
                </span>
              </div>
              <div className="text-[18px] font-bold text-[#0C1825] tabular-nums">
                {pb.count}
              </div>
              <div className="text-[11px] text-[#6B7A8D] tabular-nums">
                {formatKWD(pb.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hourly distribution chart */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#6B7A8D]" />
          <h3 className="text-[13px] font-semibold text-[#0C1825]">
            {isAr ? "التوزيع بالساعة" : "Hourly Distribution"}
          </h3>
        </div>
        {hourlyLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-[12px] text-[#9CA3AF]">
              {isAr ? "جاري التحميل..." : "Loading..."}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F0F2F5"
                vertical={false}
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#6B7A8D" }}
                tickLine={false}
                axisLine={{ stroke: "#E6E9EE" }}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7A8D" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  border: "1px solid #E6E9EE",
                  borderRadius: "6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                labelStyle={{ fontWeight: 600, color: "#0C1825" }}
                itemStyle={{ color: "#6B7A8D" }}
              />
              <Bar
                dataKey="count"
                fill="#2563EB"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                name={isAr ? "طلبات" : "Orders"}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders table */}
      {!ordersLoading && orders.length === 0 ? (
        <EmptyState
          icon={Package}
          titleEn="No orders yet"
          titleAr="لا توجد طلبات بعد"
          descriptionEn="Orders will appear automatically once captured from driver phone notifications."
          descriptionAr="ستظهر الطلبات تلقائيا عند التقاطها من إشعارات هواتف السائقين."
        />
      ) : (
        <>
          <DataTable<CapturedOrder>
            columns={columns}
            data={orders}
            loading={ordersLoading}
            emptyMessage={isAr ? "لا توجد طلبات" : "No orders found"}
            language={language}
            rowKey={(o) => o.id}
          />
          {total > 0 && (
            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPageChange={goToPage}
            />
          )}
        </>
      )}
    </div>
  );
}
