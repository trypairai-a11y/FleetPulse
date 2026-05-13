// Phase 6 Wave 1 — Shared normalizers used by every adapter.
//
// Pattern sources:
//   - services/keetaXlsxParser.ts (date parsing — Keeta uses a YYYYMMDD
//     integer format, but the XLSX library may also surface serial numbers
//     and ISO strings depending on the cell type)
//   - services/americanaDailyParser.ts (money parsing — "KD 12.500" strings)
//   - RESEARCH.md "Don't Hand-Roll" — generalise existing patterns into
//     shared helpers so adapters stay thin (Pitfall 1).

import * as XLSX from "xlsx";

/**
 * Parses an Excel serial number, ISO/parseable date string, or Date
 * instance into a UTC-midnight Date. Throws an explanatory Error on
 * null/undefined/unparseable input — callers should catch and surface
 * to the IngestRun.errorLog so the row failure is auditable.
 */
export function parseLocalDate(value: unknown): Date {
  if (value === null || value === undefined) {
    throw new Error("parseLocalDate: value is null/undefined");
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error("parseLocalDate: invalid Date instance");
    }
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
      ),
    );
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      throw new Error(`parseLocalDate: invalid Excel serial ${value}`);
    }
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }

  if (typeof value === "string") {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new Error(`parseLocalDate: cannot parse "${value}"`);
    }
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  throw new Error(`parseLocalDate: unsupported type ${typeof value}`);
}

/**
 * Strips "KD " prefix (case-insensitive), commas, and whitespace, then
 * returns parseFloat. Numbers pass through untouched. Throws on
 * non-numeric strings so adapters can record the offending row instead
 * of silently coercing to NaN.
 */
export function parseMoneyKwd(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") {
    throw new Error(`parseMoneyKwd: expected string|number, got ${typeof value}`);
  }
  const cleaned = value.replace(/KD\s*/i, "").replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  if (isNaN(n)) throw new Error(`parseMoneyKwd: cannot parse "${value}"`);
  return n;
}

/**
 * Lowercases + collapses whitespace for case-insensitive driver-name
 * matching across XLSX sheets (e.g. "Mohamed  Ali" vs "mohamed ali").
 * Adapters that need fuzzy matching should call this BEFORE comparing
 * names so the same driver isn't double-inserted.
 */
export function normaliseDriverName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
