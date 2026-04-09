"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { ArrowUp, ArrowDown, ArrowUpDown, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string;
  headerTitle?: string;
  exportValue?: (value: any, row: any) => string | number;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: React.ReactNode;
  pagination?: PaginationProps;
  exportFilename?: string;
  loading?: boolean;
}

type SortDir = "asc" | "desc";

export default function DataTable({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data",
  pagination,
  exportFilename,
  loading = false,
}: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(col: Column) {
    if (col.sortable === false) return;
    const key = col.sortKey || col.key;
    if (sortCol === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
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
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortCol, sortDir]);

  function handleExport() {
    const headers = columns.map((c) => c.label);
    const rows = sortedData.map((row) =>
      columns.map((col) => {
        const raw = row[col.key];
        if (col.exportValue) return col.exportValue(raw, row);
        if (raw == null) return "";
        if (typeof raw === "object") return JSON.stringify(raw);
        return raw;
      })
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename || "export"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Export button */}
      {exportFilename && (
        <div className="flex justify-end px-5 pt-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Export table data as CSV"
          >
            <Download size={12} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      )}

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
                    title={col.headerTitle}
                    className={cn(
                      "text-left text-xs font-medium text-secondary px-5 py-3 select-none",
                      isSortable && "cursor-pointer hover:text-primary transition-colors",
                      col.headerTitle && "cursor-help",
                      col.className
                    )}
                    aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        isActive ? (
                          sortDir === "asc" ? (
                            <ArrowUp size={12} className="text-primary" aria-hidden="true" />
                          ) : (
                            <ArrowDown size={12} className="text-primary" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" aria-hidden="true" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-secondary">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
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
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") onRowClick(row); } : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-3 text-sm whitespace-nowrap", col.className)}>
                      {col.render ? col.render(row[col.key], row, i) : row[col.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary">
              {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            {pagination.onLimitChange && (
              <select
                value={pagination.limit}
                onChange={(e) => pagination.onLimitChange!(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                aria-label="Rows per page"
              >
                {[25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className="text-xs text-secondary px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
