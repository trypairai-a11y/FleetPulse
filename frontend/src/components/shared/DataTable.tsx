"use client";
import { cn } from "@/lib/cn";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}

export default function DataTable({ columns, data, onRowClick, emptyMessage = "No data" }: DataTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {columns.map((col) => (
                <th key={col.key} className={cn("text-left text-xs font-medium text-secondary px-5 py-3", col.className)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-gray-50 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-gray-50/50"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-3 text-sm", col.className)}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
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
