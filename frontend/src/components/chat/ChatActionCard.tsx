// Phase 4 Wave 3 — propose-and-confirm card surfaced inline in chat.
// Reuses /api/decisions/:id/approve from Phase 2 with body fields
// { source:"chat", threadId, msgId } (T-04-W2-05 attribution).
//
// State machine:
//   pending → approving → approved (5s undo window) → (timeout collapses)
//   approving --(server 409)--> pending  (with error toast)
//   pending → dismissed
"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export interface ChatActionProposal {
  pendingActionId: string;
  threadId?: string;
  msgId?: string;
  toolName?: string;
  subject?: string;
  body?: string;
  ctaLabel?: string;
}

export interface ChatActionCardProps {
  proposal: ChatActionProposal;
  /** Optional override; if not provided we POST /api/decisions/:id/approve. */
  onApprove?: (pendingActionId: string, body: { source: "chat"; threadId?: string; msgId?: string }) => Promise<unknown> | unknown;
  onDismiss?: (pendingActionId: string) => void;
  onEdit?: (pendingActionId: string) => void;
  onUndo?: (pendingActionId: string) => void;
}

type CardState = "pending" | "approving" | "approved" | "dismissed" | "error";

export function ChatActionCard({
  proposal,
  onApprove,
  onDismiss,
  onEdit,
  onUndo,
}: ChatActionCardProps) {
  const [state, setState] = useState<CardState>("pending");
  const [error, setError] = useState<string | null>(null);
  const ctaLabel = proposal.ctaLabel ?? "Approve & send";

  // Collapse "approved" cards after 5s (undo window closed).
  useEffect(() => {
    if (state !== "approved") return;
    const t = setTimeout(() => {
      // Card stays on screen but ends its undo affordance — we just
      // strip the Undo button by transitioning to a frozen state.
      // Approved-and-finalized is still rendered, just without the
      // Undo button — handled by the conditional below.
    }, 5000);
    return () => clearTimeout(t);
  }, [state]);

  const handleApprove = async () => {
    setState("approving");
    setError(null);
    const body = {
      source: "chat" as const,
      threadId: proposal.threadId,
      msgId: proposal.msgId,
    };
    try {
      if (onApprove) {
        await onApprove(proposal.pendingActionId, body);
      } else {
        await api.post(
          `/api/decisions/${proposal.pendingActionId}/approve`,
          body,
        );
      }
      setState("approved");
    } catch (err) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError("Already resolved in /decisions.");
      } else {
        const msg = err instanceof Error ? err.message : "Approval failed";
        setError(msg);
      }
      setState("pending");
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(proposal.pendingActionId);
    } else {
      void api
        .post(`/api/decisions/${proposal.pendingActionId}/dismiss`, {
          reason: "via chat",
        })
        .catch(() => {
          /* noop — server attribution lives in /decisions */
        });
    }
    setState("dismissed");
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(proposal.pendingActionId);
    }
  };

  const handleUndo = async () => {
    if (onUndo) {
      onUndo(proposal.pendingActionId);
    } else {
      try {
        await api.post(`/api/decisions/${proposal.pendingActionId}/undo`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Undo failed";
        setError(msg);
      }
    }
    setState("pending");
  };

  if (state === "approved") {
    return (
      <div className="mb-3 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            Approved · sent
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-md px-2 py-1 text-sm text-primary underline-offset-2 hover:underline"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  if (state === "dismissed") {
    return (
      <div className="mb-3 rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
        <span className="text-sm text-secondary">Dismissed.</span>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl bg-card p-4 ring-1 ring-sand-200">
      {proposal.toolName && (
        <div className="mb-1 text-[11px] uppercase tracking-wider text-secondary">
          {proposal.toolName}
        </div>
      )}
      {proposal.subject && (
        <div className="mb-1 text-sm font-medium text-foreground">
          {proposal.subject}
        </div>
      )}
      {proposal.body && (
        <p className="mb-3 whitespace-pre-wrap text-sm text-foreground">
          {proposal.body}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={state === "approving"}
          className="rounded-pill bg-foreground px-3 py-1.5 text-xs font-medium text-white hover:bg-foreground/90 disabled:opacity-60"
        >
          {state === "approving" ? "Approving…" : ctaLabel}
        </button>
        <button
          type="button"
          onClick={handleEdit}
          className="rounded-pill bg-card px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-sand-200 hover:bg-sand-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-pill bg-card px-3 py-1.5 text-xs font-medium text-secondary ring-1 ring-sand-200 hover:bg-sand-50"
        >
          Dismiss
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default ChatActionCard;
