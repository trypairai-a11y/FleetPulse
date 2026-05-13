// Phase 4 Wave 3 — viewBlock dispatcher. Switches on `view.viewType` and
// renders the appropriate sub-component. Wraps every view in a card frame
// with a Pin-to-Home button (when `view.pinnable === true`).
//
// Unknown viewType → safe fallback (T-04-W3-02 mitigation, no
// dangerouslySetInnerHTML anywhere in the tree).
"use client";
import type { GeneratedView } from "@/types/chat";
import type { ViewSpec } from "@/types/views";
import { KpiStripView } from "./views/KpiStripView";
import { TableView } from "./views/TableView";
import { TimeSeriesView } from "./views/TimeSeriesView";
import { BarChartView } from "./views/BarChartView";
import { MiniMapView } from "./views/MiniMapView";
import { ComparisonCardsView } from "./views/ComparisonCardsView";
import { CalloutView } from "./views/CalloutView";
import { ActionCardView } from "./views/ActionCardView";
import { DraftMessageView } from "./views/DraftMessageView";
import { PinButton } from "./PinButton";

const KNOWN_TYPES = new Set([
  "kpi_strip",
  "table",
  "time_series",
  "bar_chart",
  "mini_map",
  "comparison_cards",
  "callout",
  "action_card",
  "draft_message",
]);

export interface ChatViewRendererProps {
  view: GeneratedView;
  threadId?: string;
  messageId?: string;
  mode?: "interactive" | "readonly";
  onFollowUp?: (prompt: string) => void;
  onInvokeTool?: (toolName: string, args?: Record<string, unknown>) => void;
}

export function ChatViewRenderer({
  view,
  threadId,
  messageId,
  mode = "interactive",
  onFollowUp,
  onInvokeTool,
}: ChatViewRendererProps) {
  const showPin = !!view?.pinnable && mode === "interactive";
  const spec = (view?.spec ?? {}) as ViewSpec & Record<string, unknown>;

  return (
    <div className="relative mb-3 rounded-xl bg-card p-4 ring-1 ring-sand-200">
      {showPin && <PinButton view={view} threadId={threadId} messageId={messageId} />}
      {/* Title is rendered by sub-components when present on the spec.
          For top-level view.title we only render it in renderers that
          would otherwise be title-less (time_series, mini_map, etc.).
          kpi_strip keeps its title inside the strip frame so the regex
          `/revenue/i` matches only the tile, not a duplicate header. */}
      {view.title &&
        view.viewType !== "action_card" &&
        view.viewType !== "draft_message" &&
        view.viewType !== "kpi_strip" &&
        view.viewType !== "callout" && (
          <h3 className="mb-3 text-sm font-medium text-foreground">{view.title}</h3>
        )}
      {view.viewType === "kpi_strip" && <KpiStripView spec={spec as never} />}
      {view.viewType === "table" && <TableView spec={spec as never} />}
      {view.viewType === "time_series" && <TimeSeriesView spec={spec as never} />}
      {view.viewType === "bar_chart" && <BarChartView spec={spec as never} />}
      {view.viewType === "mini_map" && <MiniMapView spec={spec as never} />}
      {view.viewType === "comparison_cards" && (
        <ComparisonCardsView spec={spec as never} />
      )}
      {view.viewType === "callout" && <CalloutView spec={spec as never} />}
      {view.viewType === "action_card" && (
        <ActionCardView
          spec={Object.assign({}, spec, { title: view.title }) as never}
          onFollowUp={onFollowUp}
          onInvokeTool={onInvokeTool}
        />
      )}
      {view.viewType === "draft_message" && (
        <DraftMessageView spec={Object.assign({}, spec, { title: view.title }) as never} />
      )}
      {!KNOWN_TYPES.has(view.viewType as string) && (
        <CalloutView
          spec={{
            type: "callout",
            severity: "warning",
            message: `Unsupported view: couldn't render "${String(view.viewType)}". Refresh to retry.`,
          }}
        />
      )}
    </div>
  );
}

export default ChatViewRenderer;
