/**
 * RED test — turns GREEN when Wave 1 ships mobile/src/services/outbox.ts
 * with SQLite-backed INSERT OR IGNORE semantics on idempotencyKey.
 *
 * Contract:
 *   - enqueueGpsPoint(point) inserts a row keyed by an idempotencyKey derived
 *     deterministically from (latitude, longitude, capturedAt).
 *   - Second call with the same point is a no-op (SQLite UNIQUE constraint
 *     enforced via INSERT OR IGNORE).
 *   - _countForTests() reports the table size for assertions.
 */

import * as outbox from "../src/services/outbox";

describe("outbox idempotency", () => {
  test("INSERT OR IGNORE: enqueue same idempotency key twice → only 1 row stored", async () => {
    const point = {
      latitude: 29.3759,
      longitude: 47.9774,
      accuracy: 10,
      speed: null,
      capturedAt: "2026-05-13T10:00:00.000Z",
      platformGuess: "KEETA" as const,
    };

    await outbox.enqueueGpsPoint(point);
    await outbox.enqueueGpsPoint(point);

    const count = await outbox._countForTests();
    expect(count).toBe(1);
  });
});
