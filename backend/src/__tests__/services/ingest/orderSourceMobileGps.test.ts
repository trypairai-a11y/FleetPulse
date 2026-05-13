// Phase 6 Wave 0 RED — Turns GREEN AFTER Wave 1 runs:
//   `npx prisma migrate dev --name add_mobile_gps_order_source`
//   `npx prisma generate`
//
// Until then, OrderSource.MOBILE_GPS is undefined and this test fails.
// This is the dedicated Wave-1 migration verification gate (Nyquist).
//
// REQ-ingest-adapter-layer: OrderSource enum gains MOBILE_GPS value.

import { OrderSource } from "@prisma/client";

describe("Phase 6 / REQ-ingest-adapter-layer: OrderSource.MOBILE_GPS", () => {
  test("Prisma OrderSource enum includes MOBILE_GPS", () => {
    // Once Wave 1 migration + generate completes, this resolves at runtime.
    // Until then, OrderSource.MOBILE_GPS is undefined → assertion fails.
    expect((OrderSource as unknown as Record<string, string>).MOBILE_GPS).toBe(
      "MOBILE_GPS",
    );
  });
});

// RED — turned GREEN by Wave 1 prisma migrate + generate
