"use client";

/**
 * Keeta Owner Copilot — AI Chief of Staff
 * ----------------------------------------
 * Single page combining: morning briefing, ask-anything chat, decision agent.
 * Bilingual (EN primary, AR secondary). Mobile-friendly two-column layout.
 *
 * Wire to backend: POST /api/ai/cos  +  GET /api/ai/cos/briefing
 */

import { useEffect, useState } from "react";
import { Sparkles, Send, BrainCircuit, TrendingUp, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

type CosMode = "briefing" | "ask" | "decide" | "forecast";
interface CosResponse {
  mode: CosMode;
  text: string;
  textAr?: string;
  actions?: Array<{
    title: string;
    titleAr?: string;
    rationale: string;
    estimatedImpactKD?: number;
    confidence?: number;
  }>;
  toolTrace?: Array<{ tool: string; input: unknown; result: unknown }>;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  ar?: string;
}

const QUICK_ASKS = [
  "Why did Hawally revenue drop yesterday?",
  "Which couriers are at churn risk this week?",
  "Where should I raise incentives for tonight?",
  "Top 3 actions to grow this week's revenue by 10%",
];

export default function KeetaCopilotPage() {
  const [briefing, setBriefing] = useState<CosResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/api/ai/cos/briefing")
      .then((r) => setBriefing(r.data))
      .catch(() => setBriefing({ mode: "briefing", text: "Briefing unavailable." }))
      .finally(() => setBriefingLoading(false));
  }, []);

  const ask = async (prompt: string, mode: CosMode = "ask") => {
    if (!prompt.trim() || busy) return;
    const turn: ChatTurn = { role: "user", content: prompt };
    setHistory((h) => [...h, turn]);
    setInput("");
    setBusy(true);
    try {
      const resp = await api.post("/api/ai/cos", {
        mode,
        prompt,
        history: history.map((t) => ({ role: t.role, content: t.content })),
      });
      const data: CosResponse = resp.data;
      setHistory((h) => [
        ...h,
        { role: "assistant", content: data.text, ar: data.textAr },
      ]);
    } catch {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* ── Morning Briefing ─────────────────────────────────────────── */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-semibold">Morning Briefing</h2>
          <span className="ml-auto text-xs text-gray-500">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
        {briefingLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
          </div>
        ) : (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
              {briefing?.text}
            </pre>
            {briefing?.textAr && (
              <pre
                dir="rtl"
                className="mt-4 pt-4 border-t whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-600"
              >
                {briefing.textAr}
              </pre>
            )}
          </>
        )}
      </div>

      {/* ── Quick decision actions ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Decide for me</h2>
        </div>
        <button
          onClick={() => ask("Propose the 3 highest-leverage actions I should take in the next 24 hours, with KD impact and confidence.", "decide")}
          disabled={busy}
          className="w-full text-left px-4 py-3 mb-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-sm font-medium disabled:opacity-50"
        >
          <TrendingUp className="inline w-4 h-4 mr-2" />
          3 highest-leverage actions today
        </button>
        <button
          onClick={() => ask("What anomalies need my attention right now? Rank by financial impact.", "decide")}
          disabled={busy}
          className="w-full text-left px-4 py-3 mb-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-sm font-medium disabled:opacity-50"
        >
          <AlertTriangle className="inline w-4 h-4 mr-2" />
          What needs attention now
        </button>
        <button
          onClick={() => ask("Forecast next 24h demand by area and tell me where to push couriers and incentives.", "forecast")}
          disabled={busy}
          className="w-full text-left px-4 py-3 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-900 text-sm font-medium disabled:opacity-50"
        >
          <Sparkles className="inline w-4 h-4 mr-2" />
          Forecast next 24h
        </button>
      </div>

      {/* ── Ask-anything chat ───────────────────────────────────────── */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border flex flex-col h-[600px]">
        <div className="p-4 border-b flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold">Ask anything about your fleet</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ASKS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left text-sm px-4 py-3 rounded-lg border bg-gray-50 hover:bg-gray-100"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {history.map((t, i) => (
            <div
              key={i}
              className={`max-w-[80%] ${t.role === "user" ? "ml-auto" : ""}`}
            >
              <div
                className={`px-4 py-3 rounded-2xl text-sm ${
                  t.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {t.content}
                {t.ar && (
                  <div dir="rtl" className="mt-2 pt-2 border-t border-black/10 opacity-80">
                    {t.ar}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" /> Thinking…
            </div>
          )}
        </div>

        <form
          className="p-4 border-t flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about drivers, revenue, violations, anything…"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
