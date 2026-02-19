"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, total, perPage, onPageChange }: PaginationProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  if (total === 0) return null;

  const pageNumbers: (number | "...")[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) {
      pageNumbers.push(i);
    }
    if (page < pages - 2) pageNumbers.push("...");
    pageNumbers.push(pages);
  }

  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-[11px] text-[#6B7A8D]">
        {isAr
          ? `عرض ${start}-${end} من ${total}`
          : `Showing ${start}-${end} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="border-[#E6E9EE]"
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-[11px] text-[#6B7A8D]">...</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon-xs"
              onClick={() => onPageChange(p)}
              className={p === page ? "bg-[#2563EB] text-white" : "border-[#E6E9EE] text-[#6B7A8D]"}
            >
              <span className="text-[11px]">{p}</span>
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="border-[#E6E9EE]"
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
