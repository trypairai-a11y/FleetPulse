/**
 * Phase 4 Wave 1 — view-tool aggregator.
 *
 * Side-effect import: the module self-registers `describeView` on load.
 * Imported from agent/index.ts.
 */
import "./describeView";

export { describeViewTool, describeViewInputSchema } from "./describeView";
export type { DescribeViewInput } from "./describeView";
