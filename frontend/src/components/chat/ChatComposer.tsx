// Phase 4 Wave 3 — sticky-bottom composer (UI-SPEC §3.2.6).
// Enter sends; Shift+Enter newline; Esc cancels in-flight stream.
"use client";
import { useRef, useState, useEffect } from "react";
import { Send, Square } from "lucide-react";

interface ChatComposerProps {
  onSend: (content: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatComposer({
  onSend,
  onCancel,
  isStreaming,
  placeholder = "Ask anything, or '> apply a 10 KD penalty'…",
  disabled,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(240, el.scrollHeight)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="sticky bottom-0 border-t border-sand-200 bg-bg px-6 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape" && isStreaming) {
              e.preventDefault();
              onCancel?.();
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="min-h-[44px] max-h-[240px] flex-1 resize-none rounded-2xl border border-sand-200 bg-card px-4 py-3 text-sm text-foreground placeholder:text-secondary focus:border-foreground focus:outline-none disabled:opacity-60"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-sand-200 hover:bg-sand-50"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || disabled}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatComposer;
