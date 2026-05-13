// Phase 4 Wave 3 — right-aligned bubble for user messages (UI-SPEC §3.2.3).
"use client";
import type { ChatMessage } from "@/types/chat";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function UserMessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="mb-4 flex justify-end">
      <div className="flex max-w-[70%] flex-col items-end">
        <div className="rounded-2xl rounded-tr-sm bg-foreground px-4 py-3 text-sm text-white">
          {message.content}
        </div>
        <div className="mt-1 text-[11px] text-sand-500">
          You · {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default UserMessageBubble;
