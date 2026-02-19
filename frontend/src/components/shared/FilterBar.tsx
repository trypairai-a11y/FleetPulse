"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUIStore } from "@/stores/uiStore";

interface FilterOption {
  value: string;
  labelEn: string;
  labelAr: string;
}

interface SelectFilter {
  key: string;
  placeholderEn: string;
  placeholderAr: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholderEn?: string;
  searchPlaceholderAr?: string;
  filters?: SelectFilter[];
  children?: React.ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholderEn = "Search...",
  searchPlaceholderAr = "بحث...",
  filters = [],
  children,
}: FilterBarProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <Input
            placeholder={isAr ? searchPlaceholderAr : searchPlaceholderEn}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </div>
      )}
      {filters.map((f) => (
        <Select key={f.key} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="h-8 w-[140px] text-[12px] bg-white border-[#E6E9EE] text-[#6B7A8D]">
            <SelectValue placeholder={isAr ? f.placeholderAr : f.placeholderEn} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
            {f.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {isAr ? opt.labelAr : opt.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {children}
    </div>
  );
}
