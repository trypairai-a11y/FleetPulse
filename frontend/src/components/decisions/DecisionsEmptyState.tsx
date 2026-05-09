"use client";
// Phase 2 Wave 3 — Decisions inbox empty state (UI-SPEC §3.1.6).
//
// Two flavours:
// - filter === null/"all" → "Nothing for you right now. The agent is still
//   learning your fleet." with an Open Ask Darb button.
// - filter set + zero results → "No {filter} cards. Try All." with a
//   clear-filter button.

import { Inbox } from "lucide-react";

interface DecisionsEmptyStateProps {
  filter: string | null;
  onOpenAskDarb?: () => void;
  onClearFilter?: () => void;
}

export default function DecisionsEmptyState({
  filter,
  onOpenAskDarb,
  onClearFilter,
}: DecisionsEmptyStateProps) {
  const isFiltered = filter && filter !== "all";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="w-14 h-14 rounded-full bg-sand-100 flex items-center justify-center mb-5">
        <Inbox size={28} className="text-sand-400" aria-hidden="true" />
      </div>

      {isFiltered ? (
        <>
          <h2 className="font-display text-display-sm text-sand-900">
            No {filter} cards.
          </h2>
          <p className="text-sm text-sand-600 mt-2 max-w-md leading-relaxed">
            Try the All filter to see every pending proposal.
          </p>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="mt-6 inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-pill transition-colors duration-250 ease-sierra-out"
            >
              Show all
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="font-display text-display-sm text-sand-900">
            Nothing for you right now.
          </h2>
          <p className="text-sm text-sand-600 mt-2 max-w-md leading-relaxed">
            The agent is still learning your fleet. Come back in a few hours, or
            ask Darb anything via{" "}
            <kbd className="font-mono text-[11px] bg-sand-100 border border-sand-200 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
            .
          </p>
          {onOpenAskDarb && (
            <button
              type="button"
              onClick={onOpenAskDarb}
              className="mt-6 inline-flex items-center gap-2 px-5 h-10 text-sm font-medium text-sand-800 bg-card border border-sand-200 hover:bg-sand-100 rounded-pill transition-colors duration-250 ease-sierra-out"
            >
              Open Ask Darb
              <kbd className="font-mono text-[10px] text-sand-600">⌘K</kbd>
            </button>
          )}
        </>
      )}
    </div>
  );
}
