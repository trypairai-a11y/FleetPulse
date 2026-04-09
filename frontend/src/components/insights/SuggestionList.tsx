"use client";
import type { SuggestionCard } from "./types";
import SuggestionCardItem from "./SuggestionCardItem";

interface Props {
  suggestions: SuggestionCard[];
}

const sections = [
  { severity: "red" as const, label: "Do today", dot: "🔴" },
  { severity: "yellow" as const, label: "Do this week", dot: "🟡" },
  { severity: "green" as const, label: "Worth doing", dot: "🟢" },
];

export default function SuggestionList({ suggestions }: Props) {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-base font-semibold text-green-800">Everything looks great today!</p>
        <p className="text-sm text-green-700 mt-1">No actions needed right now. Check back later.</p>
      </div>
    );
  }

  const grouped = {
    red: suggestions.filter((s) => s.severity === "red"),
    yellow: suggestions.filter((s) => s.severity === "yellow"),
    green: suggestions.filter((s) => s.severity === "green"),
  };

  return (
    <div className="space-y-6">
      {sections.map(({ severity, label, dot }) => {
        const cards = grouped[severity];
        if (cards.length === 0) return null;
        return (
          <div key={severity}>
            <div className="flex items-center gap-2 mb-3">
              <span>{dot}</span>
              <h3
                className={
                  severity === "red"
                    ? "text-sm font-semibold text-red-600 uppercase tracking-wider"
                    : severity === "yellow"
                    ? "text-sm font-semibold text-amber-600 uppercase tracking-wider"
                    : "text-sm font-semibold text-green-600 uppercase tracking-wider"
                }
              >
                {label}
              </h3>
              <span className="text-xs text-secondary">({cards.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cards.map((c) => (
                <SuggestionCardItem key={c.id} card={c} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
