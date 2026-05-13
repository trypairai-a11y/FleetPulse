/**
 * RED test — turns GREEN in Wave 1 when outbox.flushPendingPoints() is shipped.
 *
 * Contract:
 *   - Happy path: 5 enqueued → server confirms → all 5 deleted.
 *   - Failure path: server throws → rows remain; attempts column incremented.
 */

import * as outbox from "../src/services/outbox";
import { __mockApi as mockApi } from "./mocks/api-client";

describe("outbox flushPendingPoints — semantics", () => {
  test("happy path: enqueue 5 → flush → queue empty", async () => {
    for (let i = 0; i < 5; i++) {
      await outbox.enqueueGpsPoint({
        latitude: 29.3759 + i * 0.0001,
        longitude: 47.9774,
        accuracy: 10,
        speed: null,
        capturedAt: new Date(1715000000000 + i * 6000).toISOString(),
        platformGuess: "KEETA",
      });
    }

    mockApi.uploadLocations.mockResolvedValueOnce({ synced: 5 });

    const result = await outbox.flushPendingPoints();
    expect(result.flushed).toBe(5);

    const remaining = await outbox._countForTests();
    expect(remaining).toBe(0);
  });

  test("failure path: server throws → rows remain + attempts incremented", async () => {
    await outbox.enqueueGpsPoint({
      latitude: 29.3759,
      longitude: 47.9774,
      accuracy: 10,
      speed: null,
      capturedAt: "2026-05-13T10:00:00.000Z",
      platformGuess: "KEETA",
    });

    mockApi.uploadLocations.mockRejectedValueOnce(new Error("500 upstream"));

    await outbox.flushPendingPoints();

    const remaining = await outbox._countForTests();
    expect(remaining).toBe(1);

    const all = await outbox._allRowsForTests();
    expect(all[0].attempts).toBe(1);
  });
});
