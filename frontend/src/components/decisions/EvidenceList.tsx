"use client";
// Phase 2 Wave 3 — Evidence row list shown inside the DecisionCard's
// "Show evidence" disclosure (UI-SPEC §3.1.2). Lucide icon + label +
// tiny entityId chip per row.

import {
  Calendar,
  AlertTriangle,
  Wallet,
  Package,
  MapPin,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Evidence } from "@/types/decisions";

interface EvidenceListProps {
  items: Evidence[];
  className?: string;
}

const ICON_BY_TYPE: Record<Evidence["type"], LucideIcon> = {
  shift: Calendar,
  violation: AlertTriangle,
  cashRecord: Wallet,
  order: Package,
  gps: MapPin,
  note: StickyNote,
};

export default function EvidenceList({ items, className }: EvidenceListProps) {
  if (!items || items.length === 0) {
    return (
      <div className={cn("text-xs text-sand-600 italic", className)}>
        No evidence linked yet
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "flex flex-col gap-1.5 mt-2 border-s-2 border-sand-200 ps-3",
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = ICON_BY_TYPE[item.type] ?? StickyNote;
        const Wrapper: React.ElementType = item.href ? "a" : "div";
        const wrapperProps = item.href
          ? {
              href: item.href,
              className:
                "flex items-center gap-2 text-xs text-sand-800 hover:text-primary transition-colors",
            }
          : {
              className: "flex items-center gap-2 text-xs text-sand-800",
            };
        return (
          <li key={`${item.entityType}-${item.entityId}-${idx}`}>
            <Wrapper {...wrapperProps}>
              <Icon
                size={13}
                className="text-sand-500 shrink-0"
                aria-hidden="true"
              />
              <span className="flex-1 truncate">{item.label}</span>
              <span className="text-[10px] font-mono text-sand-500 bg-sand-100 px-1.5 py-0.5 rounded-pill shrink-0">
                {item.entityId.slice(0, 8)}
              </span>
            </Wrapper>
          </li>
        );
      })}
    </ul>
  );
}
