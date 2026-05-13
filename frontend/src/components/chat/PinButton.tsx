// Phase 4 Wave 3 — Pin-to-Home button for any pinnable viewBlock.
// Wave 4 ships the /api/pinned-views POST route; Wave 3 wires the call.
"use client";
import { useState } from "react";
import { Pin } from "lucide-react";
import api from "@/lib/api";
import type { GeneratedView } from "@/types/chat";

interface PinButtonProps {
  view: GeneratedView;
  threadId?: string;
  messageId?: string;
}

export function PinButton({ view, threadId, messageId }: PinButtonProps) {
  const [pinned, setPinned] = useState<boolean>(!!view.pinnedViewId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPin = async () => {
    if (pinned || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/pinned-views", {
        viewType: view.viewType,
        spec: view.spec,
        title: view.title ?? `${view.viewType} pinned`,
        sortOrder: 9999,
        refreshFrequency: "on_open",
        sourceThreadId: threadId,
        sourceMessageId: messageId,
      });
      setPinned(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to pin";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onPin}
      disabled={pinned || busy}
      title={error ?? (pinned ? "Pinned to Home" : "Pin to Home")}
      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-secondary hover:bg-sand-50 hover:text-foreground disabled:opacity-60"
    >
      <Pin className="h-3 w-3" />
      {pinned ? "Pinned" : "Pin to Home"}
    </button>
  );
}

export default PinButton;
