// Phase 6 Wave 0 RED — Turns GREEN when Wave 1 ships
// backend/src/services/ingest/normalize.ts.
//
// REQ-ingest-adapter-layer: shared normalizers
// (parseLocalDate, parseMoneyKwd, normaliseDriverName).

import {
  parseLocalDate,
  parseMoneyKwd,
  normaliseDriverName,
} from "../../../services/ingest/normalize";

describe("Phase 6 / REQ-ingest-adapter-layer: shared normalizers", () => {
  test("parseLocalDate('2026-05-01') returns Date with UTC midnight", () => {
    const d = parseLocalDate("2026-05-01");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(4); // May = 4
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
  });

  test("parseLocalDate(45000) returns new Date(Date.UTC(2023, 2, 15)) — XLSX serial pin (WARNING 6)", () => {
    const d = parseLocalDate(45000);
    expect(d.getUTCFullYear()).toBe(2023);
    expect(d.getUTCMonth()).toBe(2); // March
    expect(d.getUTCDate()).toBe(15);
  });

  test("parseLocalDate(null) throws explanatory Error", () => {
    expect(() => parseLocalDate(null as unknown as string)).toThrow();
  });

  test("parseMoneyKwd('KD 12.500') returns 12.5", () => {
    expect(parseMoneyKwd("KD 12.500")).toBe(12.5);
  });

  test("parseMoneyKwd('12.500') returns 12.5", () => {
    expect(parseMoneyKwd("12.500")).toBe(12.5);
  });

  test("normaliseDriverName('  Mohamed  Ali  ') returns 'mohamed ali'", () => {
    expect(normaliseDriverName("  Mohamed  Ali  ")).toBe("mohamed ali");
  });
});

// RED — turned GREEN by Wave 1. File name contains "normalize" pin.
