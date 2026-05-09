"use client";
// Phase 2 Wave 5 — Step 5 of 5: report preview + Mark as design partner.
//
// REQ-gtm-onboarding. UI-SPEC §3.4.2 Step 5.
//
// Calls getReport(tenantId) on mount. Renders <DarbsReadReport /> in a
// scrollable container. Two CTAs:
//   - "Send report to owner" (Phase 2 placeholder — toast)
//   - "Mark as design partner & start trial" → opens ConfirmModal →
//     POST /start-trial → success toast → onComplete().

import { useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { getReport, startTrial } from "@/lib/adminApi";
import type { ReportData } from "@/types/admin";
import { DarbsReadReport } from "@/components/admin/DarbsReadReport";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toast";

interface ReportPreviewProps {
  tenantId: string;
  onComplete: () => void;
}

export function ReportPreview({ tenantId, onComplete }: ReportPreviewProps) {
  const toast = useToast();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getReport(tenantId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setLoadError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  function handleSendReport() {
    // Phase 2 stub — Phase 9 wires real email delivery.
    toast.info(
      "Email sending ships in Phase 9. For now, print and share manually.",
    );
  }

  async function handleStartTrial() {
    setSubmitting(true);
    try {
      await startTrial(tenantId, { designPartner: true, overrideKd: 100 });
      toast.success(
        "Tenant provisioned. Decisions inbox will populate within 1 hour.",
      );
      setConfirmOpen(false);
      onComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start trial.";
      toast.error(`Couldn't start trial: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <ErrorState
        error={loadError ?? "The report failed to load."}
        onRetry={() => {
          setLoadError(null);
          setLoading(true);
          getReport(tenantId)
            .then(setReport)
            .catch((err) =>
              setLoadError(err instanceof Error ? err.message : String(err)),
            )
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-xl text-slate-900 mb-1">
            Step 5 — Darb's read on your fleet
          </h2>
          <p className="text-sm text-sand-600">
            Review the 30-day report. Mark as design partner to flip
            designPartner=true, monthlyOverrideKd=100, and start the 14-day
            trial.
          </p>
        </div>

        <div className="rounded-2xl border border-sand-200 max-h-[70vh] overflow-y-auto bg-white">
          <DarbsReadReport data={report} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleSendReport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium bg-sand-100 text-sand-800 hover:bg-sand-200 transition-colors"
          >
            <Send size={14} />
            Send report to owner
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-pill text-sm font-medium bg-primary text-white hover:bg-primary-hover"
          >
            <Sparkles size={14} />
            Mark as design partner &amp; start-trial
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Start 14-day design partner trial?"
        message="Sets Tenant.designPartner=true, monthlyOverrideKd=100, trialEndsAt=now+14d. An AgentAction row is written to the audit log."
        confirmLabel="Start trial"
        variant="default"
        onConfirm={handleStartTrial}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </>
  );
}

export default ReportPreview;
