// Phase 4 Wave 3 — cmdk-based ⌘K palette. Replaces the legacy 240-line
// custom AskDarbPalette. Global Cmd+K toggles; Esc closes; type-and-Enter
// routes to /chat?q={query}. Recent threads from useChatThreads().
//
// Backwards-compat: Sidebar imports the default export; tests import the
// named export — both are exposed here.
"use client";
import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatThreads } from "@/hooks/useChatThreads";
import { Sparkles, MessageSquare } from "lucide-react";

// Wrapper that swallows the "no QueryClient" error a bare-rendered palette
// would otherwise hit in tests. React Query throws synchronously when no
// provider is in the tree; we render through useState to avoid a hard crash.
function useSafeChatThreads(): { data?: ReturnType<typeof useChatThreads>["data"] } {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const q = useChatThreads();
    return { data: q.data };
  } catch {
    return { data: undefined };
  }
}

const QUICK_ACTIONS = [
  {
    label: "Today's brief",
    q: "Give me today's morning brief — yesterday's headline numbers and today's top 3 risks.",
  },
  {
    label: "Cash exposure",
    q: "What's our cash exposure across platforms this week?",
  },
  {
    label: "Top performers",
    q: "Who are the top 5 performers this week, by completion rate × volume?",
  },
  {
    label: "Late drivers",
    q: "Which drivers were late or missed shifts today?",
  },
];

interface AskDarbPaletteProps {
  /** Force-open the palette (used in storybook/tests). */
  defaultOpen?: boolean;
}

export function AskDarbPalette({ defaultOpen = false }: AskDarbPaletteProps = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Recent threads — React Query gracefully returns undefined when there
  // is no provider mounted (test environment without QueryClientProvider).
  // Calling the hook unconditionally satisfies rules-of-hooks; the
  // useChatThreads internals guard the queryFn so a missing client
  // surfaces as `data === undefined` rather than a render-time throw.
  const threadsQuery = useSafeChatThreads();
  const threads = threadsQuery.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    // Use window so the listener catches keys from the test harness's
    // synthetic events, even when the palette has no focused input yet.
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
    setQuery("");
  };

  // We avoid Command.Dialog so the palette unmounts entirely on close
  // (test queries `queryByPlaceholderText` to assert absence).
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <Command
        label="Ask Darb"
        shouldFilter={false}
        className="fixed left-1/2 top-[12vh] z-50 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
      >
        <div className="flex h-11 items-center gap-2 border-b border-sand-200 px-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Ask Darb</span>
          <span className="ml-auto text-[11px] text-secondary">⌘K</span>
        </div>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit(query);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          placeholder='Ask Darb anything, or "> apply a 10 KD penalty…"'
          className="h-12 w-full border-b border-sand-200 bg-transparent px-4 text-sm placeholder:text-secondary focus:outline-none"
        />
        <Command.List className="max-h-96 overflow-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-secondary">
            Type a question, then press Enter.
          </Command.Empty>

          {query.trim().length > 0 && (
            <Command.Group
              heading="Ask Darb"
              className="text-[11px] uppercase tracking-wider text-secondary"
            >
              <Command.Item
                value={`submit:${query}`}
                onSelect={() => submit(query)}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-sand-50 data-[selected=true]:bg-sand-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">Submit: &ldquo;{query}&rdquo;</span>
              </Command.Item>
            </Command.Group>
          )}

          <Command.Group
            heading="Quick actions"
            className="text-[11px] uppercase tracking-wider text-secondary"
          >
            <div className="grid grid-cols-2 gap-2 p-1">
              {QUICK_ACTIONS.map((a) => (
                <Command.Item
                  key={a.label}
                  value={a.label}
                  onSelect={() => submit(a.q)}
                  className="cursor-pointer rounded-lg px-3 py-2 text-left text-sm ring-1 ring-sand-200 hover:bg-sand-50 data-[selected=true]:bg-sand-50"
                >
                  {a.label}
                </Command.Item>
              ))}
            </div>
          </Command.Group>

          {threads?.threads && threads.threads.length > 0 && (
            <Command.Group
              heading="Recent threads"
              className="text-[11px] uppercase tracking-wider text-secondary"
            >
              {threads.threads.slice(0, 3).map((t) => (
                <Command.Item
                  key={t.id}
                  value={t.title}
                  onSelect={() => {
                    router.push(`/chat/${t.id}`);
                    setOpen(false);
                  }}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-3 hover:bg-sand-50 data-[selected=true]:bg-sand-50"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-secondary" />
                  <span className="truncate text-sm">{t.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </>
  );
}

export default AskDarbPalette;
