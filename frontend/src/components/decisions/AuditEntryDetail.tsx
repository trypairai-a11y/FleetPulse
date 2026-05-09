"use client";
// Phase 2 Wave 3 — Audit entry detail drawer (UI-SPEC §3.2.3).
// 7 sections: header, timing, original proposal, modifications diff,
// reasoning, outcome detail, rollback button (admin-only, draftCourierMessage).

import { useState } from "react";
import { Check, AlertCircle, RotateCcw } from "lucide-react";
import SlidePanel from "@/components/shared/SlidePanel";
import ConfirmModal from "@/components/shared/ConfirmModal";
import AuditRowPreview from "./AuditRowPreview";
import { cn } from "@/lib/cn";
import type { AgentActionDetail } from "@/types/decisions";

interface AuditEntryDetailProps {
  entry: AgentActionDetail | null;
  open: boolean;
  onClose: () => void;
  canRollback?: boolean;
  onRollback?: (reason: string) => void;
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AuditEntryDetail({
  entry,
  open,
  onClose,
  canRollback = false,
  onRollback,
}: AuditEntryDetailProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!entry) return null;

  const subjectLabel = entry.subjectId
    ? `${entry.subjectType} · ${entry.subjectId}`
    : entry.subjectType;

  const startedAt = entry.agentRun?.startedAt ?? null;
  const finishedAt = entry.agentRun?.finishedAt ?? null;
  const latencyMs =
    startedAt && finishedAt
      ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      : null;

  const promptTokens = entry.agentRun?.promptTokens ?? 0;
  const completionTokens = entry.agentRun?.completionTokens ?? 0;

  const outcomeStyles: Record<string, { bg: string; text: string; dot: string }> = {
    success: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
    failure: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    rolled_back: {
      bg: "bg-sand-100",
      text: "text-sand-800",
      dot: "bg-sand-500",
    },
  };
  const outcome = outcomeStyles[entry.outcome] ?? outcomeStyles.success;

  const eligibleForRollback =
    canRollback &&
    entry.outcome === "success" &&
    entry.rolledBackAt === null &&
    entry.toolName === "draftCourierMessage" &&
    typeof onRollback === "function";

  function handleRollbackSubmit() {
    if (!eligibleForRollback || submitting) return;
    if (rollbackReason.trim().length === 0) return;
    setSubmitting(true);
    if (onRollback) {
      onRollback(rollbackReason.trim());
    }
    setConfirmOpen(false);
    setRollbackReason("");
    setSubmitting(false);
  }

  return (
    <>
      <SlidePanel
        open={open}
        onClose={onClose}
        title={entry.toolName}
        subtitle="Audit entry"
      >
        <div className="space-y-6">
          {/* Header info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill h-[22px] px-2.5 text-[11px] font-semibold",
                  outcome.bg,
                  outcome.text,
                )}
              >
                <span
                  className={cn("w-1.5 h-1.5 rounded-full", outcome.dot)}
                  aria-hidden="true"
                />
                {entry.outcome.replace("_", " ")}
              </span>
              <span className="text-xs text-sand-600">{subjectLabel}</span>
            </div>
            <p className="text-xs text-sand-600 mt-2">
              Approver:{" "}
              <span className="text-sand-900">
                {entry.approver?.name ?? entry.approver?.email ?? "—"}
              </span>
            </p>
          </div>

          {/* Timing */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-sand-600 mb-2">
              Timing
            </h3>
            <dl className="text-xs space-y-1 font-mono">
              <div className="flex justify-between gap-4">
                <dt className="text-sand-600">Created</dt>
                <dd className="text-sand-900">{fmtTime(entry.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sand-600">Started</dt>
                <dd className="text-sand-900">{fmtTime(startedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sand-600">Finished</dt>
                <dd className="text-sand-900">{fmtTime(finishedAt)}</dd>
              </div>
              {latencyMs !== null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-sand-600">Latency</dt>
                  <dd className="text-sand-900 tabular-nums">{latencyMs}ms</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-sand-600">Tokens</dt>
                <dd className="text-sand-900 tabular-nums">
                  {promptTokens} prompt / {completionTokens} completion
                </dd>
              </div>
            </dl>
          </section>

          {/* Original proposal */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-sand-600 mb-2">
              Original proposal
            </h3>
            <AuditRowPreview
              proposal={{
                toolName: entry.toolName,
                args: entry.originalProposal ?? {},
                reasoning: entry.reasoning ?? "",
                subjectType: entry.subjectType,
                subjectId: entry.subjectId,
              }}
            />
          </section>

          {/* Modifications */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-sand-600 mb-2">
              Modifications before approval
            </h3>
            {entry.modificationsBeforeApproval &&
            Object.keys(entry.modificationsBeforeApproval).length > 0 ? (
              <pre className="font-mono text-[12px] leading-relaxed text-foreground bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                {JSON.stringify(entry.modificationsBeforeApproval, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-sand-600 italic">No edits</p>
            )}
          </section>

          {/* Reasoning */}
          {entry.reasoning && (
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-sand-600 mb-2">
                Reasoning
              </h3>
              <blockquote className="text-sm text-sand-800 italic leading-relaxed border-s-2 border-sand-200 ps-3 max-h-40 overflow-y-auto">
                {entry.reasoning}
              </blockquote>
            </section>
          )}

          {/* Outcome detail */}
          <section>
            <h3 className="text-[11px] uppercase tracking-widest text-sand-600 mb-2">
              Outcome
            </h3>
            {entry.outcome === "success" && (
              <div className="flex items-start gap-2 text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>Action completed</span>
              </div>
            )}
            {entry.outcome === "failure" && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle
                  size={14}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{entry.errorMessage ?? "Action failed"}</span>
              </div>
            )}
            {entry.outcome === "rolled_back" && (
              <div className="text-sm text-sand-800 bg-sand-100 border border-sand-200 rounded-xl px-3 py-2">
                <p>
                  Rolled back
                  {entry.rolledBackById ? ` by ${entry.rolledBackById}` : ""}
                  {entry.rolledBackAt
                    ? ` on ${fmtTime(entry.rolledBackAt)}`
                    : ""}
                  .
                </p>
                {entry.rollbackReason && (
                  <p className="mt-1 text-xs text-sand-700">
                    Reason: {entry.rollbackReason}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Subject link (Phase 3 placeholder) */}
          {entry.subjectType === "Driver" && entry.subjectId && (
            <section>
              <h3 className="text-[11px] uppercase tracking-widest text-sand-600 mb-2">
                Subject
              </h3>
              <a
                href={`/drivers/${entry.subjectId}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== "undefined") {
                    window.alert("Driver File ships in Phase 3");
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                Open Driver File →
              </a>
            </section>
          )}

          {/* Rollback button */}
          {eligibleForRollback && (
            <div className="pt-4 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-pill text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors duration-250 ease-sierra-out focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Rollback this action
              </button>
            </div>
          )}
        </div>
      </SlidePanel>

      <ConfirmModal
        open={confirmOpen}
        title="Rollback this action?"
        message="The drafted message will be marked as never-sent in the audit trail. This is reversible by re-approving the original proposal."
        variant="warning"
        confirmLabel={
          rollbackReason.trim().length === 0
            ? "Enter a reason first"
            : "Rollback"
        }
        cancelLabel="Cancel"
        loading={submitting}
        onCancel={() => {
          setConfirmOpen(false);
          setRollbackReason("");
        }}
        onConfirm={handleRollbackSubmit}
      />
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 pointer-events-none">
          <div className="bg-card border border-sand-200 rounded-2xl shadow-float p-4 w-full max-w-md pointer-events-auto translate-y-20">
            <label
              htmlFor="rollback-reason-input"
              className="block text-xs font-medium text-sand-700 mb-1.5"
            >
              Reason for rollback (audit-logged)
            </label>
            <textarea
              id="rollback-reason-input"
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value.slice(0, 280))}
              rows={3}
              maxLength={280}
              placeholder="e.g. Driver was on approved leave, false positive on attendance scan"
              className="w-full px-3 py-2 rounded-xl border border-sand-300 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-sand-500 text-end">
              {rollbackReason.length}/280
            </p>
          </div>
        </div>
      )}
    </>
  );
}
