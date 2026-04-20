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
  type: "select" | "date" | "search" | "multi-select" | "time" | "dateRange" | "driver-search";
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
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Filter by ${filter.label}: ${label}`}
        className="flex items-center gap-1 pl-3 pr-8 py-2 rounded-pill border border-sand-300 bg-white text-sm text-primary hover:border-sand-400 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer whitespace-nowrap"
      >
        {label}
      </button>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sand-500 pointer-events-none" aria-hidden="true" />
      {open && (
        <div role="listbox" aria-label={filter.label} aria-multiselectable="true" className="absolute top-full left-0 mt-1 bg-white border border-sand-300 rounded-pill shadow-lg z-50 min-w-[180px] py-1 max-h-60 overflow-y-auto">
          {filter.options?.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-sand-100 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-primary border-primary text-white" : "border-sand-400"
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
              <div className="border-t border-sand-200 my-1" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="w-full px-3 py-2 text-sm text-left text-secondary hover:bg-sand-100 transition-colors"
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

function DriverSearchFilter({
  filter,
  value,
  onChange,
}: {
  filter: Filter;
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const suggestions = query.trim().length === 0
    ? []
    : (filter.options || []).filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

  function select(opt: FilterOption) {
    setQuery(opt.label);
    onChange(opt.value);
    setOpen(false);
  }

  function clear() {
    setQuery("");
    onChange("");
  }

  return (
    <div ref={ref} className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-500 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
        onFocus={() => setOpen(true)}
        placeholder={filter.placeholder || "Search driver…"}
        aria-label={`Search by ${filter.label}`}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        className="pl-9 pr-7 py-2 rounded-pill border border-sand-300 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[180px] placeholder:text-sand-500"
      />
      {query && (
        <button type="button" onClick={clear} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-sand-500 hover:text-sand-800">
          <X size={13} aria-hidden="true" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-sand-300 rounded-pill shadow-lg z-50 min-w-[220px] py-1 max-h-60 overflow-y-auto">
          {suggestions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-sand-100 transition-colors"
            >
              {opt.label}
            </button>
          ))}
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
    <div className="flex gap-3 flex-wrap items-center" role="search" aria-label="Filter controls">
      {filters.map((filter) => {
        if (filter.type === "search") {
          return (
            <div key={filter.key} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-500 pointer-events-none" />
              <input
                type="text"
                value={values[filter.key] || ""}
                onChange={(e) => onChange(filter.key, e.target.value)}
                placeholder={filter.placeholder || `Search...`}
                aria-label={`Search by ${filter.label}`}
                className="pl-9 pr-3 py-2 rounded-pill border border-sand-300 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[220px] placeholder:text-sand-500"
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
              aria-label={`Filter by ${filter.label}`}
              className="px-3 py-2 rounded-pill border border-sand-300 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          );
        }
        if (filter.type === "time") {
          return (
            <input
              key={filter.key}
              type="time"
              placeholder={filter.label || "HH:MM"}
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              aria-label={`Filter by ${filter.label}`}
              className="px-3 py-2 rounded-pill border border-sand-300 bg-white text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 w-[120px] placeholder:text-sand-500 font-mono"
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
        if (filter.type === "driver-search") {
          return (
            <DriverSearchFilter
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
              aria-label={`Filter by ${filter.label}`}
              className="appearance-none pl-3 pr-8 py-2 rounded-pill border border-sand-300 bg-white text-sm text-primary hover:border-sand-400 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sand-500 pointer-events-none" aria-hidden="true" />
          </div>
        );
      })}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear all filters"
          className="flex items-center gap-1.5 px-3 py-2 rounded-pill text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <X size={14} aria-hidden="true" />
          Clear Filters
        </button>
      )}
    </div>
  );
}
