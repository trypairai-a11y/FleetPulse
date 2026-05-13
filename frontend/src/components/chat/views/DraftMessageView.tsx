// Phase 4 Wave 3 — draft_message viewBlock (UI-SPEC §3.2.4 variant 9).
// bodyAr is rendered with dir="rtl" lang="ar" when present. Phase 4 ships
// English-only drafts; Phase 9 fills the Arabic body in the agent.
"use client";
import type { DraftMessageSpec } from "@/types/views";

function recipientLabel(r: DraftMessageSpec["recipient"]): string {
  if (typeof r === "string") return r;
  if (r && typeof r === "object") return r.driverName ?? r.driverId ?? "Driver";
  return "Recipient";
}

function recipientPhone(r: DraftMessageSpec["recipient"], extra?: string): string | undefined {
  if (extra) return extra;
  if (r && typeof r === "object" && "phone" in r) return r.phone;
  return undefined;
}

export function DraftMessageView({
  spec,
}: {
  spec: DraftMessageSpec & { title?: string; recipientPhone?: string };
}) {
  const channel = (spec.channel ?? "sms").toString().toLowerCase();
  const channelLabel = channel.includes("whats")
    ? "WhatsApp"
    : channel.includes("sms")
      ? "SMS"
      : channel === "inbox" || channel === "in_app"
        ? "Inbox"
        : channel;
  const title = spec.title ?? `Draft ${channelLabel} — ${recipientLabel(spec.recipient)}`;
  const bodyEn = spec.bodyEn ?? spec.body ?? "";
  const phone = recipientPhone(spec.recipient, spec.recipientPhone);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] uppercase tracking-wider text-secondary">
          {channelLabel}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="rounded-lg bg-sand-50 p-3 ring-1 ring-sand-200">
        <div className="text-[11px] text-secondary">
          To: {recipientLabel(spec.recipient)}
          {phone && <span className="ml-2 font-mono text-sand-500">{phone}</span>}
        </div>
        {bodyEn && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{bodyEn}</p>
        )}
        {spec.bodyAr && (
          <p
            dir="rtl"
            lang="ar"
            className="mt-2 whitespace-pre-wrap text-sm text-foreground"
          >
            {spec.bodyAr}
          </p>
        )}
      </div>
    </div>
  );
}

export default DraftMessageView;
