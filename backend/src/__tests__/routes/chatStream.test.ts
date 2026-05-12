/**
 * @wave 2 (Wave 0 RED — flips GREEN in Wave 2 Task 2)
 *
 * SSE chat route: GET /api/ai/chat/stream emits text_delta / view_block /
 * proposal / heartbeat / complete events. Vercel-compatible SSE only
 * (orchestrator_resolutions §1 — no WebSocket).
 *
 * Acceptable RED state today: `Cannot find module '../../routes/chat'`,
 * OR all cases are `.todo` until Wave 1 schema lands ChatThread/ChatMessage.
 *
 * REQ-realtime-streaming, REQ-chat-global-access.
 */

describe("GET /api/ai/chat/stream (Wave 0 RED)", () => {
  // Wave 1 ships ChatThread + ChatMessage; Wave 2 ships the route handler
  // emitting SSE events. Until then these cases are `.todo` so the file
  // still parses under Jest's default discovery.
  it.todo("rejects 401 without auth cookie");
  it.todo("rejects 403 cross-tenant thread access");
  it.todo("rejects 403 cross-user thread access (same tenant, different userId)");
  it.todo("emits text_delta SSE chunks while assistant streams tokens");
  it.todo("emits view_block event when describeView tool returns a GeneratedView");
  it.todo("emits proposal event when registry stages a PendingAgentAction");
  it.todo("emits :heartbeat ping every 15s during tool-loop");
  it.todo("emits complete event then closes the connection on assistant finish");
  it.todo("emits error event and closes stream on agent failure");
  it.todo("supports Cancel by client-disconnect: agent loop sees onCancel()===true and aborts");
  it.todo("sets Content-Type: text/event-stream and Cache-Control: no-cache");
  it.todo("flushes initial :ok comment immediately so EventSource clients dispatch onopen");

  // Sanity placeholder so Jest sees at least one runtime case in addition
  // to `.todo` markers — confirms the test file is discovered and parses.
  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
