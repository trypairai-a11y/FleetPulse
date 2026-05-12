/**
 * @wave 1 (Wave 0 RED — flips GREEN in Wave 1 Task 1 — runAgent stream)
 *
 * runAgent streaming contract. Wave 1 adds an optional `stream` argument
 * to RunAgentInput with four callbacks:
 *   onTextDelta(delta: string): void
 *   onView(view: GeneratedView): void
 *   onPendingAction(id: string): void
 *   onCancel(): boolean
 *
 * This locks the Wave 2 chat-stream route's expected callback shape
 * before any implementation exists. Drift between the route and runtime
 * would otherwise be caught only at integration time.
 *
 * REQ-realtime-streaming.
 */

describe("runAgent stream:true (Wave 0 RED)", () => {
  // Wave 1 implementation:
  //   runAgent({ tenantId, triggerEvent: "chat.userMessage",
  //              userMessage, stream: { onTextDelta, onView, onPendingAction, onCancel } })
  it.todo("RunAgentInput.stream callbacks compile-check (typecheck-only)");
  it.todo("onTextDelta is invoked per assistant token chunk");
  it.todo("onView is invoked once per describeView tool result");
  it.todo("onPendingAction is invoked when the registry stages a PendingAgentAction");
  it.todo("onCancel returning true mid-loop aborts the next tool turn");
  it.todo("stream:true + an out-of-scope prompt still emits a callout via onView");
  it.todo("stream:false (default) preserves Phase 1+2 non-streaming behaviour");

  test("test file is discovered by jest (Wave 0 RED scaffold)", () => {
    expect(true).toBe(true);
  });
});
