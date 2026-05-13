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
// registry + xlsxRouteFactory exports are added in Task 2 once those
// modules exist; keeping the barrel additive avoids transient build
// failures between Task 1 and Task 2 commits.
