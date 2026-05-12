/**
 * @wave 2 (Wave 0 RED — flips GREEN in Wave 2 Task 3)
 *
 * Chat thread CRUD + FTS search.
 *   POST   /api/ai/chat/threads
 *   GET    /api/ai/chat/threads?q=&page=
 *   GET    /api/ai/chat/threads/:id
 *   PATCH  /api/ai/chat/threads/:id     (title, pinned)
 *   DELETE /api/ai/chat/threads/:id     (soft-archive)
 *
 * Threads MUST be scoped by both tenantId AND userId. Search uses Postgres
 * tsvector(simple) per Wave 1 migration (Pitfall 5 — `english` config
 * would strip Arabic stop-words; `simple` keeps everything searchable).
 *
 * Acceptable RED state today: `Cannot find module '../../routes/chat'` or
 * `prisma.chatThread is undefined` until Wave 1 schema migration lands.
 *
 * REQ-chat-global-access, REQ-chat-generated-dashboards.
 */

describe("Chat threads CRUD + FTS (Wave 0 RED)", () => {
  // T-04-W0-03 mitigation — cross-user leak negative test.
  it.todo("POST creates a new ChatThread scoped to {tenantId, userId} from auth ctx");
  it.todo("POST persists firstUserMessage and initial title (auto-generated from first 60 chars)");
  it.todo("GET / lists current user's threads only, grouped by Today / Yesterday / Last 7 days");
  it.todo("GET / paginates with cursor (paginatedResponse pattern)");
  it.todo("GET /?q=cash returns threads whose ChatMessage.body matches via tsvector(simple)");
  it.todo("GET /:id returns thread + messages, scoped by tenantId+userId");
  it.todo("PATCH /:id updates title");
  it.todo("PATCH /:id updates pinned flag");
  it.todo("DELETE /:id sets archivedAt (soft) — does NOT hard-delete");
  it.todo("cross-user leak: user B cannot GET user A's thread (404, not 403, to avoid id-probing)");
  it.todo("cross-tenant leak: tenant B request never sees tenant A threads");
  it.todo("FTS query never returns archived (archivedAt IS NOT NULL) threads");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
