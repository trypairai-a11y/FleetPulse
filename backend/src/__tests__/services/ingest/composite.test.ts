// Phase 6 Wave 0 RED — Turns GREEN when Wave 1 ships
// backend/src/services/ingest/composite.ts.
//
// REQ-ingest-adapter-layer: CompositeAdapter precedence chain.
// Pitfall 4: composite must NOT swallow real errors (only NotAvailable falls through).

import { CompositeAdapter } from "../../../services/ingest/composite";
import {
  NotAvailable,
  type IngestAdapter,
  type NormalizedRow,
} from "../../../services/ingest/types";

function makeTier(opts: {
  source: IngestAdapter["source"];
  isAvailable?: boolean;
  fetchOrdersImpl?: () => Promise<NormalizedRow<unknown>[]>;
}): IngestAdapter {
  return {
    platform: "KEETA",
    source: opts.source,
    isAvailable: async () => opts.isAvailable ?? false,
    fetchOrders: opts.fetchOrdersImpl,
  };
}

describe("Phase 6 / REQ-ingest-adapter-layer: CompositeAdapter precedence", () => {
  test("fetchOrders dispatches to first tier; tier-1 returns 3 rows → composite returns 3 rows; tier-2 NOT called", async () => {
    const tier2Spy = jest.fn();
    const tier1 = makeTier({
      source: "MOBILE_GPS",
      fetchOrdersImpl: async () => [
        { source: "MOBILE_GPS", tenantId: "t-1", platform: "KEETA", data: { o: 1 } },
        { source: "MOBILE_GPS", tenantId: "t-1", platform: "KEETA", data: { o: 2 } },
        { source: "MOBILE_GPS", tenantId: "t-1", platform: "KEETA", data: { o: 3 } },
      ],
    });
    const tier2 = makeTier({
      source: "XLSX_IMPORT",
      fetchOrdersImpl: async () => {
        tier2Spy();
        return [];
      },
    });
    const composite = new CompositeAdapter("KEETA", [tier1, tier2]);
    const rows = await composite.fetchOrders!("t-1", {
      from: new Date(),
      to: new Date(),
    });
    expect(rows).toHaveLength(3);
    expect(tier2Spy).not.toHaveBeenCalled();
  });

  test("fetchOrders tier-1 throws NotAvailable → composite calls tier-2; tier-2 returns 2 rows", async () => {
    const tier1 = makeTier({
      source: "PORTAL_SCRAPER",
      fetchOrdersImpl: async () => {
        throw new NotAvailable("scraper offline");
      },
    });
    const tier2 = makeTier({
      source: "XLSX_IMPORT",
      fetchOrdersImpl: async () => [
        { source: "XLSX_IMPORT", tenantId: "t-1", platform: "KEETA", data: { o: 1 } },
        { source: "XLSX_IMPORT", tenantId: "t-1", platform: "KEETA", data: { o: 2 } },
      ],
    });
    const composite = new CompositeAdapter("KEETA", [tier1, tier2]);
    const rows = await composite.fetchOrders!("t-1", {
      from: new Date(),
      to: new Date(),
    });
    expect(rows).toHaveLength(2);
  });

  test("fetchOrders all tiers throw NotAvailable → composite returns []", async () => {
    const tier1 = makeTier({
      source: "MOBILE_GPS",
      fetchOrdersImpl: async () => {
        throw new NotAvailable("a");
      },
    });
    const tier2 = makeTier({
      source: "XLSX_IMPORT",
      fetchOrdersImpl: async () => {
        throw new NotAvailable("b");
      },
    });
    const composite = new CompositeAdapter("KEETA", [tier1, tier2]);
    const rows = await composite.fetchOrders!("t-1", {
      from: new Date(),
      to: new Date(),
    });
    expect(rows).toEqual([]);
  });

  test("fetchOrders tier-1 throws non-NotAvailable Error('boom') → composite re-throws (Pitfall 4)", async () => {
    const tier1 = makeTier({
      source: "MOBILE_GPS",
      fetchOrdersImpl: async () => {
        throw new Error("boom");
      },
    });
    const tier2 = makeTier({ source: "XLSX_IMPORT" });
    const composite = new CompositeAdapter("KEETA", [tier1, tier2]);
    await expect(
      composite.fetchOrders!("t-1", { from: new Date(), to: new Date() }),
    ).rejects.toThrow("boom");
  });

  test("isAvailable returns true if ANY tier.isAvailable returns true", async () => {
    const tier1 = makeTier({ source: "MOBILE_GPS", isAvailable: false });
    const tier2 = makeTier({ source: "XLSX_IMPORT", isAvailable: true });
    const composite = new CompositeAdapter("KEETA", [tier1, tier2]);
    expect(await composite.isAvailable("t-1")).toBe(true);
  });

  test("isAvailable returns false if ALL tiers return false", async () => {
    const tier1 = makeTier({ source: "MOBILE_GPS", isAvailable: false });
    const tier2 = makeTier({ source: "XLSX_IMPORT", isAvailable: false });
    const composite = new CompositeAdapter("KEETA", [tier1, tier2]);
    expect(await composite.isAvailable("t-1")).toBe(false);
  });
});

// RED — turned GREEN by Wave 1. Test uses MOBILE_GPS in payload to satisfy
// frontmatter contains: "MOBILE_GPS" pin.
