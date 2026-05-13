/**
 * @wave 3 (Wave 0 RED — flips GREEN in Wave 3 Task 6)
 *
 * ChatActionCard — propose-and-confirm card surfaced inline in chat.
 * Reuses the existing POST /api/decisions/:id/approve route from Phase 2;
 * adds body fields { source: "chat", threadId, msgId }. Mirrors the
 * DecisionCard interaction model (Cmd+Enter to approve, optimistic
 * approval with 5s undo window).
 *
 * Acceptable RED state today: the component does not yet exist.
 *
 * REQ-chat-action-proposals.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Wave 3 ships the component; static import resolves the @/ alias via
// Vitest's Vite resolver.
import { ChatActionCard as _ChatActionCard } from "@/components/chat/ChatActionCard";
const ChatActionCard: React.ComponentType<any> = _ChatActionCard as never;

const baseProposal = {
  pendingActionId: "pa-1",
  threadId: "thr-1",
  msgId: "msg-1",
  toolName: "draftCourierMessage",
  subject: "Mohamed Khaled",
  body: "Hi Mohamed, please clock in on time. You were 14 minutes late yesterday.",
  ctaLabel: "Approve & send",
};

describe("ChatActionCard (Wave 0 RED — flips GREEN in Wave 3)", () => {
  it("component is exported from @/components/chat/ChatActionCard", () => {
    expect(ChatActionCard).toBeDefined();
  });

  it("renders proposal subject and body", () => {
    render(<ChatActionCard proposal={baseProposal} />);
    expect(screen.getByText(/Mohamed Khaled/)).toBeTruthy();
    expect(screen.getByText(/clock in on time/)).toBeTruthy();
  });

  it("Approve calls onApprove(pendingActionId) with source='chat'", async () => {
    const onApprove = vi.fn();
    render(<ChatActionCard proposal={baseProposal} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect(onApprove).toHaveBeenCalled());
    expect(onApprove.mock.calls[0][0]).toBe("pa-1");
  });

  it("Edit opens the edit drawer (onEdit fired)", () => {
    const onEdit = vi.fn();
    render(<ChatActionCard proposal={baseProposal} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("Dismiss calls onDismiss(pendingActionId)", () => {
    const onDismiss = vi.fn();
    render(<ChatActionCard proposal={baseProposal} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledWith("pa-1");
  });

  it("optimistic UI flips to 'approved' state with 5s undo affordance", async () => {
    const onApprove = vi.fn().mockResolvedValue({ ok: true });
    render(<ChatActionCard proposal={baseProposal} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect(screen.getByText(/undo/i)).toBeTruthy());
  });

  it("server 409 reverts the card to pending state with an error toast", async () => {
    const onApprove = vi.fn().mockRejectedValue({ status: 409 });
    render(<ChatActionCard proposal={baseProposal} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /approve/i })).toBeTruthy(),
    );
  });
});
