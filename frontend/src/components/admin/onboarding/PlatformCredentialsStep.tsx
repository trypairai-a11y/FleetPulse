"use client";
// Phase 2 Wave 5 — Step 3 of 5: platform credentials.
//
// REQ-gtm-onboarding. UI-SPEC §3.4.2 Step 3.
//
// 4 cards (Keeta / Talabat / Deliveroo / Americana). Each card has:
//   - Toggle "Enable {platform}"
//   - When enabled: username + password inputs + Test connection button
//   - Status chip: ✓ Connected / ✗ Failed / — Not tested
//
// Phase 2 backend returns 202 + Phase-6 handoff note. Per
// DEC-scrapers-as-adapter-layer the mobile app ships first; this is a
// preview surface.

import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import {
  setPlatformCredentials,
  type PlatformCredsRequest,
} from "@/lib/adminApi";
import type { BackwashPlatform } from "@/types/admin";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/cn";

interface PlatformCredentialsStepProps {
  tenantId: string;
  onNext: () => void;
}

interface PlatformCardState {
  enabled: boolean;
  username: string;
  password: string;
  status: "untested" | "ok" | "failed";
  error?: string;
  showPassword: boolean;
}

const PLATFORMS: Array<{ key: BackwashPlatform; label: string; tone: string }> = [
  { key: "KEETA", label: "Keeta", tone: "border-amber-200 bg-amber-50/40" },
  { key: "TALABAT", label: "Talabat", tone: "border-orange-200 bg-orange-50/40" },
  { key: "DELIVEROO", label: "Deliveroo", tone: "border-teal-200 bg-teal-50/40" },
  { key: "AMERICANA", label: "Americana", tone: "border-sky-200 bg-sky-50/40" },
];

const initialState: Record<BackwashPlatform, PlatformCardState> = {
  KEETA: { enabled: false, username: "", password: "", status: "untested", showPassword: false },
  TALABAT: { enabled: false, username: "", password: "", status: "untested", showPassword: false },
  DELIVEROO: { enabled: false, username: "", password: "", status: "untested", showPassword: false },
  AMERICANA: { enabled: false, username: "", password: "", status: "untested", showPassword: false },
};

export function PlatformCredentialsStep({
  tenantId,
  onNext,
}: PlatformCredentialsStepProps) {
  const toast = useToast();
  const [state, setState] = useState(initialState);
  const [continuing, setContinuing] = useState(false);

  function update(platform: BackwashPlatform, patch: Partial<PlatformCardState>) {
    setState((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));
  }

  async function testConnection(platform: BackwashPlatform) {
    const card = state[platform];
    if (!card.enabled || !card.username || !card.password) return;
    update(platform, { status: "untested" });
    try {
      const body: PlatformCredsRequest = {
        platform,
        username: card.username,
        password: card.password,
        enabled: true,
      };
      const resp = await setPlatformCredentials(tenantId, body);
      if (resp.connected === false) {
        update(platform, {
          status: "failed",
          error: resp.error ?? "Connection failed",
        });
      } else {
        update(platform, { status: "ok", error: undefined });
        toast.success(`${platform} handoff recorded.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      update(platform, { status: "failed", error: msg });
      toast.error(`${platform} test failed: ${msg}`);
    }
  }

  async function handleContinue() {
    setContinuing(true);
    try {
      // Persist any enabled-but-untested platforms (best-effort).
      for (const { key } of PLATFORMS) {
        const card = state[key];
        if (card.enabled && card.status === "untested" && card.username && card.password) {
          try {
            await setPlatformCredentials(tenantId, {
              platform: key,
              username: card.username,
              password: card.password,
              enabled: true,
            });
            update(key, { status: "ok" });
          } catch {
            // surfaced via per-card status; continue
          }
        }
      }
      onNext();
    } finally {
      setContinuing(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="font-display text-xl text-slate-900 mb-1">
          Step 3 — Platform access
        </h2>
        <p className="text-sm text-sand-600">
          Until your couriers install the Darb mobile app, we'll use scraping.
          We'll switch automatically when the app rolls out (Phase 6).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((p) => {
          const card = state[p.key];
          return (
            <div
              key={p.key}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                p.tone,
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.label}</p>
                  <p className="text-xs text-sand-600">
                    {card.status === "ok" && "✓ Connected"}
                    {card.status === "failed" && `✗ Failed: ${card.error ?? "unknown"}`}
                    {card.status === "untested" && "— Not tested"}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={card.enabled}
                    onChange={(e) =>
                      update(p.key, { enabled: e.target.checked })
                    }
                    aria-label={`Enable ${p.label}`}
                  />
                  <span className="text-xs text-sand-700">Enable</span>
                </label>
              </div>
              {card.enabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={card.username}
                    onChange={(e) =>
                      update(p.key, { username: e.target.value })
                    }
                    placeholder={`${p.label} username`}
                    autoComplete="off"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-sand-200 bg-white"
                  />
                  <div className="relative">
                    <input
                      type={card.showPassword ? "text" : "password"}
                      value={card.password}
                      onChange={(e) =>
                        update(p.key, { password: e.target.value })
                      }
                      placeholder="password"
                      autoComplete="off"
                      className="w-full px-3 py-2 pe-10 text-sm rounded-xl border border-sand-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        update(p.key, { showPassword: !card.showPassword })
                      }
                      aria-label={card.showPassword ? "Hide password" : "Show password"}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-sand-500 hover:text-sand-700"
                    >
                      {card.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => testConnection(p.key)}
                    disabled={!card.username || !card.password}
                    className="text-xs font-medium text-primary hover:underline disabled:text-sand-400 disabled:no-underline"
                  >
                    Test connection
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-sand-600 italic">
        Credentials are POSTed to the Phase-6 handoff endpoint and held for
        the existing TalabatSession / KeetaPortalCredential models. Phase 2
        records the handoff only.
      </p>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={continuing}
          className="inline-flex items-center gap-2 px-5 h-10 rounded-pill text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {continuing ? "Saving…" : "Continue"}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default PlatformCredentialsStep;
