/**
 * @wave 1 (Wave 0 RED — flips GREEN in Wave 1 Task 6 — chatHistoryService)
 *
 * chatHistoryService — append/recentTurns/search/archive surface used by
 * the chat agent and the chat-stream route.
 *
 *   appendMessage(threadId, role, body, viewBlocks?) → ChatMessage
 *   recentTurns(threadId, n=12) → Turn[]
 *   searchChatHistory(tenantId, userId, q) → ChatThread[]  (tsvector simple)
 *   archiveOldChats() → number  (90-day cutoff per orchestrator_resolutions §4)
 *
 * 90-day archive is the founder-level retention decision locked here so
 * later waves cannot change it without flipping this test RED.
 *
 * REQ-chat-global-access.
 */

describe("chatHistoryService (Wave 0 RED)", () => {
  it.todo("appendMessage persists role + body + optional viewBlocks JSON");
  it.todo("appendMessage updates ChatThread.lastMessageAt for ordering");
  it.todo("recentTurns returns last N turns oldest→newest for prompt context");
  it.todo("recentTurns excludes archived threads");
  it.todo("searchChatHistory uses Postgres tsvector with 'simple' config (Pitfall 5)");
  it.todo("searchChatHistory returns results relevance-ranked (ts_rank)");
  it.todo("searchChatHistory respects tenant+user scope (T-04-W0-03)");
  it.todo("archiveOldChats sets archivedAt for threads inactive >90 days");
  it.todo("archiveOldChats does NOT touch threads <90 days old");
  it.todo("archiveOldChats returns the count of archived rows for logging");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
