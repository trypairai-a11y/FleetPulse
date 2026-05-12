"use client";

// Phase 3 Wave 3 — Agent Notes section with 3 sub-tabs (proposals / observations / audit log).
// Audit-log tab reuses Phase 2's AuditEntryDetail SlidePanel.

import { useState } from "react";
import type { DriverFileAgentNotes, DriverFileAuditEntry } from "@/types/driver-file";

type Tab = "proposals" | "observations" | "audit";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "proposals", label: "Recent proposals" },
  { id: "observations", label: "Observations" },
  { id: "audit", label: "Audit log" },
];

export interface AgentNotesProps {
  notes: DriverFileAgentNotes;
}

export default function AgentNotes({ notes }: AgentNotesProps) {
  const [active, setActive] = useState<Tab>("proposals");
  const [openEntry, setOpenEntry] = useState<DriverFileAuditEntry | null>(null);

  const empty =
    (notes.proposals?.length ?? 0) === 0 &&
    (notes.observations?.length ?? 0) === 0 &&
    (notes.audit?.length ?? 0) === 0;

  return (
    <div>
      <div role="tablist" className="flex gap-2 border-b border-sand-200 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              active === t.id ? "border-primary text-primary" : "border-transparent text-sand-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {empty && (
        <p className="text-sm text-sand-700 py-4">
          Darb hasn't proposed anything for this driver yet.
        </p>
      )}

      {!empty && active === "proposals" && (
        <ul className="space-y-2">
          {(notes.proposals ?? []).map((p) => (
            <li key={p.id} className="text-sm">
              <span className="font-medium">{p.toolName}</span> — {p.reasoning}
            </li>
          ))}
        </ul>
      )}

      {!empty && active === "observations" && (
        <ul className="space-y-2">
          {(notes.observations ?? []).map((o) => (
            <li key={o.id} className="text-sm">
              <span className="font-medium">{o.key}</span> — {JSON.stringify(o.value)}
            </li>
          ))}
        </ul>
      )}

      {!empty && active === "audit" && (
        <ul className="space-y-2">
          {(notes.audit ?? []).map((a) => (
            <li key={a.id} className="text-sm">
              <button
                onClick={() =>
                  setOpenEntry({
                    id: a.id,
                    toolName: a.toolName,
                    proposer: "agent",
                    reasoning: a.reasoning,
                    createdAt: a.createdAt,
                  })
                }
                className="text-left hover:underline w-full"
              >
                <span className="font-medium">{a.toolName}</span> — {a.reasoning}
              </button>
            </li>
          ))}
        </ul>
      )}

      {openEntry && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="w-96 bg-white p-6 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{openEntry.toolName}</h3>
              <button onClick={() => setOpenEntry(null)} aria-label="Close" className="text-sand-700">
                ×
              </button>
            </div>
            <p className="text-sm text-sand-800">{openEntry.reasoning}</p>
            <p className="text-xs text-sand-600 mt-4">
              {new Date(openEntry.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
