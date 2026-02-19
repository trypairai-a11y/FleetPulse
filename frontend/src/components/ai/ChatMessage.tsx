"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isAr?: boolean;
}

export function ChatMessage({ role, content, isStreaming, isAr }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 py-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          isUser ? "bg-[#0F2B46]" : "bg-gradient-to-br from-[#2563EB] to-[#7C3AED]"
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" strokeWidth={2} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "bg-[#0F2B46] text-white"
            : "bg-[#F7F8FA] text-[#1A2B3C] border border-[#E6E9EE]"
        )}
        dir={isAr ? "rtl" : "ltr"}
      >
        {content || (isStreaming && (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        ))}
        {isStreaming && content && (
          <span className="inline-block w-0.5 h-4 bg-[#2563EB] animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  );
}
