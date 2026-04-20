"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Send, Sparkles, Command, X, Loader2 } from "lucide-react";
import api from "@/lib/api";

/**
 * Ask Darb — global Cmd+K palette. Replaces the legacy floating ChatWidget.
 *
 * Modes:
 *   - No prefix: conversational default
 *   - "> ..."   action (routed to agent runtime in chat agent with action bias)
 *   - "? ..."   query (same as default with query bias)
 *
 * The palette owns a Cmd+K / Ctrl+K global listener and a live pill from
 * /api/queue/counts showing pending decisions.
 */

interface Turn {
  role: "user" | "assistant";
  content: string;
  toolResults?: Array<{ toolName: string; input: unknown; result: unknown }>;
}

export default function AskDarbPalette() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K to open; Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Autofocus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Scroll to bottom on new turn
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // Live queue count
  useEffect(() => {
    async function loadCount() {
      try {
        const { data } = await api.get("/api/queue/counts");
        setPendingCount(data.pending ?? 0);
      } catch {
        setPendingCount(null);
      }
    }
    loadCount();
    const t = setInterval(loadCount, 30_000);
    return () => clearInterval(t);
  }, []);

  async function submit() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const userTurn: Turn = { role: "user", content: q };
    setTurns((prev) => [...prev, userTurn]);
    setLoading(true);

    try {
      const { data } = await api.post("/api/ai/chat", {
        message: q,
        history: turns.map((t) => ({ role: t.role, content: t.content })),
      });
      const assistantTurn: Turn = {
        role: "assistant",
        content: data.response ?? "(no response)",
        toolResults: data.toolResults,
      };
      setTurns((prev) => [...prev, assistantTurn]);
    } catch (err: any) {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err?.response?.data?.error ?? err.message ?? "request failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const mode = detectMode(input);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        className={cn(
          "fixed left-1/2 top-[12vh] z-50 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Sparkles size={18} className="text-primary" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Ask Darb</div>
            <div className="text-[11px] text-secondary">
              Prefix with <kbd className="rounded border border-gray-200 bg-gray-50 px-1">&gt;</kbd> to act,
              <kbd className="ml-1 rounded border border-gray-200 bg-gray-50 px-1">?</kbd> to query.
            </div>
          </div>
          {pendingCount !== null && pendingCount > 0 && (
            <a
              href="/v2/triage"
              onClick={() => setOpen(false)}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
            >
              {pendingCount} need{pendingCount === 1 ? "s" : ""} you
            </a>
          )}
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        {turns.length > 0 && (
          <div ref={scrollRef} className="max-h-[min(60vh,520px)] overflow-y-auto px-4 py-3">
            {turns.map((t, i) => (
              <div key={i} className={cn("mb-3 flex", t.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                    t.role === "user" ? "bg-foreground text-white" : "bg-gray-50 text-foreground"
                  )}
                >
                  {t.content}
                  {t.toolResults && t.toolResults.length > 0 && (
                    <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                      {t.toolResults.map((tr, j) => (
                        <div key={j} className="font-mono">🔧 {tr.toolName}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3.5 py-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> thinking…
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3">
          {mode && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium",
                mode === "action" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
              )}
            >
              {mode}
            </span>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder='Ask anything, or "> approve all appeals where confidence > 0.9"'
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={loading || !input.trim()}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              loading || !input.trim() ? "bg-gray-100 text-gray-400" : "bg-foreground text-white hover:bg-foreground/90"
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>

      {/* Floating trigger (visible when palette is closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105"
        >
          <Sparkles size={16} />
          Ask Darb
          <kbd className="ml-1 rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          {pendingCount !== null && pendingCount > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold">{pendingCount}</span>
          )}
        </button>
      )}
    </>
  );
}

function detectMode(s: string): "action" | "query" | null {
  const trimmed = s.trimStart();
  if (trimmed.startsWith(">")) return "action";
  if (trimmed.startsWith("?")) return "query";
  return null;
}
