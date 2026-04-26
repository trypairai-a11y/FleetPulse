"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import api from "@/lib/api";

interface Message { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Which drivers have pending cash?",
  "Top performing drivers this week",
  "Who is inactive in the last 3 days?",
  "Summarise today's violations",
  "Which Talabat couriers missed shifts today?",
  "Show me overdue cash above 50 KD",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, loading]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "0px";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
  }, [input]);

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    const userMsg: Message = { role: "user", content: value };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/ai/chat", {
        message: userMsg.content,
        conversationHistory: messages,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto w-full">
      <header className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Darb AI</h1>
            <p className="text-xs text-secondary leading-tight">Ask anything about your fleet</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <Plus size={13} />
            New chat
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Bot size={22} className="text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">How can I help today?</p>
            <p className="text-sm text-secondary mt-1">I can search drivers, shifts, cash, violations.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-8 w-full max-w-2xl">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-sm text-foreground bg-white hover:bg-gray-50 ring-1 ring-gray-200 hover:ring-gray-300 rounded-xl px-4 py-3 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <MessageRow key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={15} className="text-primary" />
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-3">
        <div className={cn(
          "flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 transition-all",
          "focus-within:border-gray-300 focus-within:shadow-[0_0_0_4px_rgba(0,0,0,0.04)]"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message Darb AI…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm leading-6 placeholder:text-gray-400 focus:outline-none py-1"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-full shrink-0 transition-all",
              !input.trim() || loading
                ? "bg-gray-200 text-gray-400"
                : "bg-foreground text-white hover:bg-foreground/90"
            )}
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          Darb AI can be inaccurate. Verify critical info before acting.
        </p>
      </div>
    </div>
  );
}

function MessageRow({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className="flex gap-3">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-gray-100" : "bg-primary/10"
      )}>
        {isUser ? <User size={15} className="text-gray-500" /> : <Bot size={15} className="text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-secondary mb-1">{isUser ? "You" : "Darb AI"}</p>
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    </div>
  );
}
