"use client";

import { getStatusColor, getPlatformColor } from "@/lib/formatters";
import { cn } from "@/lib/cn";

interface StatusBadgeProps {
  status: string | null | undefined;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, size = "sm", showDot = true, className }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const displayLabel = label || (status || "Unknown").replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-medium capitalize tracking-wide",
        colors.bg,
        colors.text,
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-sm",
        className
      )}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />}
      {displayLabel}
    </span>
  );
}

interface PlatformBadgeProps {
  platform: string | null | undefined;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const colors = getPlatformColor(platform);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-pill text-[11px] font-medium tracking-wide",
        colors.bg,
        colors.text,
        className
      )}
    >
      {platform || "Unknown"}
    </span>
  );
}
