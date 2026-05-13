// Phase 4 Wave 3 — /chat/[threadId] permalink. Replays history and
// (if `?q=` is present from cold-start) auto-sends the initial prompt.
"use client";
import { useParams, useSearchParams } from "next/navigation";
import { ChatThreadSidebar } from "@/components/chat/ChatThreadSidebar";
import { ChatThreadPane } from "@/components/chat/ChatThreadPane";

export default function ChatThreadPage() {
  const params = useParams();
  const search = useSearchParams();
  const threadId = (params?.threadId as string | undefined) ?? "";
  const initialPrompt = search?.get("q") ?? undefined;

  return (
    <div className="flex min-h-screen bg-bg">
      <ChatThreadSidebar activeThreadId={threadId} />
      <ChatThreadPane threadId={threadId} initialPrompt={initialPrompt} />
    </div>
  );
}
