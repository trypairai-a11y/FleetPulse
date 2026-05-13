// Phase 4 Wave 3 — action_card viewBlock (UI-SPEC §3.2.4 variant 8).
// In Phase 4 the "live" button list is short: nextPrompt (post follow-up
// query) + toolName="draftCourierMessage" (opens the inline ChatActionCard).
// Other tool names fall back to disabled buttons until later phases ship them.
"use client";
import type { ActionCardSpec } from "@/types/views";

const INTENT_CLASS: Record<string, string> = {
  primary: "bg-foreground text-white hover:bg-foreground/90",
  secondary: "ring-1 ring-sand-200 bg-card text-foreground hover:bg-sand-50",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

interface ActionCardViewProps {
  spec: ActionCardSpec & { subject?: string; body?: string };
  onFollowUp?: (prompt: string) => void;
  onInvokeTool?: (toolName: string, args?: Record<string, unknown>) => void;
}

export function ActionCardView({ spec, onFollowUp, onInvokeTool }: ActionCardViewProps) {
  const buttons = spec.buttons ?? (spec.ctaLabel ? [{ label: spec.ctaLabel, intent: "primary" as const }] : []);
  return (
    <div>
      {spec.title && (
        <h3 className="mb-2 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      {spec.subject && (
        <div className="mb-1 text-xs uppercase tracking-wider text-secondary">
          {spec.subject}
        </div>
      )}
      {spec.body && (
        <p className="mb-3 text-sm text-foreground leading-snug">{spec.body}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {buttons.map((b, i) => {
          const cls = INTENT_CLASS[b.intent ?? "primary"] ?? INTENT_CLASS.primary;
          return (
            <button
              key={`${b.label}-${i}`}
              type="button"
              onClick={() => {
                if (b.nextPrompt) onFollowUp?.(b.nextPrompt);
                else if (b.toolName) onInvokeTool?.(b.toolName, b.toolArgs);
              }}
              className={`rounded-pill px-3 py-1.5 text-xs font-medium ${cls}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ActionCardView;
