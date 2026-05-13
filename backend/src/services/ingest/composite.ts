// Phase 6 Wave 1 — CompositeAdapter precedence chain.
// Pitfall 4 — composite catches ONLY NotAvailable; non-NotAvailable errors propagate.
//
// Each fetch* method iterates tiers in order. The first tier that
// (a) defines the method, (b) does not throw NotAvailable, and
// (c) returns a non-empty array — wins. If a tier throws NotAvailable
// the composite continues to the next tier. Any other error is re-thrown
// so callers never silently lose scraper-side failures.
//
// Cash is XLSX-import-only by contract (Phase 6 BLOCKER 2 — see
// compositeFetchCash.test.ts). fetchCash here is a normal dispatch path
// like the others; the policy of "no automated cash pull" is enforced
// at the worker layer (pullChunkPhase6, Wave 4) by simply not calling
// fetchCash from the BACKWASH scheduler. The composite itself stays
// uniform so manual XLSX-import flows still reach an XLSX tier when
// one exists.

import {
  AdapterSource,
  DateRange,
  IngestAdapter,
  NormalizedRow,
  NotAvailable,
  Platform,
  XlsxIngestResult,
} from "./types";

export class CompositeAdapter implements IngestAdapter {
  readonly source: AdapterSource = "COMPOSITE";

  constructor(
    public readonly platform: Platform,
    public readonly tiers: readonly IngestAdapter[],
  ) {}

  async isAvailable(tenantId: string): Promise<boolean> {
    for (const t of this.tiers) {
      try {
        if (await t.isAvailable(tenantId)) return true;
      } catch (err) {
        if (err instanceof NotAvailable) continue;
        throw err;
      }
    }
    return false;
  }

  async fetchOrders(
    tenantId: string,
    range: DateRange,
  ): Promise<NormalizedRow<unknown>[]> {
    return this.dispatchFetch(tenantId, range, "fetchOrders");
  }

  async fetchShifts(
    tenantId: string,
    range: DateRange,
  ): Promise<NormalizedRow<unknown>[]> {
    return this.dispatchFetch(tenantId, range, "fetchShifts");
  }

  async fetchAttendance(
    tenantId: string,
    range: DateRange,
  ): Promise<NormalizedRow<unknown>[]> {
    return this.dispatchFetch(tenantId, range, "fetchAttendance");
  }

  async fetchCash(
    tenantId: string,
    range: DateRange,
  ): Promise<NormalizedRow<unknown>[]> {
    return this.dispatchFetch(tenantId, range, "fetchCash");
  }

  async fetchViolations(
    tenantId: string,
    range: DateRange,
  ): Promise<NormalizedRow<unknown>[]> {
    return this.dispatchFetch(tenantId, range, "fetchViolations");
  }

  async ingestXlsx(tenantId: string, buffer: Buffer): Promise<XlsxIngestResult> {
    for (const t of this.tiers) {
      if (typeof t.ingestXlsx === "function") {
        return t.ingestXlsx(tenantId, buffer);
      }
    }
    throw new NotAvailable(
      `No XLSX-import adapter registered for ${this.platform}`,
    );
  }

  private async dispatchFetch(
    tenantId: string,
    range: DateRange,
    method:
      | "fetchOrders"
      | "fetchShifts"
      | "fetchAttendance"
      | "fetchCash"
      | "fetchViolations",
  ): Promise<NormalizedRow<unknown>[]> {
    for (const t of this.tiers) {
      const fn = t[method];
      if (!fn) continue;
      try {
        const rows = await fn.call(t, tenantId, range);
        if (rows.length > 0) return rows;
      } catch (err) {
        if (err instanceof NotAvailable) continue;
        throw err;
      }
    }
    return [];
  }
}
