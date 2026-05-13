/**
 * RED test — turns GREEN when outbox.flushPendingPoints filters rows with
 * attempts >= 5 so the worker stops retrying forever-failures.
 */

import * as outbox from "../src/services/outbox";
import { __mockApi as mockApi } from "./mocks/api-client";
import * as ExpoSqliteMock from "./mocks/expo-sqlite";

describe("outbox give-up after 5 attempts", () => {
  test("rows with attempts >= 5 are not re-flushed", async () => {
    // Seed a row directly with attempts = 5 (past the cutoff).
    ExpoSqliteMock.__seedRow({
      idempotencyKey: "stale-row-1",
      payload: JSON.stringify({
        latitude: 29.3759,
        longitude: 47.9774,
        accuracy: 10,
        capturedAt: "2026-05-13T10:00:00.000Z",
      }),
      attempts: 5,
    });

    mockApi.uploadLocations.mockResolvedValueOnce({ synced: 99 });

    await outbox.flushPendingPoints();

    expect(mockApi.uploadLocations).not.toHaveBeenCalled();
  });
});
