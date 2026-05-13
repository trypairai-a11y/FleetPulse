// Phase 4 Wave 5 — ScheduledBriefingsList.
//
// Two usage modes:
//   1. Test/standalone mode — pass `briefings` + `onCreate` + `onDelete` as
//      props. The component renders the supplied list and calls the
//      provided callbacks. No React Query / no axios involved.
//   2. Production mode — render with NO props. The component hooks into
//      useScheduledBriefings (React Query) for live data and useDeleteBriefing
//      for delete actions. Used by the /chat/scheduled page wrapper.
//
// Standing-rule (type=standing_rule_v3) rows show a yellow "Phase 12 —
// won't fire yet" badge per UI-SPEC §10 + orchestrator_resolutions §3.
//
// The component normalizes input shape (RED test passes {title, schedule,
// type} whereas production shape is {name, cron, type}) so both work
// without forcing the caller to transform.
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { briefingsApi } from "@/lib/api/scheduledBriefings";
import { ScheduleBriefingForm } from "./ScheduleBriefingForm";

export interface BriefingItem {
  id: string;
  // Production shape uses `name` + `cron`; RED test shape uses `title` +
  // `schedule`. Accept either; renderer derives a unified view-model.
  name?: string;
  title?: string;
  cron?: string;
  schedule?: string;
  prompt?: string;
  active?: boolean;
  type?: string;
  lastFireAt?: string;
  nextFireAt?: string;
}

export interface ScheduledBriefingsListProps {
  briefings?: BriefingItem[];
  onCreate?: (values: { title: string; prompt: string; schedule: string }) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, active: boolean) => void;
}

interface RowVM {
  id: string;
  title: string;
  cron: string;
  active: boolean;
  isStandingRule: boolean;
  lastFireAt?: string;
}

function toRow(b: BriefingItem): RowVM {
  return {
    id: b.id,
    title: b.title ?? b.name ?? "Untitled briefing",
    cron: b.schedule ?? b.cron ?? "",
    active: b.active ?? true,
    isStandingRule: b.type === "standing_rule_v3",
    lastFireAt: b.lastFireAt,
  };
}

function ConfirmDelete({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    >
      <div className="rounded-xl bg-card ring-1 ring-sand-200 p-4 space-y-3 max-w-sm">
        <p className="text-sm">Delete this scheduled briefing?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg ring-1 ring-sand-200 px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScheduledBriefingsList(props: ScheduledBriefingsListProps) {
  const isControlled = Array.isArray(props.briefings);

  // Self-fetch fallback: when no `briefings` prop is supplied, fetch via
  // the axios client directly. We deliberately avoid useScheduledBriefings
  // (React Query) here so the component renders cleanly in any test
  // context — same decoupling Wave 4's PinnedViewTile applied for the
  // same reason.
  const [fetched, setFetched] = useState<BriefingItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(!isControlled);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isControlled) return;
    let cancelled = false;
    setLoading(true);
    briefingsApi
      .list()
      .then((res) => {
        if (!cancelled) setFetched(res.briefings as BriefingItem[]);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isControlled]);

  const briefings: BriefingItem[] = isControlled
    ? props.briefings!
    : fetched ?? [];

  const refetch = async () => {
    if (isControlled) return;
    try {
      const res = await briefingsApi.list();
      setFetched(res.briefings as BriefingItem[]);
    } catch {
      // swallow — user will see stale data until next mount
    }
  };

  const onDelete = async (id: string) => {
    if (props.onDelete) {
      props.onDelete(id);
      setConfirmDeleteId(null);
      return;
    }
    try {
      await briefingsApi.remove(id);
      await refetch();
    } catch {
      // surface as no-op for now
    }
    setConfirmDeleteId(null);
  };

  const onToggle = async (id: string, active: boolean) => {
    if (props.onToggle) {
      props.onToggle(id, active);
      return;
    }
    try {
      await briefingsApi.patch(id, { active });
      await refetch();
    } catch {
      // ignore
    }
  };

  if (!isControlled && loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Scheduled briefings</h2>
        <p className="text-sm text-secondary">Loading…</p>
      </section>
    );
  }

  const rows = briefings.map(toRow);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Scheduled briefings</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary text-white px-3 py-1.5 text-xs"
        >
          <Plus className="h-3 w-3" /> New briefing
        </button>
      </div>

      {showForm && (
        <ScheduleBriefingForm
          onClose={() => {
            setShowForm(false);
            void refetch();
          }}
          onCreate={props.onCreate}
        />
      )}

      {rows.length === 0 && !showForm ? (
        <p className="text-sm text-secondary">
          No scheduled briefings yet. Create one to get a daily morning summary.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl ring-1 ring-sand-200 bg-card p-4 flex items-center gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.title}</span>
                  {r.isStandingRule && (
                    <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-900 px-1 rounded inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Phase 12 — won't fire
                      yet
                    </span>
                  )}
                </div>
                <div className="text-xs text-secondary">
                  {r.cron}
                  {r.lastFireAt
                    ? ` · last fired ${new Date(r.lastFireAt).toLocaleString()}`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(r.id, !r.active)}
                className={`text-xs rounded-lg px-2 py-1 ${
                  r.active
                    ? "bg-primary/10 text-primary"
                    : "bg-sand-100 text-secondary"
                }`}
              >
                {r.active ? "Active" : "Paused"}
              </button>
              <button
                type="button"
                aria-label="Delete briefing"
                onClick={() => setConfirmDeleteId(r.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmDeleteId && (
        <ConfirmDelete
          onConfirm={() => onDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </section>
  );
}
