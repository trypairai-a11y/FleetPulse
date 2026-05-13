// Phase 4 Wave 3 — visible affordance while assistant is computing.
"use client";
import { Loader2 } from "lucide-react";
import type { StreamingState } from "@/types/chat";

export function StreamingIndicator({ state }: { state: StreamingState }) {
  if (state.phase === "complete" || state.phase === "idle" || state.phase === "cancelled") {
    return null;
  }
  const label =
    state.phase === "queued"
      ? "Thinking…"
      : state.phase === "tool_running"
        ? `Running ${state.toolName ?? "tool"}…`
        : state.phase === "streaming_text"
          ? null
          : state.phase === "streaming_view"
            ? "Generating view…"
            : state.phase === "error"
              ? state.errorMessage ?? "Something went wrong."
              : "Working…";

  return (
    <div
      aria-live="polite"
      className="inline-flex items-center gap-2 text-xs text-secondary"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label ? <span>{label}</span> : <span className="inline-block h-3 w-1 animate-pulse bg-foreground/40" />}
    </div>
  );
}

export default StreamingIndicator;
