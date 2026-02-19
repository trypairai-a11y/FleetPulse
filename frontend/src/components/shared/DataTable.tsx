"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface Column<T> {
  key: string;
  headerEn: string;
  headerAr: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  language?: string;
  rowKey: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = "No data found",
  onRowClick,
  language = "en",
  rowKey,
}: DataTableProps<T>) {
  const isAr = language === "ar";

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#E6E9EE] overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[#E6E9EE] bg-[#FAFBFC]">
              {columns.map((col) => (
                <th key={col.key} className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D] px-4 py-2 text-start">
                  {isAr ? col.headerAr : col.headerEn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#F0F2F5]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5">
                    <Skeleton className="h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 text-center">
        <p className="text-[13px] text-[#6B7A8D]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E6E9EE] overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-[#E6E9EE] bg-[#FAFBFC]">
            {columns.map((col) => (
              <th key={col.key} className={`text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D] px-4 py-2 text-start whitespace-nowrap ${col.className || ""}`}>
                {isAr ? col.headerAr : col.headerEn}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F2F5]">
          {data.map((item) => (
            <tr
              key={rowKey(item)}
              className={`hover:bg-[#FAFBFC] transition-colors ${onRowClick ? "cursor-pointer" : ""} group`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-2.5 ${col.className || ""}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
