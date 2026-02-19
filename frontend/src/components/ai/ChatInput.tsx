"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  isAr: boolean;
}

const SUGGESTIONS_EN = [
  "How are drivers performing today?",
  "Show me attendance summary",
  "Which drivers have the most orders?",
  "Any active alerts?",
  "Show fleet overview",
];

const SUGGESTIONS_AR = [
  "شلون أداء السواق اليوم؟",
  "عطني ملخص الحضور",
  "منو أكثر سواق عنده طلبات؟",
  "في تنبيهات نشطة؟",
  "عطني نظرة عامة على الأسطول",
];

export function ChatInput({ onSend, isStreaming, onStop, isAr }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = isAr ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[#E6E9EE] bg-white">
      {/* Suggestions */}
      <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSend(s)}
            disabled={isStreaming}
            className="shrink-0 px-3 py-1.5 rounded-full border border-[#E6E9EE] text-[11px] font-medium text-[#4A6580] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 pb-4">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAr ? "اكتب سؤالك هنا..." : "Type your question..."}
          rows={1}
          dir={isAr ? "rtl" : "ltr"}
          className="flex-1 resize-none rounded-xl border border-[#E6E9EE] bg-[#F7F8FA] px-4 py-2.5 text-[13px] text-[#1A2B3C] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="shrink-0 w-9 h-9 rounded-xl bg-[#E5484D] flex items-center justify-center hover:bg-[#D13438] transition-colors"
          >
            <Square className="w-3.5 h-3.5 text-white" fill="white" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className={cn(
              "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              input.trim()
                ? "bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
                : "bg-[#E6E9EE] text-[#9CA3AF] cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
