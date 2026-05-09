"use client";
// Phase 2 Wave 5 — Step 4 of 5: 30-day backwash.
//
// REQ-gtm-onboarding. UI-SPEC §3.4.2 Step 4.
//
// Click "Run Darb's read on your fleet" → POST /run-backwash → returns
// jobId. Then poll GET /backwash-status?jobId every 5_000ms. Renders
// per-platform progress bars from response.progress.message + step/totalSteps.
//
// State machine:
//   idle → starting → running (with poller) → completed | failed
//
// On completed: show "Continue to report" button → onComplete(jobId).
// On failed: show ErrorState + retry.

import { useEffect, useRef, useState } from "react";
import { Play, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { runBackwash, getBackwashStatus } from "@/lib/adminApi";
import type { BackwashStatus, BackwashPlatform } from "@/types/admin";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/cn";

interface BackwashStepProps {
  tenantId: string;
  onComplete: (jobId: string) => void;
}

const POLL_INTERVAL_MS = 5_000;
const PLATFORMS: BackwashPlatform[] = ["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"];

type Phase = "idle" | "starting" | "running" | "completed" | "failed";

function deriveTotalSteps(progress: BackwashStatus["progress"]): number {
  if (progress && typeof progress === "object" && "totalSteps" in progress) {
    return Number(progress.totalSteps ?? 24);
  }
  return 24; // 4 platforms × 6 chunks of 5 days each = default 24
}

function deriveStep(progress: BackwashStatus["progress"]): number {
  if (typeof progress === "number") return Math.round((progress / 100) * 24);
  if (progress && typeof progress === "object" && "step" in progress) {
    return Number(progress.step ?? 0);
  }
  return 0;
}

function deriveMessage(progress: BackwashStatus["progress"]): string {
  if (progress && typeof progress === "object" && "message" in progress) {
    return String(progress.message ?? "");
  }
  return "";
}

// Per-platform progress derivation: parse the message for the platform
// keyword, otherwise distribute evenly across the 4 platforms.
function platformProgress(
  platform: BackwashPlatform,
  step: number,
  totalSteps: number,
  message: string,
): { pct: number; message: string } {
  const perPlatform = totalSteps / PLATFORMS.length;
  const idx = PLATFORMS.indexOf(platform);
  const platformStart = idx * perPlatform;
  const stepInPlatform = Math.max(0, Math.min(perPlatform, step - platformStart));
  const pct = perPlatform > 0 ? (stepInPlatform / perPlatform) * 100 : 0;
  const msg = message.toUpperCase().includes(platform) ? message : "";
  return { pct: Math.min(100, Math.max(0, pct)), message: msg };
}

export function BackwashStep({ tenantId, onComplete }: BackwashStepProps) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<BackwashStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function startBackwash() {
    setPhase("starting");
    setError(null);
    try {
      const resp = await runBackwash(tenantId, { windowDays: 30, platforms: PLATFORMS });
      setJobId(resp.jobId);
      setPhase("running");
      // Begin poll
      pollRef.current = setInterval(async () => {
        try {
          const s = await getBackwashStatus(tenantId, resp.jobId);
          setStatus(s);
          if (s.state === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setPhase("completed");
            toast.success("Backwash complete — report ready.");
          } else if (s.state === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setPhase("failed");
            setError("Backwash job failed. Check server logs.");
          }
        } catch (e) {
          // Transient poll error; keep going.
          // eslint-disable-next-line no-console
          console.warn("backwash status poll failed", e);
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start.";
      setPhase("failed");
      setError(msg);
      toast.error(`Couldn't start backwash: ${msg}`);
    }
  }

  const totalSteps = deriveTotalSteps(status?.progress ?? null);
  const step = deriveStep(status?.progress ?? null);
  const message = deriveMessage(status?.progress ?? null);
  const overallPct = totalSteps > 0 ? Math.min(100, (step / totalSteps) * 100) : 0;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="font-display text-xl text-slate-900 mb-1">
          Step 4 — Backwash 30 days
        </h2>
        <p className="text-sm text-sand-600">
          We'll pull the last 30 days from each platform in 5-day chunks.
          Estimated time: ~4–8 minutes.
        </p>
      </div>

      {phase === "idle" && (
        <button
          type="button"
          onClick={startBackwash}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-pill text-sm font-medium bg-primary text-white hover:bg-primary-hover"
        >
          <Play size={14} />
          Run Darb's read on your fleet (30 days)
        </button>
      )}

      {phase === "starting" && (
        <p className="text-sm text-sand-600">Starting job…</p>
      )}

      {(phase === "running" || phase === "completed") && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-sand-700">
                Overall progress
              </span>
              <span className="text-xs font-mono tabular-nums text-sand-700">
                {step}/{totalSteps} chunks
              </span>
            </div>
            <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            {message && (
              <p className="mt-2 text-xs text-sand-600 italic">{message}</p>
            )}
          </div>

          <div className="space-y-2">
            {PLATFORMS.map((p) => {
              const { pct, message: msg } = platformProgress(p, step, totalSteps, message);
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-sand-700 font-medium">{p}</span>
                    <span className="text-xs font-mono tabular-nums text-sand-600">
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {msg && (
                    <p className="mt-1 text-[11px] text-sand-500 italic">{msg}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phase === "completed" && jobId && (
        <button
          type="button"
          onClick={() => onComplete(jobId)}
          className="inline-flex items-center gap-2 px-5 h-10 rounded-pill text-sm font-medium bg-primary text-white hover:bg-primary-hover"
        >
          Continue to report
          <ArrowRight size={14} />
        </button>
      )}

      {phase === "failed" && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-600 mt-0.5" />
            <p className="text-sm text-red-800 flex-1">
              {error ?? "Backwash job failed."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setError(null);
              setStatus(null);
              setJobId(null);
            }}
            className="inline-flex items-center gap-2 text-xs font-medium text-red-700 hover:underline"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default BackwashStep;
