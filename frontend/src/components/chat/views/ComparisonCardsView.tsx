// Phase 4 Wave 3 — comparison_cards viewBlock (UI-SPEC §3.2.4 variant 6).
"use client";
import type { ComparisonCardsSpec } from "@/types/views";

const toneRing: Record<string, string> = {
  success: "ring-emerald-200 bg-emerald-50",
  warning: "ring-amber-200 bg-amber-50",
  danger: "ring-red-200 bg-red-50",
  neutral: "ring-sand-200 bg-sand-50",
};

type ComparisonCard = {
  title: string;
  subtitle?: string;
  value?: string;
  metrics?: Array<{ label: string; value: string }>;
  tone?: string;
};

export function ComparisonCardsView({ spec }: { spec: ComparisonCardsSpec }) {
  const cards: ComparisonCard[] = (spec.cards ?? spec.items ?? []) as ComparisonCard[];
  return (
    <div>
      {spec?.title && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((item, i) => {
          const tone = item.tone ?? "neutral";
          return (
            <div
              key={`${item.title}-${i}`}
              className={`rounded-xl p-4 ring-1 ${toneRing[tone] ?? toneRing.neutral}`}
            >
              <div className="text-sm font-medium text-foreground">{item.title}</div>
              {item.subtitle && (
                <div className="text-[11px] text-secondary">{item.subtitle}</div>
              )}
              {item.value && (
                <div className="mt-2 text-xl font-semibold text-foreground tabular-nums">
                  {item.value}
                </div>
              )}
              {item.metrics && item.metrics.length > 0 && (
                <dl className="mt-2 space-y-1 text-xs">
                  {item.metrics.map((m, j) => (
                    <div key={j} className="flex justify-between gap-3">
                      <dt className="text-secondary">{m.label}</dt>
                      <dd className="text-foreground tabular-nums">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ComparisonCardsView;
