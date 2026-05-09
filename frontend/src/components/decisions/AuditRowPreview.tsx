"use client";
// Phase 2 Wave 3 — Pretty-prints an AgentActionDraft as syntax-coloured JSON
// inside the DecisionCard's "Audit-row preview" disclosure (UI-SPEC §3.1.2).
// Inline tokeniser (no library): keys → foreground; strings → primary;
// numbers/booleans → forest-700; punctuation → sand-700.

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { AgentActionDraft } from "@/types/decisions";

interface AuditRowPreviewProps {
  proposal: AgentActionDraft;
  className?: string;
}

interface Token {
  kind: "key" | "string" | "number" | "bool" | "punct" | "ws";
  text: string;
}

// Walk JSON.stringify output and split into tokens for cheap colouring.
function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < json.length) {
    const ch = json[i];
    if (ch === '"') {
      // string — capture full quoted token, then peek for following ":" to
      // tag it as a "key".
      let j = i + 1;
      while (j < json.length) {
        if (json[j] === "\\") {
          j += 2;
          continue;
        }
        if (json[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      const literal = json.slice(i, j);
      // Skip whitespace after string to detect ":"
      let k = j;
      while (k < json.length && /\s/.test(json[k])) k += 1;
      const isKey = json[k] === ":";
      tokens.push({ kind: isKey ? "key" : "string", text: literal });
      i = j;
    } else if (/[0-9-]/.test(ch) && (i === 0 || /[\s,:[]/.test(json[i - 1]))) {
      let j = i + 1;
      while (j < json.length && /[0-9.eE+-]/.test(json[j])) j += 1;
      tokens.push({ kind: "number", text: json.slice(i, j) });
      i = j;
    } else if (json.startsWith("true", i) || json.startsWith("false", i)) {
      const word = json.startsWith("true", i) ? "true" : "false";
      tokens.push({ kind: "bool", text: word });
      i += word.length;
    } else if (json.startsWith("null", i)) {
      tokens.push({ kind: "bool", text: "null" });
      i += 4;
    } else if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j += 1;
      tokens.push({ kind: "ws", text: json.slice(i, j) });
      i = j;
    } else {
      tokens.push({ kind: "punct", text: ch });
      i += 1;
    }
  }
  return tokens;
}

function colourFor(kind: Token["kind"]): string {
  switch (kind) {
    case "key":
      return "text-foreground font-medium";
    case "string":
      return "text-primary";
    case "number":
    case "bool":
      return "text-forest-700";
    case "punct":
      return "text-sand-700";
    default:
      return "text-foreground";
  }
}

export default function AuditRowPreview({
  proposal,
  className,
}: AuditRowPreviewProps) {
  const json = useMemo(() => {
    // Render the whole draft (mirrors the AgentAction row that will be
    // written on Approve).
    const payload = {
      toolName: proposal.toolName,
      args: proposal.args,
      reasoning: proposal.reasoning,
      subjectType: proposal.subjectType,
      subjectId: proposal.subjectId,
    };
    return JSON.stringify(payload, null, 2);
  }, [proposal]);

  const tokens = useMemo(() => tokenize(json), [json]);

  return (
    <pre
      className={cn(
        "mt-2 font-mono text-[12px] leading-relaxed text-foreground",
        "bg-sand-50 border border-sand-200 rounded-xl px-3 py-2",
        "max-h-60 overflow-y-auto whitespace-pre-wrap break-words",
        className,
      )}
      aria-label="Audit row preview"
    >
      {tokens.map((tok, idx) => (
        <span key={idx} className={colourFor(tok.kind)}>
          {tok.text}
        </span>
      ))}
    </pre>
  );
}
