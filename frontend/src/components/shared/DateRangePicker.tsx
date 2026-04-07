"use client";
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDisplay(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const initialYear = dateFrom ? parseInt(dateFrom.slice(0, 4)) : today.getFullYear();
  const initialMonth = dateFrom ? parseInt(dateFrom.slice(5, 7)) - 1 : today.getMonth();
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Track selection phase: null = nothing selected yet, "start" = picking end date
  const [selectPhase, setSelectPhase] = useState<null | "start">(null);
  const [tempFrom, setTempFrom] = useState(dateFrom);
  const [hoverDate, setHoverDate] = useState("");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sync when props change externally
  useEffect(() => {
    setTempFrom(dateFrom);
    setSelectPhase(null);
  }, [dateFrom, dateTo]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  function handleDayClick(day: number) {
    const clicked = toDateStr(viewYear, viewMonth, day);

    if (!selectPhase) {
      // First click: set start date
      setTempFrom(clicked);
      setSelectPhase("start");
    } else {
      // Second click: set end date
      let from = tempFrom;
      let to = clicked;
      if (from > to) [from, to] = [to, from];
      onChange(from, to);
      setSelectPhase(null);
      setOpen(false);
    }
  }

  function isInRange(dateStr: string) {
    if (selectPhase === "start" && tempFrom) {
      // Show hover range
      const end = hoverDate || tempFrom;
      const [a, b] = tempFrom <= end ? [tempFrom, end] : [end, tempFrom];
      return dateStr >= a && dateStr <= b;
    }
    if (dateFrom && dateTo) {
      return dateStr >= dateFrom && dateStr <= dateTo;
    }
    return false;
  }

  function isStart(dateStr: string) {
    if (selectPhase === "start") return dateStr === tempFrom;
    return dateStr === dateFrom;
  }

  function isEnd(dateStr: string) {
    if (selectPhase === "start" && hoverDate) {
      const end = tempFrom <= hoverDate ? hoverDate : tempFrom;
      const start = tempFrom <= hoverDate ? tempFrom : hoverDate;
      return dateStr === end && start !== end;
    }
    return dateStr === dateTo && dateFrom !== dateTo;
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const label = dateFrom && dateTo
    ? `${formatDisplay(dateFrom)} - ${formatDisplay(dateTo)}`
    : dateFrom
    ? formatDisplay(dateFrom)
    : "Select dates";

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setSelectPhase(null);
            setTempFrom(dateFrom);
            const y = dateFrom ? parseInt(dateFrom.slice(0, 4)) : today.getFullYear();
            const m = dateFrom ? parseInt(dateFrom.slice(5, 7)) - 1 : today.getMonth();
            setViewYear(y);
            setViewMonth(m);
          }
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm transition-colors",
          open ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300",
          dateFrom ? "text-primary" : "text-gray-400"
        )}
      >
        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
        {dateFrom && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange("", ""); }}
            className="ml-1 p-0.5 hover:bg-gray-100 rounded"
          >
            <X size={12} className="text-gray-400" />
          </span>
        )}
      </button>

      {/* Calendar Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 w-[280px]">
          {/* Month / Year header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <span className="text-sm font-semibold">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-center text-secondary mb-2">
            {selectPhase === "start" ? "Select end date" : "Select start date"}
          </p>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <span key={d} className="text-center text-[10px] font-medium text-secondary py-1">{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before 1st */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`e-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const inRange = isInRange(dateStr);
              const start = isStart(dateStr);
              const end = isEnd(dateStr);
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => { if (selectPhase === "start") setHoverDate(dateStr); }}
                  className={cn(
                    "h-8 text-sm rounded-lg transition-colors relative",
                    inRange && !start && !end && "bg-primary/10",
                    (start || end) && "bg-primary text-white font-medium",
                    !inRange && !start && !end && "hover:bg-gray-100",
                    isToday && !start && !end && "font-semibold text-primary",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { onChange("", ""); setSelectPhase(null); setTempFrom(""); }}
              className="text-xs text-secondary hover:text-primary transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayStr, todayStr);
                setOpen(false);
              }}
              className="text-xs text-primary font-medium hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
