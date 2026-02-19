"use client";

import { useState, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  ClipboardCheck,
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportButton } from "@/components/shared/ExportButton";
import { useAttendance, useAttendanceSummary } from "@/hooks/useAttendance";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { AttendanceRecord } from "@/types/attendance";

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AttendancePage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  // State
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);
  const { page, perPage, goToPage, resetPage } = usePagination({ initialPerPage: 20 });

  // Display today's date
  const todayDisplay = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d.toLocaleDateString(isAr ? "ar-KW" : "en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, [selectedDate, isAr]);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary(selectedDate);
  const { data: attendanceData, isLoading: tableLoading } = useAttendance({
    date_from: selectedDate,
    date_to: selectedDate,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    per_page: perPage,
  });

  const records = attendanceData?.items ?? [];
  const total = attendanceData?.total ?? 0;
  const pages = attendanceData?.pages ?? 1;

  // Summary values
  const presentCount = summary?.summary?.present ?? 0;
  const lateCount = summary?.summary?.late ?? 0;
  const absentCount = summary?.summary?.absent ?? 0;
  const attendanceRate = summary?.attendance_rate ?? 0;
  const avgLateMin = summary?.avg_late_minutes ?? 0;

  // Status filter options
  const statusOptions = Object.entries(ATTENDANCE_STATUS_CONFIG).map(([value, cfg]) => ({
    value,
    labelEn: cfg.labelEn,
    labelAr: cfg.labelAr,
  }));

  // Table columns
  const columns = [
    {
      key: "driver",
      headerEn: "Driver",
      headerAr: "السائق",
      render: (r: AttendanceRecord) => (
        <span className="text-[13px] font-medium text-[#0C1825]">
          {r.driver_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "date",
      headerEn: "Date",
      headerAr: "التاريخ",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#6B7A8D]">{formatDate(r.date, language)}</span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (r: AttendanceRecord) => (
        <StatusBadge status={r.status} config={ATTENDANCE_STATUS_CONFIG} language={language} />
      ),
    },
    {
      key: "scheduled_start",
      headerEn: "Scheduled Start",
      headerAr: "البداية المجدولة",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
          {formatDateTime(r.scheduled_start, language)}
        </span>
      ),
    },
    {
      key: "actual_start",
      headerEn: "Actual Start",
      headerAr: "البداية الفعلية",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
          {formatDateTime(r.actual_start, language)}
        </span>
      ),
    },
    {
      key: "late_minutes",
      headerEn: "Late Min",
      headerAr: "دقائق التأخير",
      render: (r: AttendanceRecord) => (
        <span
          className={`text-[12px] tabular-nums font-medium ${
            r.late_minutes > 0 ? "text-[#E5484D]" : "text-[#6B7A8D]"
          }`}
        >
          {r.late_minutes > 0 ? `${r.late_minutes}` : "0"}
        </span>
      ),
    },
    {
      key: "source",
      headerEn: "Source",
      headerAr: "المصدر",
      render: (r: AttendanceRecord) => (
        <span className="text-[12px] text-[#6B7A8D] capitalize">{r.source}</span>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <PageHeader
        titleEn="Attendance"
        titleAr="الحضور"
        subtitleEn={todayDisplay}
        subtitleAr={todayDisplay}
        actions={
          <>
            <Button className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {isAr ? "تسجيل يدوي" : "Manual Log"}
            </Button>
            <ExportButton url="/api/attendance/export" filename="attendance.csv" />
          </>
        }
      />

      {/* Date picker */}
      <div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            resetPage();
          }}
          className="h-8 w-[160px] text-[12px] bg-white border-[#E6E9EE] text-[#0C1825]"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={isAr ? "حاضر" : "Present"}
          value={summaryLoading ? "..." : presentCount}
          icon={CheckCircle}
          iconColor="#12B981"
        />
        <StatCard
          label={isAr ? "متأخر" : "Late"}
          value={summaryLoading ? "..." : lateCount}
          icon={Clock}
          iconColor="#F59E0B"
        />
        <StatCard
          label={isAr ? "غائب" : "Absent"}
          value={summaryLoading ? "..." : absentCount}
          icon={AlertCircle}
          iconColor="#E5484D"
        />
        <StatCard
          label={isAr ? "معدل الحضور" : "Attendance Rate"}
          value={summaryLoading ? "..." : `${attendanceRate.toFixed(1)}%`}
          icon={TrendingUp}
          iconColor="#2563EB"
          change={avgLateMin > 0 ? `${isAr ? "متوسط التأخير" : "Avg late"}: ${avgLateMin.toFixed(0)}${isAr ? " د" : "m"}` : undefined}
          positive={false}
        />
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          resetPage();
        }}
        searchPlaceholderEn="Search by driver..."
        searchPlaceholderAr="بحث بالسائق..."
        filters={[
          {
            key: "status",
            placeholderEn: "Status",
            placeholderAr: "الحالة",
            options: statusOptions,
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              resetPage();
            },
          },
        ]}
      />

      {/* Table */}
      {!tableLoading && records.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          titleEn="No attendance records"
          titleAr="لا توجد سجلات حضور"
          descriptionEn="Attendance data will appear as drivers clock in/out via the agent app"
          descriptionAr="ستظهر بيانات الحضور عند تسجيل دخول/خروج السائقين من التطبيق"
        />
      ) : (
        <>
          <DataTable<AttendanceRecord>
            columns={columns}
            data={records}
            loading={tableLoading}
            emptyMessage={isAr ? "لا توجد سجلات" : "No records found"}
            language={language}
            rowKey={(r) => r.id}
          />
          <Pagination
            page={page}
            pages={pages}
            total={total}
            perPage={perPage}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  );
}
