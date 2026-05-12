/**
 * Phase 1 read tools — registers all 11 in dependency-order.
 * Called from backend/src/agent/index.ts during module init.
 *
 * Each tool file self-registers at module-load time (top-level
 * `register*Tool()` call) — that's the contract the Wave 0 RED test
 * `tenantIsolation.test.ts` relies on (its bare `import "..."` lines
 * must register the tool as a side effect). Importing this index file
 * therefore transitively registers all 11 tools.
 *
 * The `registerAllReadTools()` function is exported as a no-op shim
 * for callers that prefer an explicit invocation; the actual work
 * happens via the side-effect imports above. Calling it after the
 * import is safe — `toolRegistry.register` will warn (not error) on a
 * duplicate, but module imports are cached so each file's body runs
 * only once anyway.
 */

// Side-effect imports — each module self-registers its tool on load.
import "./revenueByDay";
import "./revenueByPlatform";
import "./revenueByZone";
import "./courierLeaderboard";
import "./courierProfile";
import "./violationsList";
import "./cashOutstanding";
import "./attendanceForPeriod";
import "./liveFleetStatus";
import "./gpsTrack";
import "./searchOrders";
// Phase 2 Wave 1 — 12th read tool: prefix-scan AgentMemory (used by the
// monitor agent for the dismissed:* 7-day suppression contract).
import "./listAgentMemory";
// Phase 3 Wave 1 — 13th read tool: 90-day PerformanceSnapshot trend used by
// the Driver File trend chart + score-explainer reasoning.
import "./performanceTrend";

// Re-exports for callers that want the tool definitions directly.
export { revenueByDay } from "./revenueByDay";
export { revenueByPlatform } from "./revenueByPlatform";
export { revenueByZone } from "./revenueByZone";
export { courierLeaderboard } from "./courierLeaderboard";
export { courierProfile } from "./courierProfile";
export { violationsList } from "./violationsList";
export { cashOutstanding } from "./cashOutstanding";
export { attendanceForPeriod } from "./attendanceForPeriod";
export { liveFleetStatus } from "./liveFleetStatus";
export { gpsTrack } from "./gpsTrack";
export { searchOrders } from "./searchOrders";
export { listAgentMemory } from "./listAgentMemory";

/**
 * No-op shim — the side-effect imports above already registered all 11
 * tools by the time this function is callable. Exposed so `agent/index.ts`
 * can document "register read tools here" with a function call rather
 * than a bare side-effect import.
 */
export function registerAllReadTools(): void {
  // Intentionally empty — see file-level docstring.
}
