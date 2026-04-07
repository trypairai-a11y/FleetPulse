"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import DateRangePicker from "./DateRangePicker";

interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;
  label: string;
  type: "select" | "date" | "search" | "multi-select" | "time" | "dateRange";
  options?: FilterOption[];
  placeholder?: string;
  /** For dateRange type: key used for the end date value */
  toKey?: string;
}

interface FilterBarProps {
  filters: Filter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  defaultValues?: Record<string, string>;
}

function MultiSelectFilter({
  filter,
  value,
  onChange,
}: {
  filter: Filter;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(",") : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter((s) => s !== val)
      : [...selected, val];
    onChange(next.join(","));
  }

  const label =
    selected.length === 0
      ? filter.label
      : selected.length === 1
      ? filter.options?.find((o) => o.value === selected[0])?.label || selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-primary hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer whitespace-nowrap"
      >
        {label}
      </button>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1 max-h-60 overflow-y-auto">
          {filter.options?.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-primary border-primary text-white" : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check size={10} />}
                </span>
                {opt.label}
              </button>
            );
          })}
          {selected.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="w-full px-3 py-2 text-sm text-left text-secondary hover:bg-gray-50 transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ filters, values, onChange, onClear, defaultValues }: FilterBarProps) {
  const hasActiveFilters = onClear && Object.keys(values).some((k) => {
    const defaultVal = defaultValues?.[k] || "";
    return values[k] && values[k] !== defaultVal;
  });

  return (
    <div className="flex gap-3 flex-wrap items-center">
      {filters.map((filter) => {
        if (filter.type === "search") {
          return (
            <div key={filter.key} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={values[filter.key] || ""}
                onChange={(e) => onChange(filter.key, e.target.value)}
                placeholder={filter.placeholder || `Search...`}
                className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[220px] placeholder:text-gray-400"
              />
            </div>
          );
        }
        if (filter.type === "dateRange") {
          const toKey = filter.toKey || "dateTo";
          return (
            <DateRangePicker
              key={filter.key}
              dateFrom={values[filter.key] || ""}
              dateTo={values[toKey] || ""}
              onChange={(from, to) => {
                onChange(filter.key, from);
                onChange(toKey, to);
              }}
            />
          );
        }
        if (filter.type === "date") {
          return (
            <input
              key={filter.key}
              type="date"
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          );
        }
        if (filter.type === "time") {
          return (
            <input
              key={filter.key}
              type="time"
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          );
        }
        if (filter.type === "multi-select") {
          return (
            <MultiSelectFilter
              key={filter.key}
              filter={filter}
              value={values[filter.key] || ""}
              onChange={(v) => onChange(filter.key, v)}
            />
          );
        }
        return (
          <div key={filter.key} className="relative">
            <select
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-primary hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        );
      })}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <X size={14} />
          Clear Filters
        </button>
      )}
    </div>
  );
}
