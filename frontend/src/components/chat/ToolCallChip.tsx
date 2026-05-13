// Phase 4 Wave 3 — collapsible tool-call chip (UI-SPEC §3.2.3).
"use client";
import { useState } from "react";
import { Wrench, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import type { ToolCallRecord } from "@/types/chat";

const STATE_ICON: Record<ToolCallRecord["state"], React.ReactNode> = {
  running: <Wrench className="h-3 w-3 animate-pulse" />,
  success: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
  error: <XCircle className="h-3 w-3 text-red-600" />,
};

export function ToolCallChip({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-2.5 py-1 text-[11px] text-secondary hover:bg-sand-100"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {STATE_ICON[call.state]}
        <span className="font-mono">{call.toolName}</span>
        {typeof call.latencyMs === "number" && (
          <span className="text-sand-500">·{call.latencyMs}ms</span>
        )}
      </button>
      {open && (
        <div className="mt-1 rounded-lg bg-sand-50 p-2 text-[11px]">
          <div className="mb-1 text-secondary">Input</div>
          <pre className="overflow-x-auto whitespace-pre-wrap text-foreground">
            {JSON.stringify(call.input, null, 2)}
          </pre>
          {call.output !== undefined && (
            <>
              <div className="mb-1 mt-2 text-secondary">Output</div>
              <pre className="overflow-x-auto whitespace-pre-wrap text-foreground">
                {JSON.stringify(call.output, null, 2)}
              </pre>
            </>
          )}
          {call.errorMessage && (
            <div className="mt-2 text-red-600">{call.errorMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCallChip;
