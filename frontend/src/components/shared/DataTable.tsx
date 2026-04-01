"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: React.ReactNode;
}

type SortDir = "asc" | "desc";

export default function DataTable({ columns, data, onRowClick, emptyMessage = "No data" }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: Column) {
    if (col.sortable === false) return;
    const key = col.sortKey || col.key;
    if (sortCol === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // third click clears sort
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  }

  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];

      // Handle nullish
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Numeric comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortCol, sortDir]);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const key = col.sortKey || col.key;
                const isActive = sortCol === key;
                return (
                  <th
                    key={col.key}
                    onClick={() => isSortable && handleSort(col)}
                    className={cn(
                      "text-left text-xs font-medium text-secondary px-5 py-3 select-none",
                      isSortable && "cursor-pointer hover:text-primary transition-colors",
                      col.className
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        isActive ? (
                          sortDir === "asc" ? (
                            <ArrowUp size={12} className="text-primary" />
                          ) : (
                            <ArrowDown size={12} className="text-primary" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-gray-50 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-gray-50/50"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-3 text-sm whitespace-nowrap", col.className)}>
                      {col.render ? col.render(row[col.key], row, i) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
