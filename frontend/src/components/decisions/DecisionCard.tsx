"use client";
// Phase 2 Wave 3 — DecisionCard. The hero component (UI-SPEC §3.1.2 + §3.1.3
// + §3.1.5). Tag pill + confidence + headline + 2-line reasoning +
// collapsible disclosures + 3-button action footer with keyboard shortcuts +
// optimistic state transitions.
//
// Server is the source of truth: optimistic flips are presentation-only;
// the parent calls the API and rolls back on error (T-02-17 mitigation).

import { useEffect, useRef, useState } from "react";
import {
  Check,
  XCircle,
  Edit3,
  Trash2,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/cn";
import TagPill from "./TagPill";
import EvidenceList from "./EvidenceList";
import AuditRowPreview from "./AuditRowPreview";
import DismissConfirm from "./DismissConfirm";
import { TOOL_EDITABLE_PARAMS, type DecisionCardData } from "@/types/decisions";

interface DecisionCardProps {
  card: DecisionCardData;
  focused: boolean;
  index: number;
  onApprove: (modifications?: Record<string, unknown>) => void;
  onEdit: () => void;
  onDismiss: (reason: string) => void;
  onUndo?: () => void;
}

const HEADLINE_MAX = 90;

export default function DecisionCard({
  card,
  focused,
  index,
  onApprove,
  onEdit,
  onDismiss,
  onUndo,
}: DecisionCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAuditPreview, setShowAuditPreview] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // Keyboard shortcuts when this card is focused.
  useEffect(() => {
    if (!focused) return;
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      // Don't fire if a modal/drawer is open or an input is focused
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (inField || showDismissConfirm) return;

      if (isMeta && e.key === "Enter") {
        if (!card.toolIsLive) {
          e.preventDefault();
          return;
        }
        if (card.state !== "pending") return;
        e.preventDefault();
        onApprove();
        return;
      }
      if (isMeta && (e.key === "e" || e.key === "E")) {
        if (card.state !== "pending") return;
        const editable = TOOL_EDITABLE_PARAMS[card.toolName] ?? [];
        if (editable.length === 0) return;
        e.preventDefault();
        onEdit();
        return;
      }
      if (isMeta && (e.key === "d" || e.key === "D")) {
        if (card.state !== "pending") return;
        e.preventDefault();
        setShowDismissConfirm(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    focused,
    card.state,
    card.toolIsLive,
    card.toolName,
    onApprove,
    onEdit,
    showDismissConfirm,
  ]);

  // Auto-scroll on focus change. Guarded for jsdom (test env) where
  // scrollIntoView is not implemented.
  useEffect(() => {
    if (
      focused &&
      cardRef.current &&
      typeof cardRef.current.scrollIntoView === "function"
    ) {
      cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused]);

  const editableParams = TOOL_EDITABLE_PARAMS[card.toolName] ?? [];
  const showEditButton = editableParams.length > 0;
  const headline =
    card.headline.length > HEADLINE_MAX
      ? card.headline.slice(0, HEADLINE_MAX) + "…"
      : card.headline;

  const headlineId = `card-${index}-headline`;
  const confidencePct = Math.max(0, Math.round(card.confidence * 100));

  // ---- Approved state ----
  if (card.state === "approved") {
    const approvedAt = card.approvedAt ? new Date(card.approvedAt) : new Date();
    const elapsedSec = Math.max(
      0,
      Math.floor((Date.now() - approvedAt.getTime()) / 1000),
    );
    return (
      <article
        ref={cardRef}
        role="article"
        aria-labelledby={headlineId}
        className={cn(
          "bg-primary/5 border border-primary/20 rounded-2xl shadow-soft p-5 transition-all duration-250 ease-sierra-out",
          focused && "ring-2 ring-primary/40",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
              <Check size={14} aria-hidden="true" />
            </div>
            <span
              id={headlineId}
              className="text-[13px] font-semibold text-primary"
            >
              Approved {elapsedSec}s ago by you
            </span>
          </div>
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-pill px-2 py-1"
            >
              Undo
            </button>
          )}
        </div>
      </article>
    );
  }

  // ---- Dismissed state ----
  if (card.state === "dismissed") {
    return (
      <article
        ref={cardRef}
        role="article"
        aria-labelledby={headlineId}
        className={cn(
          "bg-card border border-sand-200 rounded-2xl shadow-soft p-5 opacity-60 transition-all duration-250 ease-sierra-out",
          focused && "ring-2 ring-primary/40",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-sand-200 text-sand-700 flex items-center justify-center">
            <XCircle size={14} aria-hidden="true" />
          </div>
          <span
            id={headlineId}
            className="text-[13px] font-medium text-sand-700"
          >
            Dismissed{card.dismissalReason ? `: "${card.dismissalReason}"` : ""}
          </span>
        </div>
      </article>
    );
  }

  // ---- Pending state ----
  return (
    <article
      ref={cardRef}
      role="article"
      aria-labelledby={headlineId}
      className={cn(
        "bg-card border border-sand-200 rounded-2xl shadow-soft p-5 transition-all duration-250 ease-sierra-out",
        focused && "ring-2 ring-primary/40",
        "hover:shadow-lift",
      )}
    >
      {/* Header: Tag + confidence + shortcut hint */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <TagPill tag={card.tag} />
          {card.confidence > 0 && (
            <span className="text-[11px] text-secondary tabular-nums">
              {confidencePct}% confidence
            </span>
          )}
          {!card.toolIsLive && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-sand-600 bg-sand-100 px-1.5 py-0.5 rounded-pill"
              title="Action tool ships in Phase 8 — your approval is recorded for training"
            >
              <Info size={10} aria-hidden="true" />
              <span>training-only</span>
            </span>
          )}
        </div>
        {focused && (
          <span className="text-[11px] font-mono text-sand-500 hidden sm:inline">
            ⌘{Math.min(index + 1, 9)}
          </span>
        )}
      </div>

      {/* Driver name label (rendered above headline when headline doesn't
          already include the driver name — keeps the driver searchable on
          every card without duplicating it on cards whose headline already
          starts with the name). Phase 3 placeholder for /drivers/[id]. */}
      {card.driverName &&
        !card.headline.includes(card.driverName) && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (typeof window !== "undefined") {
                window.alert("Driver File ships in Phase 3");
              }
            }}
            className="inline-block text-xs font-medium text-primary hover:underline decoration-primary/40 underline-offset-2"
          >
            {card.driverName}
          </a>
        )}

      {/* Headline */}
      <h3
        id={headlineId}
        className="text-[15px] font-semibold text-foreground leading-snug mt-1"
        title={card.headline}
      >
        {headline}
      </h3>

      {/* Reasoning */}
      <p
        className={cn(
          "text-sm text-sand-700 leading-relaxed mt-2 cursor-pointer",
          !reasoningExpanded && "line-clamp-2",
        )}
        onClick={() => setReasoningExpanded((v) => !v)}
      >
        {card.reasoning}
      </p>

      {/* Disclosures */}
      <div className="flex flex-wrap gap-4 mt-3">
        <button
          type="button"
          onClick={() => setShowEvidence((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-pill"
          aria-expanded={showEvidence}
        >
          <ChevronRight
            size={12}
            className={cn(
              "transition-transform duration-250 ease-sierra-out",
              showEvidence && "rotate-90",
            )}
            aria-hidden="true"
          />
          Show evidence ({card.evidence?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setShowAuditPreview((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-pill"
          aria-expanded={showAuditPreview}
        >
          <ChevronRight
            size={12}
            className={cn(
              "transition-transform duration-250 ease-sierra-out",
              showAuditPreview && "rotate-90",
            )}
            aria-hidden="true"
          />
          Audit-row preview
        </button>
      </div>

      {showEvidence && <EvidenceList items={card.evidence ?? []} />}
      {showAuditPreview && <AuditRowPreview proposal={card.proposalDraft} />}

      {/* Action footer */}
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-sand-200"
      >
        <button
          type="button"
          onClick={() => onApprove()}
          disabled={!card.toolIsLive}
          title={
            card.toolIsLive
              ? "Approve (⌘↵ when focused)"
              : "Action tool ships in Phase 8 — your approval is recorded for training"
          }
          aria-label={`Approve ${card.tag} for ${card.driverName}`}
          className={cn(
            "inline-flex items-center gap-1.5 h-10 px-6 rounded-pill text-sm font-medium transition-colors duration-250 ease-sierra-out",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card",
            card.toolIsLive
              ? "bg-primary text-white hover:bg-primary-hover focus:ring-primary"
              : "bg-sand-200 text-sand-500 cursor-not-allowed",
          )}
        >
          <Check size={14} aria-hidden="true" />
          Approve
          <kbd className="ms-1 hidden sm:inline font-mono text-[10px] opacity-80">
            ⌘↵
          </kbd>
        </button>

        {showEditButton && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${card.tag} for ${card.driverName}`}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-pill text-sm font-medium text-sand-900 bg-card border border-sand-300 hover:bg-sand-100 transition-colors duration-250 ease-sierra-out focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <Edit3 size={14} aria-hidden="true" />
            Edit
            <kbd className="ms-1 hidden sm:inline font-mono text-[10px] opacity-70">
              ⌘E
            </kbd>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowDismissConfirm(true)}
          aria-label={`Dismiss ${card.tag} for ${card.driverName}`}
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-pill text-sm font-medium text-sand-700 bg-transparent hover:bg-sand-100 transition-colors duration-250 ease-sierra-out focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <Trash2 size={14} aria-hidden="true" />
          Dismiss
          <kbd className="ms-1 hidden sm:inline font-mono text-[10px] opacity-70">
            ⌘D
          </kbd>
        </button>
      </div>

      <DismissConfirm
        open={showDismissConfirm}
        driverName={card.driverName}
        onConfirm={(reason) => {
          setShowDismissConfirm(false);
          onDismiss(reason);
        }}
        onCancel={() => setShowDismissConfirm(false)}
      />
    </article>
  );
}
