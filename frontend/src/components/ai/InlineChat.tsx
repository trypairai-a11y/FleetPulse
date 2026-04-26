"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import api from "@/lib/api";

interface Message { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Which drivers have pending cash?",
  "Top performing drivers this week",
  "Who is inactive in the last 3 days?",
  "Summarise today's violations",
];

export default function InlineChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "0px";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
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
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles size={15} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Darb AI</p>
            <p className="text-[11px] text-secondary leading-tight">Ask anything about your fleet</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-secondary hover:text-foreground transition-colors"
          >
            New chat
          </button>
        )}
      </header>

      <div ref={scrollRef} className="max-h-[360px] overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="py-6">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
                <Bot size={18} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">How can I help today?</p>
              <p className="text-xs text-secondary mt-0.5">I can search drivers, shifts, cash, violations.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-xs text-foreground bg-gray-50 hover:bg-gray-100 ring-1 ring-gray-100 rounded-xl px-3 py-2.5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageRow key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-primary" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-1">
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
              "h-8 w-8 flex items-center justify-center rounded-full shrink-0 transition-all",
              !input.trim() || loading
                ? "bg-gray-200 text-gray-400"
                : "bg-foreground text-white hover:bg-foreground/90"
            )}
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          Darb AI can be inaccurate. Verify critical info before acting.
        </p>
      </div>
    </section>
  );
}

function MessageRow({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className="flex gap-3">
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-gray-100" : "bg-primary/10"
      )}>
        {isUser ? <User size={14} className="text-gray-500" /> : <Bot size={14} className="text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-secondary mb-0.5">
          {isUser ? "You" : "Darb AI"}
        </p>
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    </div>
  );
}
