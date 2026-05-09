"use client";
// Phase 2 Wave 5 — Override toggle for /admin/billing/[tenantId].
//
// REQ-pricing-model. UI-SPEC §3.5.3.
//
// Switch labeled "Design partner override". When enabled:
//   - input for override amount (KD, 3-decimal step)
//   - textarea for "Override reason (audit-only)" (required, min 10 chars)
//   - Save → ConfirmModal → onSave(override, reason).
// When override > floor (KD 200): show warning toast.
// Disable button → onSave(null, "Override removed: {reason}").
// Reason required for both enable and disable (T-02-25 — audit shape requires it).

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { useToast } from "@/components/shared/Toast";
import { cn } from "@/lib/cn";

interface OverrideToggleProps {
  tenantId: string;
  currentOverride: number | null;
  onSave: (override: number | null, reason: string) => Promise<void> | void;
}

const FLOOR_KD = 200;
const MIN_REASON_LENGTH = 10;

export function OverrideToggle({
  tenantId: _tenantId,
  currentOverride,
  onSave,
}: OverrideToggleProps) {
  const toast = useToast();
  const [enabled, setEnabled] = useState<boolean>(currentOverride != null);
  const [override, setOverride] = useState<number | "">(currentOverride ?? "");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState<null | "enable" | "disable">(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync controlled state when prop changes (after a successful save).
  useEffect(() => {
    setEnabled(currentOverride != null);
    setOverride(currentOverride ?? "");
  }, [currentOverride]);

  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH;
  const overrideOk =
    enabled === false ||
    (typeof override === "number" && Number.isFinite(override) && override >= 0);
  const canSave = reasonOk && overrideOk;

  function handleSubmit() {
    if (!canSave) return;
    if (enabled) {
      if (typeof override === "number" && override > FLOOR_KD) {
        toast.warning(
          `Override raises bill above standard floor (KD ${FLOOR_KD}). Confirming will apply it.`,
        );
      }
      setConfirmOpen("enable");
    } else {
      setConfirmOpen("disable");
    }
  }

  async function doSave() {
    setSubmitting(true);
    try {
      const overrideValue = enabled
        ? typeof override === "number"
          ? override
          : Number(override)
        : null;
      const auditReason = enabled
        ? reason.trim()
        : `Override removed: ${reason.trim()}`;
      await onSave(overrideValue, auditReason);
      toast.success(
        overrideValue == null
          ? "Override cleared. Standard pricing applies."
          : `Override saved: KD ${overrideValue.toFixed(3)}/month.`,
      );
      setReason("");
      setConfirmOpen(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      toast.error(`Couldn't save override: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-sand-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Design partner override
            </p>
            <p className="text-xs text-sand-600 mt-0.5 max-w-prose">
              When enabled, monthlyOverrideKd replaces the computed bill for this
              tenant only. Audit row written via writeAgentAction with the
              originator's identity and reason.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (!e.target.checked) setOverride("");
              }}
              aria-label="Enable design partner override"
            />
            <span className="text-xs text-sand-700">
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {enabled && (
          <div className="space-y-1.5">
            <label
              htmlFor="override-amount"
              className="text-xs font-medium text-sand-700 uppercase tracking-wider"
            >
              Override amount (KD/month, monthlyOverrideKd)
            </label>
            <input
              id="override-amount"
              type="number"
              min={0}
              step={0.001}
              value={override}
              onChange={(e) =>
                setOverride(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="100.000"
              className="w-40 px-3 py-2 text-sm rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="override-reason"
            className="text-xs font-medium text-sand-700 uppercase tracking-wider"
          >
            Override reason (audit-only) — min {MIN_REASON_LENGTH} chars
          </label>
          <textarea
            id="override-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this override applied? E.g. design-partner agreement signed 2026-05-09."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <p
            className={cn(
              "text-xs",
              reasonOk ? "text-sand-500" : "text-red-600",
            )}
          >
            {reason.trim().length}/{MIN_REASON_LENGTH}+ characters
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave || submitting}
            className={cn(
              "inline-flex items-center gap-2 px-4 h-10 rounded-pill text-sm font-medium transition-colors",
              canSave && !submitting
                ? "bg-primary text-white hover:bg-primary-hover"
                : "bg-sand-200 text-sand-500 cursor-not-allowed",
            )}
          >
            <Save size={14} />
            Save override
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen !== null}
        title={
          confirmOpen === "enable"
            ? `Apply override KD ${typeof override === "number" ? override.toFixed(3) : "—"}?`
            : "Remove override and revert to standard pricing?"
        }
        message={
          confirmOpen === "enable"
            ? "Saves monthlyOverrideKd on this tenant. AgentAction audit row written with the reason."
            : "Sets monthlyOverrideKd=null. The bill reverts to max(activeCouriers × 2, KD 200) next month."
        }
        confirmLabel={confirmOpen === "enable" ? "Apply override" : "Remove override"}
        variant={confirmOpen === "disable" ? "warning" : "default"}
        loading={submitting}
        onConfirm={doSave}
        onCancel={() => setConfirmOpen(null)}
      />
    </>
  );
}

export default OverrideToggle;
