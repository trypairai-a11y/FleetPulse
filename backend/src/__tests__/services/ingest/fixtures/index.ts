// Phase 6 Wave 0 RED — Fixture aggregator.
// Re-exports all platform XLSX builders + their malformed counterparts.
// Consumers import via: `import { buildKeetaXlsxBuffer } from "../fixtures";`

export { buildKeetaXlsxBuffer, buildBadKeetaXlsx } from "./keetaSample.xlsx";
export { buildTalabatXlsxBuffer, buildBadTalabatXlsx } from "./talabatSample.xlsx";
export { buildDeliverooXlsxBuffer, buildBadDeliverooXlsx } from "./deliverooSample.xlsx";
export { buildAmericanaXlsxBuffer, buildBadAmericanaXlsx } from "./americanaSample.xlsx";
