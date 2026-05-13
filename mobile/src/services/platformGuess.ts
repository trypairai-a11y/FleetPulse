/**
 * platformGuess — tier-3 hint for the backend's ActivePlatformAttribution service.
 *
 * Phase 5 RESEARCH.md decided on a 3-tier signal:
 *   Tier 1 (HIGH confidence): explicit POS/order pings from the platform's own app
 *   Tier 2 (MEDIUM):          courier-confirmed manual selection
 *   Tier 3 (LOW):              this module — "the courier was last looking at the Talabat tab"
 *
 * The 30-minute decay window matches the average shift segment a courier spends focused on
 * a single platform's queue. After half an hour with no tab switch, we assume the hint is
 * stale and return null so the backend falls back to UNKNOWN rather than persisting a
 * potentially-wrong attribution.
 *
 * Module-level state (not SecureStore-backed): the hint is meaningful only while the app
 * process is alive. A cold start = no hint = backend uses other tiers.
 */

export type PlatformHint = "KEETA" | "TALABAT" | "DELIVEROO" | "AMERICANA";

const DECAY_MS = 30 * 60 * 1000;

let _lastTab: { value: PlatformHint; at: number } | null = null;

export function setLastTab(p: PlatformHint): void {
  _lastTab = { value: p, at: Date.now() };
}

export function getLastTab(): PlatformHint | null {
  if (!_lastTab) return null;
  if (Date.now() - _lastTab.at > DECAY_MS) {
    _lastTab = null;
    return null;
  }
  return _lastTab.value;
}

// Test-only seam — clears the cache between jest tests.
export function _resetForTests(): void {
  _lastTab = null;
}
