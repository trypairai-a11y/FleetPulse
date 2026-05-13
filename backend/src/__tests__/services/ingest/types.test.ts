// Phase 6 Wave 0 RED — Turns GREEN when Wave 1 ships
// backend/src/services/ingest/types.ts.
//
// REQ-ingest-adapter-layer: IngestAdapter interface contract.
// Pins NotAvailable exception shape + NormalizedRow<T> + AdapterSource union.

import {
  NotAvailable,
  type AdapterSource,
  type IngestAdapter,
  type NormalizedRow,
} from "../../../services/ingest/types";

describe("Phase 6 / REQ-ingest-adapter-layer: IngestAdapter contract", () => {
  test("NotAvailable extends Error and carries .reason", () => {
    const err = new NotAvailable("no creds");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("NotAvailable");
    expect(err.reason).toBe("no creds");
    expect(err.message).toBe("no creds");
  });

  test("NormalizedRow<T> has source/tenantId/platform/data/raw fields", () => {
    const row: NormalizedRow<{ orderId: string }> = {
      source: "XLSX_IMPORT",
      tenantId: "t-1",
      platform: "KEETA",
      data: { orderId: "o-1" },
      raw: { foo: "bar" },
    };
    expect(row.source).toBe("XLSX_IMPORT");
    expect(row.tenantId).toBe("t-1");
    expect(row.platform).toBe("KEETA");
    expect(row.data.orderId).toBe("o-1");
    expect(row.raw).toEqual({ foo: "bar" });
  });

  test("IngestAdapter type compiles with optional fetch* methods + required platform/source/isAvailable", () => {
    const mock: IngestAdapter = {
      platform: "TALABAT",
      source: "XLSX_IMPORT",
      isAvailable: async () => true,
    };
    expect(mock.platform).toBe("TALABAT");
    expect(mock.source).toBe("XLSX_IMPORT");
  });

  test("AdapterSource union includes MOBILE_GPS, PORTAL_SCRAPER, XLSX_IMPORT, OCR_MOBILE, OCR_WEB, EMAIL_INBOX", () => {
    const sources: AdapterSource[] = [
      "MOBILE_GPS",
      "PORTAL_SCRAPER",
      "XLSX_IMPORT",
      "OCR_MOBILE",
      "OCR_WEB",
      "EMAIL_INBOX",
    ];
    expect(sources).toHaveLength(6);
  });
});

// RED — turned GREEN by Wave 1
