"use client";

interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;
  label: string;
  type: "select" | "date" | "search";
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: Filter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function FilterBar({ filters, values, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      {filters.map((filter) => {
        if (filter.type === "search") {
          return (
            <input
              key={filter.key}
              type="text"
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              placeholder={filter.placeholder || `Search...`}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[200px]"
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
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          );
        }
        return (
          <select
            key={filter.key}
            value={values[filter.key] || ""}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{filter.label}</option>
            {filter.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      })}
    </div>
  );
}
