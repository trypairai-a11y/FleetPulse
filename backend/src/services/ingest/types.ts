// Phase 6 Wave 1 — IngestAdapter contract.
//
// REQ-ingest-adapter-layer + CON-scraper-replaceable: every per-source adapter
// (mobile / scraper / OCR / XLSX / email) implements this single interface.
// CompositeAdapter (composite.ts) holds tier-ordered lists and falls through
// on NotAvailable. The registry (registry.ts) returns one CompositeAdapter
// per (platform, tenant).
//
// Pattern source: Phase 6 RESEARCH.md §"Pattern 1: IngestAdapter Interface".

export type Platform = "KEETA" | "TALABAT" | "DELIVEROO" | "AMERICANA";

export type AdapterSource =
  | "MOBILE_GPS"
  | "PORTAL_SCRAPER"
  | "XLSX_IMPORT"
  | "OCR_MOBILE"
  | "OCR_WEB"
  | "EMAIL_INBOX"
  | "COMPOSITE";

export class NotAvailable extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "NotAvailable";
  }
}

export interface DateRange {
  /** inclusive */
  from: Date;
  /** exclusive */
  to: Date;
}

export interface NormalizedRow<T> {
  source: AdapterSource;
  tenantId: string;
  platform: Platform;
  data: T;
  raw?: unknown;
}

export interface XlsxIngestResult {
  rowsIn: number;
  rowsOk: number;
  errors: string[];
}

export interface IngestAdapter {
  readonly platform: Platform;
  readonly source: AdapterSource;
  isAvailable(tenantId: string): Promise<boolean>;
  fetchOrders?(tenantId: string, range: DateRange): Promise<NormalizedRow<unknown>[]>;
  fetchShifts?(tenantId: string, range: DateRange): Promise<NormalizedRow<unknown>[]>;
  fetchAttendance?(tenantId: string, range: DateRange): Promise<NormalizedRow<unknown>[]>;
  fetchCash?(tenantId: string, range: DateRange): Promise<NormalizedRow<unknown>[]>;
  fetchViolations?(tenantId: string, range: DateRange): Promise<NormalizedRow<unknown>[]>;
  ingestXlsx?(tenantId: string, buffer: Buffer): Promise<XlsxIngestResult>;
}
