/**
 * @wave 3 (Wave 0 RED — flips GREEN in Wave 3 Task 3)
 *
 * useStreamingChat — React hook wrapping an EventSource for the chat SSE
 * stream. Separate hook from useSSE (notifications) per RESEARCH §"Project
 * Structure" so the two SSE consumers can evolve independently.
 *
 * Wave 3 ships @/hooks/useStreamingChat.ts. Wave 0 tests fail RED with
 * module-not-found.
 *
 * REQ-realtime-streaming.
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

let useStreamingChat: any | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useStreamingChat = require("@/hooks/useStreamingChat").useStreamingChat;
} catch {
  useStreamingChat = null;
}

// EventSource mock — capture the URL the hook opens.
class FakeEventSource {
  static lastInstance: FakeEventSource | null = null;
  url: string;
  withCredentials: boolean;
  listeners: Record<string, ((e: any) => void)[]> = {};
  closed = false;
  constructor(url: string, opts?: EventSourceInit) {
    this.url = url;
    this.withCredentials = !!opts?.withCredentials;
    FakeEventSource.lastInstance = this;
  }
  addEventListener(type: string, cb: (e: any) => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  removeEventListener(type: string, cb: (e: any) => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== cb);
  }
  dispatch(type: string, event: any) {
    (this.listeners[type] || []).forEach((cb) => cb(event));
  }
  close() {
    this.closed = true;
  }
}
(globalThis as any).EventSource = FakeEventSource;

describe("useStreamingChat (Wave 0 RED — flips GREEN in Wave 3)", () => {
  it("hook is exported from @/hooks/useStreamingChat", () => {
    expect(useStreamingChat).not.toBeNull();
  });

  it("opens an EventSource with credentials when sendMessage is called", async () => {
    const { result } = renderHook(() => useStreamingChat({ threadId: "thr-1" }));
    await act(async () => {
      await result.current.sendMessage("Why did revenue drop?");
    });
    expect(FakeEventSource.lastInstance).not.toBeNull();
    expect(FakeEventSource.lastInstance!.withCredentials).toBe(true);
    expect(FakeEventSource.lastInstance!.url).toMatch(/chat\/stream/);
  });

  it("dispatches text_delta events to the message setter", async () => {
    const onTextDelta = vi.fn();
    const { result } = renderHook(() =>
      useStreamingChat({ threadId: "thr-1", onTextDelta }),
    );
    await act(async () => {
      await result.current.sendMessage("hi");
    });
    act(() => {
      FakeEventSource.lastInstance!.dispatch("text_delta", { data: '{"delta":"Hello"}' });
    });
    await waitFor(() => expect(onTextDelta).toHaveBeenCalledWith("Hello"));
  });

  it("reconnects after EventSource error with exponential backoff", async () => {
    const { result } = renderHook(() => useStreamingChat({ threadId: "thr-1" }));
    await act(async () => {
      await result.current.sendMessage("hi");
    });
    const first = FakeEventSource.lastInstance!;
    act(() => first.dispatch("error", {}));
    // After backoff, a new EventSource opens.
    await waitFor(() => {
      expect(FakeEventSource.lastInstance).not.toBe(first);
    });
  });

  it("returns an abort handle that closes the EventSource", async () => {
    const { result } = renderHook(() => useStreamingChat({ threadId: "thr-1" }));
    await act(async () => {
      await result.current.sendMessage("hi");
    });
    const es = FakeEventSource.lastInstance!;
    act(() => result.current.abort());
    expect(es.closed).toBe(true);
  });
});
