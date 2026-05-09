"use client";
// Phase 2 Wave 3 — Coloured proposal-class pill (UI-SPEC §3.1.2 Tag Colour Map).
// Static colour map keyed by DecisionTag. 22px tall, font-semibold, 11px text,
// rounded-pill, 6px dot. role="status" + aria-label so screen readers
// announce "{tag} proposal".

import { cn } from "@/lib/cn";
import type { DecisionTag } from "@/types/decisions";

interface TagPillProps {
  tag: DecisionTag;
  size?: "sm" | "md";
  className?: string;
}

interface TagStyle {
  bg: string;
  text: string;
  dot: string;
}

const TAG_STYLES: Record<DecisionTag, TagStyle> = {
  Penalty: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  Suspend: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-600" },
  Warn: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "Cash reminder": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  Promote: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  Review: { bg: "bg-sand-100", text: "text-sand-800", dot: "bg-sand-500" },
  Other: { bg: "bg-slate2/10", text: "text-slate2", dot: "bg-slate2" },
};

export default function TagPill({ tag, size = "md", className }: TagPillProps) {
  const style = TAG_STYLES[tag] ?? TAG_STYLES.Other;
  const isSm = size === "sm";

  return (
    <span
      role="status"
      aria-label={`${tag} proposal`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold",
        isSm
          ? "h-5 px-2 text-[10px]"
          : "h-[22px] px-2.5 text-[11px]",
        style.bg,
        style.text,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("inline-block w-1.5 h-1.5 rounded-full", style.dot)}
      />
      <span className="leading-none">{tag}</span>
    </span>
  );
}
