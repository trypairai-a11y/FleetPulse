/**
 * @wave 3 (Wave 0 RED — flips GREEN in Wave 3 Task 4)
 *
 * cmdk-based AskDarbPalette: Cmd+K toggles, recent threads list, quick
 * actions, type-and-Enter routes to /chat?q={query}. Wave 3 rewrites the
 * existing 240-line custom palette using `cmdk` (already installed in
 * Task 1).
 *
 * Acceptable RED state today: tests fail because the rewritten component
 * does not yet exist OR because the existing component does not yet
 * expose the cmdk API. Either way, parse must succeed.
 *
 * REQ-chat-global-access.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation BEFORE the (Wave 3) component import so the
// component's `useRouter()` resolves in test context.
const pushSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/keeta/overview",
}));

// Wave 3 will replace the current AskDarbPalette with a cmdk-based one.
// Import points at the existing path; Wave 3 swaps the implementation.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AskDarbPalette } = require("@/components/ai/AskDarbPalette");

describe("AskDarbPalette (Wave 0 RED — flips GREEN in Wave 3)", () => {
  it("renders without crashing (smoke)", () => {
    render(<AskDarbPalette />);
    expect(document.body).toBeTruthy();
  });

  it("Cmd+K opens the palette when closed", async () => {
    render(<AskDarbPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/ask darb/i)).toBeTruthy(),
    );
  });

  it("Cmd+K closes the palette when open", async () => {
    render(<AskDarbPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await waitFor(() => screen.getByPlaceholderText(/ask darb/i));
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/ask darb/i)).toBeNull(),
    );
  });

  it("Esc closes the palette when open", async () => {
    render(<AskDarbPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByPlaceholderText(/ask darb/i);
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/ask darb/i)).toBeNull(),
    );
  });

  it("type-and-Enter routes to /chat?q={query}", async () => {
    render(<AskDarbPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByPlaceholderText(/ask darb/i);
    fireEvent.change(input, { target: { value: "yesterday's revenue" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(pushSpy).toHaveBeenCalled());
    expect(pushSpy.mock.calls[0][0]).toMatch(/\/chat\?q=/);
  });

  // Wave 3 wires the recent-threads section — placeholder for now.
  it.todo("shows recent threads section sourced from useChatThreads()");
  it.todo("clicking a recent thread routes to /chat?thread={id}");
  it.todo("renders a Quick Actions group (Pin recent view, Schedule briefing, etc.)");
});
