// Phase 4 Wave 3 — KPI strip viewBlock renderer (UI-SPEC §3.2.4 variant 1).
"use client";
import type { KpiStripSpec } from "@/types/views";
import { ArrowDown, ArrowUp } from "lucide-react";

const toneClass: Record<string, string> = {
  positive: "text-emerald-700 bg-emerald-50",
  success: "text-emerald-700 bg-emerald-50",
  negative: "text-red-700 bg-red-50",
  danger: "text-red-700 bg-red-50",
  warning: "text-amber-700 bg-amber-50",
  neutral: "text-foreground bg-sand-50",
};

export function KpiStripView({ spec }: { spec: KpiStripSpec }) {
  const tiles = spec?.tiles ?? [];
  return (
    <div>
      {spec?.title && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {tiles.map((tile, i) => (
          <div
            key={`${tile.label}-${i}`}
            className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200"
          >
            <div className="text-[11px] uppercase tracking-wider text-secondary">
              {tile.label}
            </div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {tile.value}
            </div>
            {tile.delta && (
              <div
                className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                  toneClass[tile.tone ?? "neutral"] ?? toneClass.neutral
                }`}
              >
                {tile.delta.direction === "up" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(tile.delta.pct)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default KpiStripView;
