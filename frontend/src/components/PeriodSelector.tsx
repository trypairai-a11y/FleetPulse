"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Period = "day" | "week" | "month";

export function getDateRange(period: Period, customDate?: string | null): { dateFrom: string; dateTo: string } {
  if (customDate) return { dateFrom: customDate, dateTo: customDate };
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  if (period === "day") return { dateFrom: dateTo, dateTo };
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { dateFrom: d.toISOString().slice(0, 10), dateTo };
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return { dateFrom: d.toISOString().slice(0, 10), dateTo };
}

export function useDateRange(period: Period, customDate?: string | null) {
  return useMemo(() => getDateRange(period, customDate), [period, customDate]);
}

export function PeriodSelector({
  period,
  setPeriod,
  isAr,
  customDate,
  setCustomDate,
}: {
  period: Period;
  setPeriod: (p: Period) => void;
  isAr: boolean;
  customDate?: string | null;
  setCustomDate?: (d: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { value: Period; label: string; labelAr: string }[] = [
    { value: "day", label: "Day", labelAr: "يوم" },
    { value: "week", label: "Week", labelAr: "أسبوع" },
    { value: "month", label: "Month", labelAr: "شهر" },
  ];

  const selectedDate = customDate ? new Date(customDate + "T00:00:00") : undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 ${customDate ? "bg-[#6366F1]/10 text-[#6366F1]" : "text-[#C0C0CC] hover:text-[#8E8EA0] hover:bg-[#F8F8FC]"}`}
            title={isAr ? "اختر تاريخ" : "Pick a date"}
          >
            <CalendarIcon className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                const iso = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
                setCustomDate?.(iso);
              } else {
                setCustomDate?.(null);
              }
              setOpen(false);
            }}
            disabled={{ after: new Date() }}
            defaultMonth={selectedDate || new Date()}
          />
          {customDate && (
            <div className="px-3 pb-3">
              <button
                onClick={() => { setCustomDate?.(null); setOpen(false); }}
                className="w-full text-xs font-medium text-[#8E8EA0] hover:text-[#1E1E2D] py-1.5 rounded-md hover:bg-[#F8F8FC] transition-colors"
              >
                {isAr ? "مسح التاريخ" : "Clear date"}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <div className="relative flex bg-[#F8F8FC] rounded-lg p-0.5">
        {!customDate && (
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-white shadow-sm transition-all duration-300 ease-out"
            style={{
              width: `calc(${100 / 3}% - 2px)`,
              insetInlineStart: `calc(${options.findIndex(o => o.value === period) * (100 / 3)}% + 1px)`,
            }}
          />
        )}
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => { setPeriod(o.value); setCustomDate?.(null); }}
            className={`relative z-[1] flex-1 text-[11px] font-semibold py-1.5 px-3 rounded-md transition-colors duration-200 whitespace-nowrap ${!customDate && period === o.value ? "text-[#1E1E2D]" : "text-[#8E8EA0] hover:text-[#1E1E2D]"}`}
          >
            {isAr ? o.labelAr : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
