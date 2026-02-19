"use client";

import { useState, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Users as UsersIcon,
  CalendarDays,
  Play,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useShiftCalendar,
  useShiftTemplates,
  useClockIn,
  useClockOut,
  useBulkAssignShifts,
} from "@/hooks/useShifts";
import { useDrivers } from "@/hooks/useDrivers";
import { SHIFT_STATUS_CONFIG } from "@/lib/constants";
import type { Shift } from "@/types/shift";

// ---- helpers ----

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeRange(start: string, end: string): string {
  const fmtTime = (t: string) => {
    if (!t) return "--:--";
    const d = new Date(t);
    if (isNaN(d.getTime())) {
      // might be just HH:mm:ss
      return t.slice(0, 5);
    }
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };
  return `${fmtTime(start)} - ${fmtTime(end)}`;
}

const DAY_NAMES_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

// ---- component ----

export default function ShiftsPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  const weekMonday = useMemo(() => {
    const mon = getMonday(new Date());
    return addDays(mon, weekOffset * 7);
  }, [weekOffset]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
  }, [weekMonday]);

  const dateFrom = toDateStr(weekDates[0]);
  const dateTo = toDateStr(weekDates[6]);

  // Queries
  const { data: calendarData, isLoading: calLoading } = useShiftCalendar(dateFrom, dateTo);
  const { data: templates, isLoading: templatesLoading } = useShiftTemplates();
  const { data: driversData } = useDrivers({ per_page: 100 });
  const drivers = driversData?.items ?? [];

  // Mutations
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const bulkAssign = useBulkAssignShifts();

  // Calendar map: date string -> shifts
  const calendarMap = useMemo(() => {
    const map: Record<string, (Shift & { driver_name?: string })[]> = {};
    if (calendarData) {
      for (const day of calendarData) {
        map[day.date] = day.shifts;
      }
    }
    return map;
  }, [calendarData]);

  // Week range display
  const weekRangeDisplay = useMemo(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString(isAr ? "ar-KW" : "en-GB", { month: "short", day: "numeric" });
    return `${fmt(weekDates[0])} - ${fmt(weekDates[6])}`;
  }, [weekDates, isAr]);

  // Shift detail dialog
  const [selectedShift, setSelectedShift] = useState<(Shift & { driver_name?: string }) | null>(
    null
  );

  // Bulk assign dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDriverIds, setBulkDriverIds] = useState<string[]>([]);
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulkDateFrom, setBulkDateFrom] = useState(dateFrom);
  const [bulkDateTo, setBulkDateTo] = useState(dateTo);

  function handleBulkSubmit() {
    if (!bulkTemplateId || bulkDriverIds.length === 0) return;
    // Compute date range
    const dates: string[] = [];
    const start = new Date(bulkDateFrom + "T00:00:00");
    const end = new Date(bulkDateTo + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(toDateStr(d));
    }
    bulkAssign.mutate(
      { driver_ids: bulkDriverIds, template_id: bulkTemplateId, dates },
      {
        onSuccess: () => {
          setBulkOpen(false);
          setBulkDriverIds([]);
          setBulkTemplateId("");
        },
      }
    );
  }

  function toggleBulkDriver(driverId: string) {
    setBulkDriverIds((prev) =>
      prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId]
    );
  }

  const todayStr = toDateStr(new Date());

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <PageHeader
        titleEn="Shifts"
        titleAr="الشفتات"
        subtitleEn="Manage shift schedules and templates"
        subtitleAr="إدارة جداول المناوبات والقوالب"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setBulkOpen(true)}
              className="h-8 px-3 text-[12px] text-[#6B7A8D] border-[#E6E9EE] gap-1.5"
            >
              <UsersIcon className="w-3.5 h-3.5" />
              {isAr ? "تعيين جماعي" : "Bulk Assign"}
            </Button>
            <Button className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "إنشاء شفت" : "Create Shift"}
            </Button>
          </>
        }
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-[#E6E9EE] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="h-7 w-7 border-[#E6E9EE]"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#6B7A8D]" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="h-7 w-7 border-[#E6E9EE]"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#6B7A8D]" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekOffset(0)}
            className="h-7 px-2.5 text-[11px] text-[#6B7A8D] border-[#E6E9EE]"
          >
            {isAr ? "اليوم" : "Today"}
          </Button>
        </div>
        <span className="text-[13px] font-semibold text-[#0C1825]">{weekRangeDisplay}</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const dayShifts = calendarMap[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const dayNames = isAr ? DAY_NAMES_AR : DAY_NAMES_EN;

          return (
            <div
              key={dateStr}
              className={`bg-white rounded-lg border ${
                isToday ? "border-[#2563EB]" : "border-[#E6E9EE]"
              } min-h-[180px] flex flex-col`}
            >
              {/* Day header */}
              <div
                className={`px-2.5 py-2 border-b text-center ${
                  isToday ? "border-[#2563EB]/20 bg-[#2563EB]/5" : "border-[#E6E9EE] bg-[#FAFBFC]"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D]">
                  {dayNames[i]}
                </div>
                <div
                  className={`text-[14px] font-bold ${
                    isToday ? "text-[#2563EB]" : "text-[#0C1825]"
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
              {/* Shifts in this day */}
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                {calLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-4 h-4 rounded-full border-2 border-[#E6E9EE] border-t-[#2563EB] animate-spin" />
                  </div>
                ) : dayShifts.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-[#9CA3AF]">
                      {isAr ? "لا شفتات" : "No shifts"}
                    </span>
                  </div>
                ) : (
                  dayShifts.map((shift) => {
                    const cfg = SHIFT_STATUS_CONFIG[shift.status];
                    return (
                      <button
                        key={shift.id}
                        onClick={() => setSelectedShift(shift)}
                        className="w-full text-start rounded-md px-2 py-1.5 border border-[#E6E9EE] hover:border-[#D0D5DD] transition-colors cursor-pointer"
                        style={{ borderLeftWidth: 3, borderLeftColor: cfg?.color || "#6B7A8D" }}
                      >
                        <div className="text-[11px] font-medium text-[#0C1825] truncate">
                          {shift.driver_name || shift.driver_id.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-[#6B7A8D] tabular-nums" dir="ltr">
                          {formatTimeRange(shift.scheduled_start, shift.scheduled_end)}
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge
                            status={shift.status}
                            config={SHIFT_STATUS_CONFIG}
                            language={language}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Templates */}
      <div>
        <h2 className="text-[13px] font-semibold text-[#0C1825] mb-2">
          {isAr ? "القوالب" : "Templates"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {templatesLoading ? (
            <div className="col-span-full py-8 text-center text-[12px] text-[#9CA3AF]">
              {isAr ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={CalendarDays}
                titleEn="No shift templates"
                titleAr="لا توجد قوالب"
                descriptionEn="Create templates to quickly assign shifts"
                descriptionAr="أنشئ قوالب لتعيين الشفتات بسرعة"
              />
            </div>
          ) : (
            templates.map((t) => {
              const isMorning = t.start_time < "12:00";
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-lg border border-[#E6E9EE] p-4 hover:border-[#D0D5DD] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isMorning ? "bg-[#F59E0B0D]" : "bg-[#8B5CF60D]"
                      }`}
                    >
                      {isMorning ? (
                        <Sun className="w-4 h-4 text-[#F59E0B]" />
                      ) : (
                        <Moon className="w-4 h-4 text-[#8B5CF6]" />
                      )}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[#0C1825]">
                        {isAr && t.name_ar ? t.name_ar : t.name}
                      </div>
                      <div className="text-[11px] text-[#6B7A8D] tabular-nums" dir="ltr">
                        {t.start_time.slice(0, 5)} &mdash; {t.end_time.slice(0, 5)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#9CA3AF]">
                      {t.is_active
                        ? isAr
                          ? "نشط"
                          : "Active"
                        : isAr
                        ? "غير نشط"
                        : "Inactive"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Shift detail dialog */}
      <Dialog open={!!selectedShift} onOpenChange={(open) => !open && setSelectedShift(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#0C1825]">
              {isAr ? "تفاصيل الشفت" : "Shift Details"}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#6B7A8D]">
              {selectedShift?.driver_name || selectedShift?.driver_id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "التاريخ" : "Date"}
                  </div>
                  <div className="text-[13px] text-[#0C1825]">{selectedShift.date}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "الحالة" : "Status"}
                  </div>
                  <StatusBadge
                    status={selectedShift.status}
                    config={SHIFT_STATUS_CONFIG}
                    language={language}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "البداية المجدولة" : "Scheduled Start"}
                  </div>
                  <div className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
                    {selectedShift.scheduled_start?.slice(11, 16) || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "النهاية المجدولة" : "Scheduled End"}
                  </div>
                  <div className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
                    {selectedShift.scheduled_end?.slice(11, 16) || "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "البداية الفعلية" : "Actual Start"}
                  </div>
                  <div className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
                    {selectedShift.actual_start
                      ? new Date(selectedShift.actual_start).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "النهاية الفعلية" : "Actual End"}
                  </div>
                  <div className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
                    {selectedShift.actual_end
                      ? new Date(selectedShift.actual_end).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>
              </div>
              {selectedShift.notes && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-0.5">
                    {isAr ? "ملاحظات" : "Notes"}
                  </div>
                  <div className="text-[12px] text-[#6B7A8D]">{selectedShift.notes}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedShift?.status === "scheduled" && (
              <Button
                onClick={() => {
                  clockIn.mutate(selectedShift.id, {
                    onSuccess: () => setSelectedShift(null),
                  });
                }}
                disabled={clockIn.isPending}
                className="h-8 px-3 text-[12px] font-medium bg-[#12B981] hover:bg-[#0ea572] text-white gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                {isAr ? "تسجيل دخول" : "Clock In"}
              </Button>
            )}
            {selectedShift?.status === "in_progress" && (
              <Button
                onClick={() => {
                  clockOut.mutate(selectedShift.id, {
                    onSuccess: () => setSelectedShift(null),
                  });
                }}
                disabled={clockOut.isPending}
                className="h-8 px-3 text-[12px] font-medium bg-[#E5484D] hover:bg-[#d33b3f] text-white gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                {isAr ? "تسجيل خروج" : "Clock Out"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk assign dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#0C1825]">
              {isAr ? "تعيين جماعي" : "Bulk Assign Shifts"}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#6B7A8D]">
              {isAr
                ? "اختر السائقين والقالب والفترة الزمنية"
                : "Select drivers, template, and date range"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Template select */}
            <div>
              <label className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-[0.05em] mb-1 block">
                {isAr ? "القالب" : "Template"}
              </label>
              <select
                value={bulkTemplateId}
                onChange={(e) => setBulkTemplateId(e.target.value)}
                className="h-8 w-full rounded-md border border-[#E6E9EE] bg-white px-3 text-[12px] text-[#0C1825] outline-none focus:border-[#2563EB]"
              >
                <option value="">{isAr ? "اختر قالب..." : "Select template..."}</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {isAr && t.name_ar ? t.name_ar : t.name} ({t.start_time.slice(0, 5)} -{" "}
                    {t.end_time.slice(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-[0.05em] mb-1 block">
                  {isAr ? "من" : "From"}
                </label>
                <Input
                  type="date"
                  value={bulkDateFrom}
                  onChange={(e) => setBulkDateFrom(e.target.value)}
                  className="h-8 text-[12px] bg-white border-[#E6E9EE]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-[0.05em] mb-1 block">
                  {isAr ? "إلى" : "To"}
                </label>
                <Input
                  type="date"
                  value={bulkDateTo}
                  onChange={(e) => setBulkDateTo(e.target.value)}
                  className="h-8 text-[12px] bg-white border-[#E6E9EE]"
                />
              </div>
            </div>

            {/* Driver selection */}
            <div>
              <label className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-[0.05em] mb-1 block">
                {isAr ? "السائقون" : "Drivers"} ({bulkDriverIds.length}{" "}
                {isAr ? "مختار" : "selected"})
              </label>
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-[#E6E9EE] divide-y divide-[#F0F2F5]">
                {drivers.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#FAFBFC] cursor-pointer"
                  >
                    <Checkbox
                      checked={bulkDriverIds.includes(d.id)}
                      onCheckedChange={() => toggleBulkDriver(d.id)}
                    />
                    <div>
                      <div className="text-[12px] font-medium text-[#0C1825]">
                        {isAr && d.name_ar ? d.name_ar : d.name}
                      </div>
                      {d.platform && (
                        <div className="text-[10px] text-[#9CA3AF] capitalize">{d.platform}</div>
                      )}
                    </div>
                  </label>
                ))}
                {drivers.length === 0 && (
                  <div className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">
                    {isAr ? "لا يوجد سائقون" : "No drivers found"}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkOpen(false)}
              className="h-8 px-3 text-[12px] text-[#6B7A8D] border-[#E6E9EE]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={bulkAssign.isPending || !bulkTemplateId || bulkDriverIds.length === 0}
              className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
            >
              <UsersIcon className="w-3.5 h-3.5" />
              {bulkAssign.isPending
                ? isAr
                  ? "جاري التعيين..."
                  : "Assigning..."
                : isAr
                ? "تعيين"
                : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
