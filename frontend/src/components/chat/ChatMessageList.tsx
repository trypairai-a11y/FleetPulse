// Phase 4 Wave 3 — scrollable message list with auto-scroll-on-new.
"use client";
import { useEffect, useRef } from "react";
import type {
  ChatMessage,
  GeneratedView,
  ToolCallRecord,
  StreamingState,
} from "@/types/chat";
import { UserMessageBubble } from "./UserMessageBubble";
import { AssistantMessageBubble } from "./AssistantMessageBubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  streaming?: StreamingState;
  streamingText?: string;
  streamingViews?: GeneratedView[];
  streamingProposalId?: string;
  streamingToolCalls?: ToolCallRecord[];
  threadId?: string;
  onFollowUp?: (prompt: string) => void;
}

export function ChatMessageList(props: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [
    props.messages.length,
    props.streamingText,
    props.streamingViews?.length,
  ]);

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto px-6 py-4"
      aria-live="polite"
    >
      {props.messages.map((m) =>
        m.role === "user" ? (
          <UserMessageBubble key={m.id} message={m} />
        ) : (
          <AssistantMessageBubble
            key={m.id}
            message={m}
            // Only the trailing assistant message receives streaming state.
            streaming={
              props.streaming && m.state !== "complete" ? props.streaming : undefined
            }
            streamingText={
              m.state !== "complete" ? props.streamingText : undefined
            }
            streamingViews={
              m.state !== "complete" ? props.streamingViews : undefined
            }
            streamingProposalId={
              m.state !== "complete" ? props.streamingProposalId : undefined
            }
            streamingToolCalls={
              m.state !== "complete" ? props.streamingToolCalls : undefined
            }
            threadId={props.threadId}
            onFollowUp={props.onFollowUp}
          />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export default ChatMessageList;
