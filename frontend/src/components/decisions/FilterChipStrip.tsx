"use client";
// Phase 2 Wave 3 — Filter chip strip (UI-SPEC §3.1.4). Single-select chips
// backed by URL search params via useSearchParams. 32px tall (bumped from
// 28px in the spec for AA touch-target compliance — see UI-SPEC §6 note).

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

interface FilterChipStripProps {
  chips: FilterChip[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
}

export default function FilterChipStrip({
  chips,
  active,
  onChange,
  className,
}: FilterChipStripProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(next: string) {
    if (onChange) {
      onChange(next);
      return;
    }
    // Default behaviour — write to URL search params.
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  }

  return (
    <div
      role="tablist"
      aria-label="Filter decisions"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {chips.map((chip) => {
        const isActive = chip.key === active;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(chip.key)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border text-xs font-medium transition-colors duration-250 ease-sierra-out",
              "focus:outline-none focus:ring-2 focus:ring-primary/40",
              isActive
                ? "bg-foreground text-white border-foreground"
                : "bg-card text-sand-800 border-sand-200 hover:bg-sand-100",
            )}
          >
            <span>{chip.label}</span>
            {typeof chip.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[18px] px-1 rounded-pill text-[10px] tabular-nums",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-sand-100 text-sand-700",
                )}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
