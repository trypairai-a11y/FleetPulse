"use client";
// Phase 2 Wave 3 — Keyboard shortcuts help dialog (UI-SPEC §3.1.3).
// Triggered by `?` in the Decisions page. Lists all 8 shortcuts.

import { useEffect } from "react";
import { X } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "↵"], label: "Approve focused card" },
  { keys: ["⌘", "E"], label: "Edit focused card" },
  { keys: ["⌘", "D"], label: "Dismiss focused card" },
  { keys: ["↓", "/", "j"], label: "Next card" },
  { keys: ["↑", "/", "k"], label: "Previous card" },
  { keys: ["⌘", "1", "..", "9"], label: "Jump to card N" },
  { keys: ["Esc"], label: "Close drawer or dialog" },
  { keys: ["?"], label: "This shortcut help" },
];

export default function KeyboardShortcutsHelp({
  open,
  onClose,
}: KeyboardShortcutsHelpProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="absolute inset-0 bg-forest-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-card rounded-2xl border border-sand-200 shadow-float w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-4 duration-250">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-1.5 rounded-pill text-sand-500 hover:text-sand-900 hover:bg-sand-100 transition-colors duration-250 ease-sierra-out"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2
          id="shortcuts-title"
          className="font-display text-xl text-sand-900 leading-tight"
        >
          Keyboard shortcuts
        </h2>
        <p className="mt-1.5 text-sm text-sand-700">
          The Decisions inbox is engineered for the keyboard.
        </p>

        <ul className="mt-5 divide-y divide-sand-200">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="text-sm text-sand-800">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="font-mono text-[11px] bg-sand-100 border border-sand-200 text-sand-800 rounded px-1.5 py-0.5 min-w-[20px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-10 text-sm font-medium text-white bg-foreground hover:bg-sand-900 rounded-pill transition-colors duration-250 ease-sierra-out"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
