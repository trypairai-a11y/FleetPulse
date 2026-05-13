// Phase 4 Wave 3 — callout viewBlock (UI-SPEC §3.2.4 variant 7).
"use client";
import type { CalloutSpec } from "@/types/views";
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from "lucide-react";

const TONE_CLASS: Record<string, string> = {
  info: "bg-sky-50 ring-sky-200 text-sky-900",
  warning: "bg-amber-50 ring-amber-200 text-amber-900",
  danger: "bg-red-50 ring-red-200 text-red-900",
  success: "bg-emerald-50 ring-emerald-200 text-emerald-900",
};

function Icon({ tone }: { tone: string }) {
  if (tone === "warning") return <AlertTriangle className="h-4 w-4 shrink-0" />;
  if (tone === "danger") return <AlertCircle className="h-4 w-4 shrink-0" />;
  if (tone === "success") return <CheckCircle2 className="h-4 w-4 shrink-0" />;
  return <Info className="h-4 w-4 shrink-0" />;
}

export function CalloutView({ spec }: { spec: CalloutSpec }) {
  const tone = spec.severity ?? spec.tone ?? "info";
  const body = spec.message ?? spec.body ?? "";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg p-3 ring-1 ${
        TONE_CLASS[tone] ?? TONE_CLASS.info
      }`}
    >
      <Icon tone={tone} />
      <div className="flex-1 text-sm">
        {spec.title && <div className="mb-1 font-medium">{spec.title}</div>}
        {body && <p className="leading-snug">{body}</p>}
        {spec.bullets && spec.bullets.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-xs">
            {spec.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CalloutView;
