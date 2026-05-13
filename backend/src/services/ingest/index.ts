// Phase 6 Wave 1 — Barrel re-exports for the ingest adapter layer.
//
// Consumers should import from "services/ingest" (this barrel) rather
// than reaching into the individual modules; this keeps Wave 2+ free
// to reshape internals without breaking adapter consumers.

export * from "./types";
export { CompositeAdapter } from "./composite";
export { writeIngestRun } from "./audit";
export type { WriteIngestRunArgs } from "./audit";
export {
  parseLocalDate,
  parseMoneyKwd,
  normaliseDriverName,
} from "./normalize";
export { getAdapter } from "./registry";
export type { AdapterContext } from "./registry";
export { makeXlsxImportRoute } from "./xlsxRouteFactory";
