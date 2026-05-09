"use client";
// Phase 2 Wave 3 — Single-card permalink (UI-SPEC §3.3). Shareable across
// users in the same tenant; tenantScope middleware enforces 403 across
// tenants on the backend.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  approveDecision,
  dismissDecision,
  getDecision,
  undoDecision,
} from "@/lib/decisionsApi";
import DecisionCard from "@/components/decisions/DecisionCard";
import EditDrawer from "@/components/decisions/EditDrawer";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toast";
import type { DecisionCardData } from "@/types/decisions";

export default function DecisionPermalinkPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const toastApi = useToast();

  const [card, setCard] = useState<DecisionCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchCard = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDecision(id);
      setCard(data);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Couldn't load this decision. The link may have expired or been resolved by another user.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  async function handleApprove(modifications?: Record<string, unknown>) {
    if (!card) return;
    const original = card;
    setCard({
      ...card,
      state: "approved",
      approvedAt: new Date().toISOString(),
    });
    try {
      await approveDecision(card.id, modifications);
      toastApi.success(`Approved ${original.tag} for ${original.driverName}`);
    } catch (e: unknown) {
      setCard(original);
      const msg =
        e instanceof Error ? e.message : "Couldn't approve. Try again.";
      toastApi.error(msg);
    }
  }

  async function handleDismiss(reason: string) {
    if (!card) return;
    const original = card;
    setCard({
      ...card,
      state: "dismissed",
      dismissalReason: reason,
      dismissedAt: new Date().toISOString(),
    });
    try {
      await dismissDecision(card.id, reason);
    } catch (e: unknown) {
      setCard(original);
      const msg =
        e instanceof Error ? e.message : "Couldn't dismiss. Try again.";
      toastApi.error(msg);
    }
  }

  async function handleUndo() {
    if (!card) return;
    const original = card;
    setCard({ ...card, state: "pending", approvedAt: undefined });
    try {
      await undoDecision(card.id);
      toastApi.info("Approval undone");
    } catch (e: unknown) {
      setCard(original);
      const msg = e instanceof Error ? e.message : "Couldn't undo.";
      toastApi.error(msg);
    }
  }

  function handleEditSave(modifications: Record<string, unknown>) {
    setEditOpen(false);
    handleApprove(modifications);
  }

  return (
    <div className="mx-auto max-w-2xl px-2 sm:px-6 py-6">
      <Link
        href="/decisions"
        className="text-sm text-primary hover:underline inline-block mb-4"
      >
        ← Back to inbox
      </Link>

      {loading ? (
        <Skeleton className="h-[280px] rounded-2xl bg-sand-100" />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchCard} />
      ) : card ? (
        <>
          <DecisionCard
            card={card}
            focused
            index={0}
            onApprove={handleApprove}
            onEdit={() => setEditOpen(true)}
            onDismiss={handleDismiss}
            onUndo={handleUndo}
          />
          {card.state !== "pending" && (
            <div className="mt-4 text-sm text-center">
              <Link
                href="/decisions/audit"
                className="text-primary hover:underline"
              >
                View in audit log →
              </Link>
            </div>
          )}
          <EditDrawer
            card={card}
            open={editOpen}
            onSave={handleEditSave}
            onClose={() => setEditOpen(false)}
          />
        </>
      ) : null}
    </div>
  );
}
