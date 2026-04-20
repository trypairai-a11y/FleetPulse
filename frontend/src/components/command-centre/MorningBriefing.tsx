"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown, ChevronUp, Sunrise, RefreshCw } from "lucide-react";

interface Briefing {
  summary: string;
  alerts?: string[];
  recommendations?: string[];
  generatedAt?: string;
}

interface MorningBriefingProps {
  briefing: Briefing | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function MorningBriefing({ briefing, loading, onRefresh }: MorningBriefingProps) {
  const now = new Date();
  const autoCollapse = now.getHours() >= 9;
  const [open, setOpen] = useState(!autoCollapse);

  if (!briefing && !loading) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-center text-sm text-secondary">
        <Sunrise size={16} className="mx-auto mb-2 text-amber-400" />
        No briefing yet — the Narrator runs hourly during operating hours.
        {onRefresh && (
          <button onClick={onRefresh} className="ml-2 inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium hover:bg-gray-50">
            <RefreshCw size={11} /> Generate now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#fff8ee] to-white p-5 shadow-sm ring-1 ring-amber-100">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <Sunrise size={18} className="text-amber-500" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Morning Briefing</div>
          {loading ? (
            <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-100" />
          ) : (
            <div className={cn("mt-0.5 text-sm text-foreground/80", !open && "line-clamp-1")}>
              {briefing?.summary}
            </div>
          )}
        </div>
        <span className="text-gray-400">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && briefing && (
        <div className="mt-4 space-y-3 border-t border-amber-100 pt-4">
          {briefing.alerts && briefing.alerts.length > 0 && (
            <section>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">Alerts</div>
              <ul className="space-y-1 text-sm text-foreground/80">
                {briefing.alerts.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-red-500">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {briefing.recommendations && briefing.recommendations.length > 0 && (
            <section>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Recommendations</div>
              <ul className="space-y-1 text-sm text-foreground/80">
                {briefing.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-500">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {briefing.generatedAt && (
            <div className="flex items-center justify-between border-t border-amber-100 pt-3 text-[11px] text-secondary">
              <span>Generated {new Date(briefing.generatedAt).toLocaleTimeString()}</span>
              {onRefresh && (
                <button onClick={onRefresh} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 font-medium hover:bg-gray-50">
                  <RefreshCw size={11} /> Refresh
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
