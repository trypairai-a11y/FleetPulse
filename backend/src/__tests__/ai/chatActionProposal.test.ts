/**
 * @wave 2 (Wave 0 RED — flips GREEN in Wave 2 Task 6)
 *
 * Chat propose-and-confirm flow. T-04-W0-04 mitigation: an action staged
 * via chat must be distinguishable from one staged via the /decisions
 * route in the audit log.
 *
 * Flow:
 *   1. User asks chat: "Warn the worst 3 drivers from yesterday"
 *   2. Chat agent calls draftCourierMessage tool → registry stages a
 *      PendingAgentAction (Phase 2 propose-and-confirm gate).
 *   3. Chat UI surfaces an action_card view referencing PendingAgentAction.id.
 *   4. User clicks Approve → POST /api/decisions/:id/approve with
 *      body { source: "chat", threadId, msgId }.
 *   5. AgentAction row created with:
 *        - source = "chat"
 *        - chatThreadId = thread id
 *        - chatMessageId = message id
 *        - originalProposal = the staged input
 *
 * Mirrors `backend/src/__tests__/decisions/approveFlow.test.ts` — the
 * approval pathway itself is unchanged; chat is just a different origin.
 *
 * REQ-chat-action-proposals.
 */

describe("Chat action proposal flow (Wave 0 RED)", () => {
  it.todo("chat agent invoking draftCourierMessage stages a PendingAgentAction (status=pending)");
  it.todo("stream emits a proposal event whose payload references PendingAgentAction.id");
  it.todo("chat UI renders an action_card view tied to the PendingAgentAction.id");
  it.todo("POST /api/decisions/:id/approve with source='chat' returns 200");
  it.todo("AgentAction row written with source='chat'");
  it.todo("AgentAction row written with chatThreadId populated");
  it.todo("AgentAction row written with chatMessageId populated");
  it.todo("AgentAction row written with originalProposal === staged input");
  it.todo("subsequent POST approve on same pending returns 409 (replay guard reused)");
  it.todo("source='decisions' on the same pending writes AgentAction.source='decisions' (no override)");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
