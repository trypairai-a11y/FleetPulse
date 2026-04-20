"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export interface AttentionItem {
  id: string;
  agentId: string;            // "triage" | "reconciliation" | ...
  toolName: string;
  recommendation: "approve" | "reject" | "escalate";
  reasoning: string;
  confidence: number;
  priorityScore: number;
  subjectType?: string | null;
  subjectId?: string | null;
  createdAt: string;
}

interface AttentionFeedProps {
  items: AttentionItem[];
  loading?: boolean;
  busyIds?: Set<string>;
  onApprove: (item: AttentionItem) => void;
  onReject: (item: AttentionItem) => void;
}

export default function AttentionFeed({ items, loading, busyIds, onApprove, onReject }: AttentionFeedProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary">Needs your attention</h2>
          <p className="mt-0.5 text-xs text-secondary/80">Ranked by the Triage Agent — approve, reject, or dismiss.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{items.length}</span>
      </div>

      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <Empty />
      ) : (
        items.slice(0, 10).map((it) => (
          <AttentionCard
            key={it.id}
            item={it}
            busy={busyIds?.has(it.id) ?? false}
            onApprove={() => onApprove(it)}
            onReject={() => onReject(it)}
          />
        ))
      )}
    </section>
  );
}

function AttentionCard({ item, busy, onApprove, onReject }: { item: AttentionItem; busy: boolean; onApprove: () => void; onReject: () => void }) {
  const tone = priorityTone(item.priorityScore);
  const recTone = recommendationTone(item.recommendation);

  return (
    <div className={cn("flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md", tone.ring)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider", recTone)}>{item.recommendation}</span>
          <span className="text-[11px] font-medium text-secondary">{agentLabel(item.agentId)}</span>
          <span className="text-[11px] text-secondary">· {toolLabel(item.toolName)}</span>
          <span className="ml-auto text-[11px] text-secondary">conf {Math.round(item.confidence * 100)}%</span>
        </div>
        <p className="mt-1.5 text-sm text-foreground">{item.reasoning}</p>
        {item.subjectId && (
          <p className="mt-1 font-mono text-[11px] text-secondary/70">{item.subjectType}:{item.subjectId.slice(0, 8)}…</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          disabled={busy}
          onClick={onReject}
          className={cn(
            "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-gray-50",
            busy && "cursor-not-allowed opacity-50"
          )}
        >
          Reject
        </button>
        <button
          disabled={busy}
          onClick={onApprove}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-foreground/90",
            busy && "cursor-not-allowed opacity-50"
          )}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          Approve
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
      ))}
    </>
  );
}

function Empty(): ReactNode {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center">
      <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
      <div className="mt-2 text-sm font-medium text-foreground">Inbox zero.</div>
      <div className="mt-1 text-xs text-secondary">No decisions queued right now.</div>
    </div>
  );
}

function priorityTone(score: number): { ring: string } {
  if (score >= 0.8) return { ring: "ring-1 ring-red-200" };
  if (score >= 0.5) return { ring: "ring-1 ring-amber-200" };
  return { ring: "" };
}

function recommendationTone(rec: string): string {
  if (rec === "approve") return "bg-emerald-50 text-emerald-700";
  if (rec === "reject") return "bg-red-50 text-red-700";
  return "bg-sky-50 text-sky-700";
}

function agentLabel(id: string): string {
  if (id === "triage") return "Triage";
  if (id === "reconciliation") return "Recon";
  if (id === "narrator") return "Narrator";
  return id;
}

function toolLabel(name: string): string {
  return name
    .replace(/^propose/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}
