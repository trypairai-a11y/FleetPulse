"use client";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
}

/** Pulsing placeholder rectangle */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Table skeleton with configurable rows and columns */
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card skeleton for stat cards */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Page-level skeleton combining stat cards + table */
export function PageSkeleton({ statCards = 4, tableRows = 8, tableCols = 6 }: { statCards?: number; tableRows?: number; tableCols?: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" /> {/* Page title */}
      <StatCardSkeleton count={statCards} />
      <Skeleton className="h-10 w-full" /> {/* Filter bar */}
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}
