// Phase 6 Wave 1 — getAdapter factory (per-platform CompositeAdapter).
//
// Wave 1 returns CompositeAdapters with EMPTY tier arrays. Wave 2 plans
// (per-platform adapters: services/ingest/{keeta,talabat,deliveroo,americana}/)
// push concrete tiers via this factory.
//
// Threat T-06-01 (Spoofing) — there is no caller-supplied adapter
// substitution path. The composition is hard-coded per Platform here, so
// a malicious caller cannot inject a custom adapter at runtime. Per-tenant
// precedence overrides are deferred to Phase 11 (orchestrator resolution
// #4) and will land via a separate registry-extension hook, not by
// loosening this factory's signature.

import { CompositeAdapter } from "./composite";
import type { Platform } from "./types";

export interface AdapterContext {
  tenantId: string;
}

export function getAdapter(
  platform: Platform,
  _ctx: AdapterContext,
): CompositeAdapter {
  switch (platform) {
    case "KEETA":
      // Wave 2 tiers (pending): [KeetaMobileAdapter, KeetaScraperAdapter, KeetaXlsxAdapter]
      return new CompositeAdapter("KEETA", []);
    case "TALABAT":
      // Wave 2 tiers (pending): [TalabatMobileAdapter, TalabatOcrAdapter,
      //                          TalabatXlsxAdapter, TalabatScraperAdapter (NotAvailable)]
      return new CompositeAdapter("TALABAT", []);
    case "DELIVEROO":
      // Wave 2 tiers (pending): [DeliverooMobileAdapter, DeliverooOcrAdapter,
      //                          DeliverooXlsxAdapter, DeliverooScraperAdapter (NotAvailable)]
      return new CompositeAdapter("DELIVEROO", []);
    case "AMERICANA":
      // Wave 2 tiers (pending): [AmericanaEmailAdapter, AmericanaXlsxAdapter]
      // — no mobile, no scraper for Americana.
      return new CompositeAdapter("AMERICANA", []);
    default: {
      const exhaustive: never = platform;
      throw new Error(`Unknown platform: ${exhaustive as string}`);
    }
  }
}
