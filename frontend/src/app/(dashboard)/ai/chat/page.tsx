"use client";

import { useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAIChat, useChatHistory } from "@/hooks/useAIChat";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

export default function AIChatPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history, isLoading } = useChatHistory();
  const { messages, isStreaming, sendMessage, stopStreaming, initMessages } = useAIChat();

  // Initialize from history
  useEffect(() => {
    if (history && messages.length === 0) {
      initMessages(history);
    }
  }, [history, messages.length, initMessages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[900px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#E6E9EE]">
        <Link
          href="/ai"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F0F2F5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#6B7A8D]" />
        </Link>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-[#0C1825]">
            {isAr ? "محادثة AI" : "AI Chat"}
          </h1>
          <p className="text-[11px] text-[#6B7A8D]">
            {isAr ? "اسأل أي سؤال عن بيانات الأسطول" : "Ask anything about your fleet data"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[13px] text-[#6B7A8D]">
              {isAr ? "جاري التحميل..." : "Loading..."}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-[#2563EB]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0C1825]">
              {isAr ? "مرحبا! كيف أقدر أساعدك اليوم؟" : "Hello! How can I help you today?"}
            </p>
            <p className="text-[12px] text-[#6B7A8D] mt-1 max-w-md">
              {isAr
                ? "أقدر أساعدك تحلل بيانات السواق، الطلبات، الحضور، والمزيد"
                : "I can help you analyze driver data, orders, attendance, and more"}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={msg.isStreaming}
              isAr={isAr}
            />
          ))
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
        onStop={stopStreaming}
        isAr={isAr}
      />
    </div>
  );
}
