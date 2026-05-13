// Phase 6 Wave 0 RED — Turns GREEN AFTER Wave 1 runs:
//   `npx prisma migrate dev --name add_mobile_gps_order_source`
//   `npx prisma generate`
//
// Until then, OrderSource.MOBILE_GPS is undefined and this test fails.
// This is the dedicated Wave-1 migration verification gate (Nyquist).
//
// REQ-ingest-adapter-layer: OrderSource enum gains MOBILE_GPS value.
//
// Wave 1 deviation note (Rule 3 — blocking project infra mismatch): the
// project's prisma generator writes to a custom output path
// (`../src/generated/prisma`, see schema.prisma:generator client). The
// stale `node_modules/.prisma/client/` (last touched 2026-04-06) is what
// `@prisma/client` resolves through, so importing the enum from that
// package never sees fresh values. Every other test in this repo imports
// prisma enums from `../generated/prisma` (or relative variants); the
// Wave 0 author missed this. Pointing the import at the project's
// canonical generated path makes the test see the freshly-generated
// enum without rewiring the @prisma/client shim or adding a second
// generator output.

import { OrderSource } from "../../../generated/prisma";

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
