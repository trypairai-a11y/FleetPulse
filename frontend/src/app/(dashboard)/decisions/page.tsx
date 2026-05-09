"use client";
// Phase 2 Wave 3 — Owner inbox page (REQ-decisions-proposal-inbox).
// Single-column 760px-max layout. 30 second poll on /api/decisions, optimistic
// approve/dismiss/edit with 5s undo, FilterChipStrip in URL search params,
// keyboard help (?), Cmd+K Ask Darb (already mounted globally).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  approveDecision,
  dismissDecision,
  listDecisions,
  undoDecision,
  type ListDecisionsParams,
} from "@/lib/decisionsApi";
import DecisionsList from "@/components/decisions/DecisionsList";
import FilterChipStrip from "@/components/decisions/FilterChipStrip";
import EditDrawer from "@/components/decisions/EditDrawer";
import KeyboardShortcutsHelp from "@/components/decisions/KeyboardShortcutsHelp";
import ErrorState from "@/components/shared/ErrorState";
import { useToast } from "@/components/shared/Toast";
import type { DecisionCardData } from "@/types/decisions";

const POLL_INTERVAL_MS = 30_000;
const UNDO_WINDOW_MS = 5_000;

const FILTER_KEYS = [
  "all",
  "high-conf",
  "this-week",
  "penalty",
  "cash",
  "warn",
  "suspend",
  "promote",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

const FILTER_LABEL: Record<FilterKey, string> = {
  all: "All",
  "high-conf": "High-conf",
  "this-week": "This week",
  penalty: "Penalty",
  cash: "Cash",
  warn: "Warn",
  suspend: "Suspend",
  promote: "Promote",
};

export default function DecisionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastApi = useToast();

  const filterParam = (searchParams?.get("filter") as FilterKey) ?? "all";
  const sortParam =
    (searchParams?.get("sort") as ListDecisionsParams["sort"]) ?? "priority";
  const activeFilter: FilterKey = FILTER_KEYS.includes(filterParam)
    ? filterParam
    : "all";

  const [cards, setCards] = useState<DecisionCardData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editCardId, setEditCardId] = useState<string | null>(null);
  // Approved cards stay visible for the undo window; we track approve
  // timestamps to know when to evict them.
  const approvedAtRef = useRef<Map<string, number>>(new Map());

  // ---- Fetch + reconcile ----
  const fetchCards = useCallback(async () => {
    try {
      const params: ListDecisionsParams = {
        status: "pending",
        filter: activeFilter,
        sort: sortParam,
        limit: 25,
      };
      const data = await listDecisions(params);
      setCards((prev) => mergeCards(prev, data.cards, approvedAtRef.current));
      setCounts(data.counts ?? {});
      setError(null);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Couldn't load proposals.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, sortParam]);

  useEffect(() => {
    setLoading(true);
    fetchCards();
    const interval = setInterval(fetchCards, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCards]);

  // ---- Eviction tick: drop approved cards 1.5s after the undo window. ----
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const map = approvedAtRef.current;
      let dirty = false;
      const evicted: string[] = [];
      map.forEach((approvedAt, id) => {
        if (now - approvedAt > UNDO_WINDOW_MS + 1500) {
          evicted.push(id);
          dirty = true;
        }
      });
      if (dirty) {
        evicted.forEach((id) => map.delete(id));
        setCards((prev) =>
          prev.filter(
            (c) => !(c.state === "approved" && evicted.includes(c.id)),
          ),
        );
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ---- ? toggles keyboard help ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (inField) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ---- Action handlers ----
  const handleApprove = useCallback(
    async (id: string, modifications?: Record<string, unknown>) => {
      // Snapshot original state for rollback.
      const original = cards.find((c) => c.id === id);
      if (!original) return;

      // Optimistic flip.
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                state: "approved",
                approvedAt: new Date().toISOString(),
              }
            : c,
        ),
      );
      approvedAtRef.current.set(id, Date.now());

      try {
        await approveDecision(id, modifications);
        toastApi.success(`Approved ${original.tag} for ${original.driverName}`);
      } catch (e: unknown) {
        // Rollback.
        approvedAtRef.current.delete(id);
        setCards((prev) => prev.map((c) => (c.id === id ? original : c)));
        const msg =
          e instanceof Error ? e.message : "Couldn't approve. Try again.";
        toastApi.error(msg);
      }
    },
    [cards, toastApi],
  );

  const handleDismiss = useCallback(
    async (id: string, reason: string) => {
      const original = cards.find((c) => c.id === id);
      if (!original) return;
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                state: "dismissed",
                dismissalReason: reason,
                dismissedAt: new Date().toISOString(),
              }
            : c,
        ),
      );
      // Remove fully after a short delay (UI-SPEC §3.1.5 — 1.5s collapse).
      setTimeout(() => {
        setCards((prev) =>
          prev.filter((c) => !(c.id === id && c.state === "dismissed")),
        );
      }, 1500);

      try {
        await dismissDecision(id, reason);
      } catch (e: unknown) {
        setCards((prev) => prev.map((c) => (c.id === id ? original : c)));
        const msg =
          e instanceof Error ? e.message : "Couldn't dismiss. Try again.";
        toastApi.error(msg);
      }
    },
    [cards, toastApi],
  );

  const handleUndo = useCallback(
    async (id: string) => {
      const approvedAt = approvedAtRef.current.get(id);
      if (!approvedAt || Date.now() - approvedAt > UNDO_WINDOW_MS) {
        toastApi.warning("Undo window expired. Use the audit log instead.");
        return;
      }
      // Optimistic flip back to pending.
      setCards((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, state: "pending", approvedAt: undefined }
            : c,
        ),
      );
      approvedAtRef.current.delete(id);
      try {
        await undoDecision(id);
        toastApi.info("Approval undone");
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Couldn't undo. Try again.";
        toastApi.error(msg);
      }
    },
    [toastApi],
  );

  const handleEdit = useCallback((id: string) => {
    setEditCardId(id);
  }, []);

  // ---- Edit drawer ----
  const editingCard = useMemo(
    () => cards.find((c) => c.id === editCardId) ?? null,
    [cards, editCardId],
  );

  function handleEditSave(modifications: Record<string, unknown>) {
    const id = editCardId;
    setEditCardId(null);
    if (id) {
      handleApprove(id, modifications);
    }
  }

  // ---- Filter chip change ----
  function handleFilterChange(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "all") {
      params.delete("filter");
    } else {
      params.set("filter", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  }

  function handleSortChange(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "priority") {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  }

  // ---- Filter chips with counts ----
  const chips = FILTER_KEYS.map((key) => ({
    key,
    label: FILTER_LABEL[key],
    count: counts[key] ?? counts[key === "all" ? "pending" : key],
  }));

  const pendingCount = counts.pending ?? cards.filter((c) => c.state === "pending").length;

  return (
    <div className="mx-auto max-w-[760px] px-2 sm:px-6 py-6">
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h1 className="font-display text-display-sm text-sand-900">
          Decisions
        </h1>
        <Link
          href="/decisions/audit"
          className="text-sm text-primary hover:underline"
        >
          What did Darb do this week? →
        </Link>
      </div>
      <p className="text-sm text-sand-600 tabular-nums">
        {pendingCount} pending
      </p>

      <div className="mt-5 mb-5">
        <FilterChipStrip
          chips={chips}
          active={activeFilter}
          onChange={handleFilterChange}
        />
      </div>

      <div className="flex justify-end mb-4">
        <label className="inline-flex items-center gap-2 text-xs text-sand-600">
          Sort
          <select
            value={sortParam}
            onChange={(e) => handleSortChange(e.target.value)}
            className="appearance-none ps-3 pe-6 py-1.5 rounded-pill border border-sand-300 bg-card text-xs font-medium text-sand-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="priority">Priority</option>
            <option value="newest">Newest</option>
            <option value="confidence">Confidence</option>
          </select>
        </label>
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            setLoading(true);
            fetchCards();
          }}
        />
      ) : (
        <DecisionsList
          cards={cards}
          loading={loading}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
          onEdit={handleEdit}
          onUndo={handleUndo}
          filter={activeFilter}
          onClearFilter={() => handleFilterChange("all")}
          onOpenAskDarb={() => {
            // AskDarbPalette is mounted globally and bound to ⌘K. Trigger
            // the same shortcut programmatically.
            window.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              }),
            );
          }}
        />
      )}

      <EditDrawer
        card={editingCard}
        open={editCardId !== null}
        onSave={handleEditSave}
        onClose={() => setEditCardId(null)}
      />

      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// Merge fresh server cards with optimistic local state. Approved/dismissed
// cards in `prev` are preserved (their lifecycle is owned by the eviction
// tick + dismiss timeout). New pending cards in `fresh` show up at the top.
function mergeCards(
  prev: DecisionCardData[],
  fresh: DecisionCardData[],
  approvedAt: Map<string, number>,
): DecisionCardData[] {
  // Index prev by id for cheap lookup.
  const prevById = new Map(prev.map((c) => [c.id, c]));
  const merged: DecisionCardData[] = [];
  const seen = new Set<string>();

  // Preserve approved cards that are still inside the eviction window.
  prev.forEach((c) => {
    if (c.state === "approved" && approvedAt.has(c.id)) {
      merged.push(c);
      seen.add(c.id);
    }
  });

  // Fold in fresh server data (server is source of truth for pending state).
  fresh.forEach((c) => {
    if (seen.has(c.id)) return;
    const local = prevById.get(c.id);
    if (local && local.state === "dismissed") {
      // Card was dismissed locally and the dismiss API hasn't reconciled
      // server-side yet — keep the local view.
      merged.push(local);
    } else {
      merged.push(c);
    }
    seen.add(c.id);
  });

  return merged;
}
