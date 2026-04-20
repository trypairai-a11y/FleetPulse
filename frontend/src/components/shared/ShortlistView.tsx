"use client";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { List, Table2, Search } from "lucide-react";

export type ShortlistMode = "shortlist" | "browse" | "search";

export interface ShortlistItem {
  id: string;
  /** Optional severity/confidence pill */
  badge?: { label: string; tone?: "default" | "warning" | "critical" | "success" | "info" };
  /** One-line headline */
  title: string;
  /** Body copy — typically 1–2 lines */
  description?: ReactNode;
  /** Optional secondary meta chips (e.g. driver name, platform, age) */
  meta?: Array<{ label: string; tone?: "default" | "warning" | "critical" | "success" }>;
  /** Primary action button */
  primaryAction?: { label: string; onClick: () => void; variant?: "default" | "danger" };
  /** Secondary action button */
  secondaryAction?: { label: string; onClick: () => void };
  onClick?: () => void;
}

interface ShortlistViewProps {
  title: string;
  subtitle?: string;
  items: ShortlistItem[];
  /** Full browse content (table, filters). Rendered when mode = "browse". */
  browseContent?: ReactNode;
  /** Search bar content — typed input, results. Rendered when mode = "search". */
  searchContent?: ReactNode;
  loading?: boolean;
  emptyHint?: string;
  defaultMode?: ShortlistMode;
  /** Optional filter pill bar (e.g. platform filter) rendered above the mode toggle. */
  filters?: ReactNode;
}

const BADGE_TONE: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

const META_TONE: Record<string, string> = {
  default: "text-gray-500",
  warning: "text-amber-600",
  critical: "text-red-600",
  success: "text-emerald-600",
};

export default function ShortlistView({
  title,
  subtitle,
  items,
  browseContent,
  searchContent,
  loading,
  emptyHint,
  defaultMode = "shortlist",
  filters,
}: ShortlistViewProps) {
  const [mode, setMode] = useState<ShortlistMode>(defaultMode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
          <ModeButton active={mode === "shortlist"} onClick={() => setMode("shortlist")} icon={<List className="h-4 w-4" />} label="Shortlist" />
          {browseContent && <ModeButton active={mode === "browse"} onClick={() => setMode("browse")} icon={<Table2 className="h-4 w-4" />} label="Browse" />}
          {searchContent && <ModeButton active={mode === "search"} onClick={() => setMode("search")} icon={<Search className="h-4 w-4" />} label="Search" />}
        </div>
      </div>

      {filters && <div>{filters}</div>}

      {/* Body */}
      {mode === "shortlist" && (
        <div className="space-y-3">
          {loading ? (
            <ShortlistSkeleton />
          ) : items.length === 0 ? (
            <EmptyState hint={emptyHint} />
          ) : (
            items.map((item) => <ShortlistCard key={item.id} item={item} />)
          )}
        </div>
      )}

      {mode === "browse" && browseContent}
      {mode === "search" && searchContent}
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-foreground text-white shadow-sm" : "text-secondary hover:bg-gray-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ShortlistCard({ item }: { item: ShortlistItem }) {
  return (
    <div
      onClick={item.onClick}
      className={cn(
        "group flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md",
        item.onClick && "cursor-pointer hover:ring-1 hover:ring-primary/30"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.badge && (
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", BADGE_TONE[item.badge.tone ?? "default"])}>
              {item.badge.label}
            </span>
          )}
          <h3 className="font-medium text-foreground">{item.title}</h3>
        </div>
        {item.description && <div className="mt-1 text-sm text-secondary line-clamp-2">{item.description}</div>}
        {item.meta && item.meta.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.meta.map((m, i) => (
              <span key={i} className={cn("inline-flex items-center", META_TONE[m.tone ?? "default"])}>
                {m.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {(item.primaryAction || item.secondaryAction) && (
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {item.secondaryAction && (
            <button
              onClick={item.secondaryAction.onClick}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-secondary hover:bg-gray-50"
            >
              {item.secondaryAction.label}
            </button>
          )}
          {item.primaryAction && (
            <button
              onClick={item.primaryAction.onClick}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-colors",
                item.primaryAction.variant === "danger"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-foreground text-white hover:bg-foreground/90"
              )}
            >
              {item.primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ShortlistSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
      ))}
    </>
  );
}

function EmptyState({ hint }: { hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
      <div className="text-sm font-medium text-secondary">Nothing needs your attention.</div>
      {hint && <div className="mt-1 text-xs text-secondary/80">{hint}</div>}
    </div>
  );
}
