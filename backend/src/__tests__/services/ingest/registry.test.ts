// Phase 6 Wave 0 RED — Turns GREEN when Wave 1 ships
// backend/src/services/ingest/registry.ts.
//
// REQ-ingest-adapter-layer: getAdapter(platform, ctx) → CompositeAdapter per platform.

import { getAdapter } from "../../../services/ingest/registry";
import { CompositeAdapter } from "../../../services/ingest/composite";

describe("Phase 6 / REQ-ingest-adapter-layer: getAdapter factory", () => {
  test("getAdapter('KEETA', {tenantId: 't-1'}) returns CompositeAdapter with platform='KEETA'", () => {
    const a = getAdapter("KEETA", { tenantId: "t-1" });
    expect(a).toBeInstanceOf(CompositeAdapter);
    expect(a.platform).toBe("KEETA");
  });

  test("getAdapter('TALABAT', {tenantId: 't-1'}) returns CompositeAdapter with platform='TALABAT'", () => {
    const a = getAdapter("TALABAT", { tenantId: "t-1" });
    expect(a).toBeInstanceOf(CompositeAdapter);
    expect(a.platform).toBe("TALABAT");
  });

  test("getAdapter('DELIVEROO', {tenantId: 't-1'}) returns CompositeAdapter with platform='DELIVEROO'", () => {
    const a = getAdapter("DELIVEROO", { tenantId: "t-1" });
    expect(a).toBeInstanceOf(CompositeAdapter);
    expect(a.platform).toBe("DELIVEROO");
  });

  test("getAdapter('AMERICANA', {tenantId: 't-1'}) returns CompositeAdapter with platform='AMERICANA'", () => {
    const a = getAdapter("AMERICANA", { tenantId: "t-1" });
    expect(a).toBeInstanceOf(CompositeAdapter);
    expect(a.platform).toBe("AMERICANA");
  });
});

// RED — turned GREEN by Wave 1
