---
phase: 05-mobile-gps-beacon
plan: 01
subsystem: mobile-gps-beacon
tags: [mobile, gps, expo-sqlite, outbox, battery-telemetry, wave-1]
requires:
  - "/Users/mac/Documents/Darb/mobile/__tests__/ (10 Wave 0 RED suites)"
  - "/Users/mac/Documents/Darb/mobile/jest.config.js (Wave 0 jest-expo bootstrap)"
provides:
  - "mobile/src/services/outbox.ts — expo-sqlite durable GPS queue"
  - "mobile/src/services/locationService.ts — rewritten TaskManager + permission flow"
  - "mobile/src/services/platformGuess.ts — tier-3 active-platform hint (30-min decay)"
  - "mobile/src/services/heartbeatService.ts — real battery telemetry"
  - "mobile/src/services/photoService.ts — direct-to-storage photo upload pipeline"
  - "mobile/src/api/client.ts uploadLocations forwards deviceId + driverId (bug fix)"
  - "mobile/src/api/client.ts requestUploadUrl + recordDeliveryPhotoMetadata stubs"
  - "mobile/app.json Android FOREGROUND_SERVICE_LOCATION + expo-sqlite plugin"
affects:
  - "mobile/__tests__/mocks/expo-task-manager.ts — globalThis-anchored to survive resetModules"
  - "mobile/__tests__/mocks/expo-location.ts — added LocationActivityType alias"
  - "mobile/__tests__/mocks/expo-battery.ts — added isLowPowerModeEnabledAsync"
  - "mobile/__tests__/mocks/expo-application.ts — new mock"
  - "mobile/jest.config.js — fixed setupFilesAfterEach typo + added expo-application mapping"
tech-stack:
  added:
    - "expo-sqlite ~15.1.4 (durable outbox)"
    - "expo-image-manipulator ~13.0.6 (compression for delivery photos)"
    - "expo-battery ~9.0.2 (real battery telemetry)"
    - "expo-application ~6.0.2 (app version reporting)"
  patterns:
    - "expo-sqlite outbox with INSERT OR IGNORE on UNIQUE(idempotencyKey)"
    - "TaskManager.defineTask at module top-level (rehydration-safe)"
    - "Two-step permission flow (WhenInUse → Always upgrade)"
    - "Idempotency key = capturedAt-truncated-to-second + lat,lng-rounded-5dp"
    - "Reentrancy guard via flushInFlight latch"
    - "Test-mock state survives jest.resetModules() via Symbol-on-globalThis"
key-files:
  created:
    - "mobile/src/services/outbox.ts"
    - "mobile/src/services/platformGuess.ts"
    - "mobile/src/services/heartbeatService.ts"
    - "mobile/src/services/photoService.ts"
    - "mobile/__tests__/mocks/expo-application.ts"
  modified:
    - "mobile/src/services/locationService.ts (full rewrite)"
    - "mobile/src/api/client.ts (uploadLocations + new exports)"
    - "mobile/app.json (Android perms + iOS infoPlist + plugins)"
    - "mobile/package.json (4 new Expo SDK 52 packages)"
    - "mobile/package-lock.json"
    - "mobile/jest.config.js (fixed setupFilesAfterEnv typo)"
    - "mobile/__tests__/mocks/expo-task-manager.ts"
    - "mobile/__tests__/mocks/expo-location.ts"
    - "mobile/__tests__/mocks/expo-battery.ts"
decisions:
  - "Outbox schema uses table `outbox` with single JSON `payload` column (matches Wave 0 jest mock contract; real expo-sqlite handles both flat-column and JSON-blob layouts equivalently for our access pattern)"
  - "Variadic SQL parameter form (`runAsync(sql, p1, p2)`) over array form — Wave 0 mock only handles variadic, real expo-sqlite supports both"
  - "Backward-compat aliases preserve `startTracking`/`stopTracking` so dashboard.tsx keeps building; Wave 3 will rename call sites to `startBeacon`/`stopBeacon`"
  - "heartbeatService does NOT early-return on missing device_id — the backend's rate limiter will reject with 401, which is the correct behavior; client-side gating would mask enrollment bugs"
  - "photoService uses RN-conventional `body: { uri, name, type }` for PUT instead of reading the file into a Blob — saves a round-trip through JS memory and matches the recommended RN binary-upload pattern"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-13"
  files_created: 5
  files_modified: 9
  tests_added: 0
  tests_turned_green: "15 (10 Wave 0 suites; was 1 passing / 10 failing → now 15 passing / 0 failing)"
---

# Phase 5 Plan 01: Wave 1 Mobile GPS Foundation Summary

Wave 1 replaces the mobile GPS-beacon foundation with the production-ready Expo-blessed
pattern. The existing `locationService.ts` was Pitfall-1/2/3 trifecta: AsyncStorage outbox
(corrupts under heavy write — Expo issue #33754), no iOS `activityType` /
`pausesUpdatesAutomatically` settings (OS kills stream after ~30 min), and missing Android 14
`FOREGROUND_SERVICE_LOCATION` permission (crashes on first shift). All three are fixed.

## Wave 1 Deliverables

### 4 new services + 1 photo upload pipeline (476 lines total, heavily commented)

| File | Lines | Provides |
|---|---|---|
| `mobile/src/services/outbox.ts` | 187 | `enqueueGpsPoint`, `flushPendingPoints`, `_resetForTests`, `_countForTests`, `_allRowsForTests` |
| `mobile/src/services/locationService.ts` | 128 | `startBeacon`, `stopBeacon`, `getCurrentLocation`, `startTracking`/`stopTracking` aliases |
| `mobile/src/services/platformGuess.ts` | 40 | `setLastTab(PlatformHint)`, `getLastTab(): PlatformHint \| null` with 30-min decay |
| `mobile/src/services/heartbeatService.ts` | 47 | `sendHeartbeat()` reading real expo-battery + expo-application |
| `mobile/src/services/photoService.ts` | 74 | `uploadDeliveryPhoto({orderId, uri, latitude, longitude})` compression + presigned PUT |

### API client extensions (`mobile/src/api/client.ts`)

- `uploadLocations({deviceId, driverId, locations[], platformGuess?})` — fixed signature
  forwards both IDs in the JSON body (legacy bug: backend `routes/agent.ts:97` read these
  from `req.body` but old client never sent them, so every legacy upload was rejected
  silently with 400 missing-deviceId)
- `heartbeat()` payload type extended with `isLowPowerMode?` and `platformGuess?`
- `requestUploadUrl()` — Wave 1 client stub; backend route lands Wave 2
- `recordDeliveryPhotoMetadata()` — Wave 1 client stub; backend route lands Wave 2

### `mobile/app.json` corrections

Pre-Wave-1 → Post-Wave-1 diff:

| Field | Before | After |
|---|---|---|
| `android.permissions` | 7 perms, no FOREGROUND_SERVICE_LOCATION | 8 perms incl. `FOREGROUND_SERVICE_LOCATION` (Pitfall 3) |
| `plugins[0]` | `"expo-camera"` (string) | `["expo-location", {locationAlwaysAndWhenInUsePermission: "Darb tracks…"}]` (array w/ rationale) |
| `plugins[1]` | `"expo-location"` | `["expo-camera", {cameraPermission: "Darb captures…"}]` |
| `plugins[*]` | no expo-sqlite | adds `"expo-sqlite"` so EAS links the native lib |
| `ios.infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription` | "for delivery assignment" | full rationale paragraph |

### Test-mock infrastructure additions (Rule 3 deviations — see below)

- `mobile/__tests__/mocks/expo-application.ts` — new
- `mobile/__tests__/mocks/expo-battery.ts` — added `isLowPowerModeEnabledAsync`
- `mobile/__tests__/mocks/expo-location.ts` — added `LocationActivityType` alias
- `mobile/__tests__/mocks/expo-task-manager.ts` — anchored state to globalThis Symbols
- `mobile/jest.config.js` — fixed `setupFilesAfterEach` typo → `setupFilesAfterEnv` (the Wave 0 typo silently disabled the `setup.ts` reset hooks — Jest emitted a validation warning at every run)

## Test Counts: Wave 0 RED → Wave 1 GREEN

**Before Wave 1:**

```
Test Suites: 10 failed, 10 total
Tests:       10 failed, 1 passed, 11 total
```

**After Wave 1:**

```
Test Suites: 10 passed, 10 total
Tests:       15 passed, 15 total
Time:        ~1.5 s
```

Net change: **+14 tests turned green, +9 suites turned green, 0 regressions.** The `15` total
(vs `11` before) is because some suites have multiple test cases — the appJson suite has 3,
the outbox.flushSemantics suite has 2 (happy path + failure path), the locationService.permissionFlow
suite has 2 (denied + granted). The Wave 0 RED counter was per-suite while Wave 1's GREEN counter is per-case.

| Suite | Cases | Status |
|---|---|---|
| `appJson.androidPermissions` | 3 | GREEN |
| `outbox.idempotency` | 1 | GREEN |
| `outbox.flushSemantics` | 2 | GREEN |
| `outbox.giveUp` | 1 | GREEN |
| `locationService.permissionFlow` | 2 | GREEN |
| `locationService.taskRegistration` | 1 | GREEN |
| `platformGuess.lastTab` | 2 | GREEN |
| `heartbeatService.battery` | 1 | GREEN |
| `photoService.compress` | 1 | GREEN |
| `photoService.uploadDirect` | 1 | GREEN |
| **Total** | **15** | **15/15 GREEN** |

## Outbox SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotencyKey TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,                          -- JSON.stringify(OutboxGpsPoint)
  attempts INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);
CREATE INDEX IF NOT EXISTS idx_outbox_attempts_id ON outbox(attempts, id);
```

**Notable choices:**

- **Table name `outbox`** (not `gps_points` as the plan recipe suggested) — matches Wave 0
  mock contract. Real expo-sqlite is indifferent to table name; the mock is not.
- **Single JSON `payload` column** instead of flat lat/lng/accuracy/speed columns — matches
  Wave 0 mock contract. Real expo-sqlite handles both layouts equivalently for our query
  patterns (we select rows in bulk, decode JSON in JS, never WHERE-clause on individual
  GPS fields). Cost: ~30 bytes per row vs flat-column. Benefit: schema-stable across
  future OutboxGpsPoint shape changes (no migrations needed for additive fields).
- **idempotencyKey UNIQUE constraint** with `INSERT OR IGNORE` — duplicate keys silently
  rejected at the SQLite layer. TaskManager re-entry is a documented expo-location quirk;
  this makes the outbox idempotent regardless of how many times the OS fires the task
  with the same location.
- **Idempotency key format:** `${capturedAt.slice(0,19)}-${lat.toFixed(5)},${lng.toFixed(5)}`
  — truncates timestamp to second precision and lat/lng to ~1.1 m grid cells. Two samples
  within the same second at the same grid cell collapse to one row.
- **`idx_outbox_attempts_id` index** — supports the head-of-queue flush query
  (`WHERE attempts < 5 ORDER BY id ASC LIMIT 50`).

## Permission Flow Trace

```text
startBeacon()
  └─► Location.requestForegroundPermissionsAsync()  ── status: granted? ──┐
        │                                                                 │
        │ denied → return { ok:false, reason:"foreground_denied" }        │
        │                                                                 ▼
        └─► Location.requestBackgroundPermissionsAsync()  ── status: granted? ──┐
              │                                                                 │
              │ denied → return { ok:false, reason:"background_denied" }        │
              │                                                                 ▼
              └─► TaskManager.isTaskRegisteredAsync("darb-background-location")
                    │
                    ├─► already running → return { ok:true }
                    │
                    └─► Location.startLocationUpdatesAsync("darb-background-location", {
                          accuracy: BestForNavigation,
                          timeInterval: 30_000,
                          distanceInterval: 25,
                          deferredUpdatesInterval: 60_000,
                          deferredUpdatesDistance: 100,
                          activityType: AutomotiveNavigation,    // ◄── iOS 30-min kill fix
                          pausesUpdatesAutomatically: false,     // ◄── Pitfall 2
                          showsBackgroundLocationIndicator: true,// ◄── iOS user trust signal
                          foregroundService: {
                            notificationTitle: "Darb is tracking your shift",
                            notificationBody: "Active until you tap End Shift",
                            notificationColor: "#F97316",
                            killServiceOnDestroy: false,         // ◄── Pitfall 3
                          },
                        })
                        → return { ok:true }
```

The TaskManager.defineTask call is at MODULE TOP LEVEL — re-registers on cold start when
the OS rehydrates the process for a background location event.

## Deviations from Plan

### Rule 3 — Wave 0 jest config typo (`setupFilesAfterEach`)

**Found during:** Task 1 verification
**Issue:** `mobile/jest.config.js:4` set `setupFilesAfterEach` — not a valid Jest option.
Jest emitted a validation warning on every run and silently skipped `__tests__/setup.ts`,
so the `beforeEach` reset hooks (`ExpoSqliteMock.__resetDb()`, `__resetStore()`,
`__resetTasks()`) never ran. Tests passed/failed based on residual state from prior tests.
**Fix:** Renamed to `setupFilesAfterEnv`. Reset hooks now run as intended.
**Tracked as:** Rule 3 (blocking issue) — auto-fixed inline, committed in `06279e7`.

### Rule 3 — Wave 0 didn't ship expo-application mock or expo-battery.isLowPowerModeEnabledAsync

**Found during:** Task 2 first test run
**Issue:** Heartbeat test imported `heartbeatService.ts` which imports `expo-application`
and calls `Battery.isLowPowerModeEnabledAsync()`. The Wave 0 mocks didn't cover either —
the ESM import in expo-application's compiled output broke jest-parse without a moduleNameMapper
entry, and the battery mock surface was missing the `isLowPowerMode` getter.
**Fix:** Added `mobile/__tests__/mocks/expo-application.ts`, mapped it in `jest.config.js`,
added `isLowPowerModeEnabledAsync` to the battery mock.
**Tracked as:** Rule 3 — auto-fixed.

### Rule 3 — Wave 0 expo-location mock missing `LocationActivityType`

**Found during:** Task 2 locationService.permissionFlow test
**Issue:** Real expo-location exports both `ActivityType` (legacy) and `LocationActivityType`
(typed-routes-era). The Wave 0 mock only exposed `ActivityType`, so production code reading
`Location.LocationActivityType.AutomotiveNavigation` got `Cannot read 'AutomotiveNavigation' of undefined`.
**Fix:** Added `export const LocationActivityType = ActivityType;` alias in the mock.
**Tracked as:** Rule 3 — auto-fixed.

### Rule 3 — Test-mock state didn't survive `jest.resetModules()`

**Found during:** Task 2 locationService.taskRegistration test
**Issue:** The test does `jest.resetModules()` + `__resetTasks()` in `beforeEach` so a fresh
locationService module-load re-triggers `TaskManager.defineTask`. But `jest.resetModules()`
also reloads the `expo-task-manager` mock module, creating fresh jest.fn() spies. The test's
pre-reset `mockTaskManager.defineTask` reference pointed to the OLD spy while the post-reset
locationService import called a NEW spy — assertion `expect(...).toHaveBeenCalledWith(...)`
failed with "Number of calls: 0".
**Fix:** Anchored both the `definedTasks` array AND the jest.fn() spies themselves to
Symbols on globalThis. Symbols survive module-cache invalidation, so the spy identity is
preserved across `resetModules()` calls. Standard jest workaround for module-level mutable
test state.
**Tracked as:** Rule 3 — auto-fixed.

### Rule 2 — Plan undercounts photoService

**Found during:** Task 2 test inventory
**Issue:** Plan task 2 says "ship api/client stubs but leave Wave 3 photo work clean"
yet the 10 Wave 0 RED tests include `photoService.compress` and `photoService.uploadDirect`,
which require a working `mobile/src/services/photoService.ts`. The plan's "All 10 Wave 0
mobile tests GREEN" success criterion forces the implementation.
**Fix:** Shipped `mobile/src/services/photoService.ts` with the full compression + presigned
PUT + metadata pipeline. Wave 3 will wire it to the camera UI; the service itself is
production-ready.
**Tracked as:** Rule 2 — auto-added missing critical functionality (without it, Wave 1
fails its own success criterion).

### Rule 3 — Concurrent commit attribution drift (pre-existing pattern)

**Found during:** Task 2 commit step
**Issue:** Between `git add` and `git commit` for Task 2, a concurrent agent's
`feat(06-01): registry.ts + xlsxRouteFactory.ts` commit (`f35ceed`) swept the 11 Phase 5
mobile files into a Phase 6 commit. The files are intact and correct; the commit
message is misleading. This matches the documented Wave 0 SUMMARY pre-warning about
"concurrent commit collision (commit attribution drift)" — same pattern as `52a141e` which
mislabeled Phase 5 Task 1 backend files as Phase 6.
**Outcome:** No rollback. All Phase 5 Wave 1 Task 2 files are on disk and committed at
correct content; the only artifact is a misleading commit subject line. This SUMMARY
documents the actual scope of `f35ceed`.
**Tracked as:** Rule 3 — pre-existing repo concurrency hazard, documented inline.

### Schema deviation from plan recipe

**Found during:** Task 2 implementation
**Issue:** Plan recipe's outbox schema uses table `gps_points` with flat columns
(`latitude REAL`, `longitude REAL`, `accuracy REAL`, etc.). Wave 0 jest mock implements
table `outbox` with a single `payload` JSON column. The mock's `runAsync` SQL parser
only recognizes uppercase `INTO OUTBOX` / `FROM OUTBOX` patterns, not `gps_points`.
**Fix:** Implementation matches the mock's contract — table `outbox`, single `payload`
column with JSON.stringify(OutboxGpsPoint). Production behavior is identical: same
idempotency semantics, same flush batch size, same give-up threshold. The schema choice
is internal and not part of the interface spec.
**Tracked as:** Rule 1-equivalent — implementation aligned to the binding contract
(the tests), not to the planning prose.

## Auth Gates Encountered

None — Wave 1 is pure mobile-side work, no auth required.

## Threat Surface Scan

| Threat ID | Component | Mitigation status |
|---|---|---|
| T-05-01-01 | Outbox SQL injection | **Mitigated** — all values bound via parameterised `runAsync(?, ...)`; idempotencyKey is server-derivable from `[0-9-,.: ]` after `toFixed(5)`. No string concatenation anywhere in outbox.ts. |
| T-05-01-02 | Permission downgrade | **Mitigated client-side** — `startBeacon()` short-circuits with `{ok:false, reason:"background_denied"}`. Wave 3 must surface this to the dashboard UI. |
| T-05-01-03 | Battery DoS | **Mitigated** — `pausesUpdatesAutomatically:false` + `deferredUpdatesInterval:60_000` + `deferredUpdatesDistance:100` keep battery target ≤ 6%/hr per RESEARCH.md Pitfall 6. Heartbeat exposes real battery for backend monitoring. |
| T-05-01-04 | Outbox poisoning | **Accepted** — defense-in-depth via backend tenant scope + Phase 11 violation engine flagging impossible-speed records. |
| T-05-01-07 | Stale rows from attempts>=5 | **Mitigated** — give-up filter + Wave 4 SUMMARY documenting accepted data loss for forever-failure cases (rare; 5 attempts at 30s intervals = 2.5 min max delay before give-up). |

No new threat surface introduced beyond what the plan's threat model already captured.

## Open Follow-ups for Wave 4

1. **EAS native rebuild required** to deploy `app.json` permission changes —
   `FOREGROUND_SERVICE_LOCATION` and the expo-sqlite plugin are native-build-time concerns.
   Wave 4's BLOCKING manual-action task is `eas build --platform android` + `eas build --platform ios`.
2. **dashboard.tsx callsite rename** — Wave 3 should rename `startTracking`/`stopTracking`
   call sites to `startBeacon`/`stopBeacon` and surface the `reason` field to the courier UI
   (foreground-denied → "Please enable location"; background-denied → "Please switch to Always").
3. **dashboard.tsx heartbeat replacement** — `dashboard.tsx:53` still calls
   `heartbeat({deviceId, batteryLevel: 1.0, appVersion: "1.0.0"})` directly. Replace with
   `import { sendHeartbeat } from "../../src/services/heartbeatService"` in Wave 3.
4. **platformGuess wiring** — Wave 3 should add `setLastTab` calls to each platform-tab
   `onPress` handler (Keeta tab → `setLastTab("KEETA")`, etc).
5. **Outbox quarantine endpoint** — Phase 5+1 follow-up per threat T-05-01-07; ship rows
   with `attempts >= 5` back to the developer for diagnosis before silent data loss.

## Commits Landed

| Hash | Subject | Files | Note |
|---|---|---|---|
| `06279e7` | `chore(05-01): install Expo SDK 52 packages + fix app.json for Android 14 + fix jest setup typo` | 4 (app.json, package.json, package-lock.json, jest.config.js) | Task 1 — clean attribution |
| `f35ceed` | `feat(06-01): registry.ts + xlsxRouteFactory.ts (empty composites)` | 14 (3 Phase 6 + 11 **Phase 5 Wave 1 Task 2**) | Task 2 — misattributed by concurrent agent; documented above |

## Self-Check

### Files exist
- `/Users/mac/Documents/Darb/mobile/src/services/outbox.ts` — **FOUND** (187 lines)
- `/Users/mac/Documents/Darb/mobile/src/services/locationService.ts` — **FOUND** (128 lines, full rewrite)
- `/Users/mac/Documents/Darb/mobile/src/services/platformGuess.ts` — **FOUND** (40 lines)
- `/Users/mac/Documents/Darb/mobile/src/services/heartbeatService.ts` — **FOUND** (47 lines)
- `/Users/mac/Documents/Darb/mobile/src/services/photoService.ts` — **FOUND** (74 lines)
- `/Users/mac/Documents/Darb/mobile/__tests__/mocks/expo-application.ts` — **FOUND**
- `/Users/mac/Documents/Darb/mobile/app.json` (FOREGROUND_SERVICE_LOCATION present) — **FOUND**

### Commits exist
- `06279e7` — Task 1 — **FOUND**
- `f35ceed` — Task 2 files (misattributed) — **FOUND**

### Verification commands
- `cd mobile && npx jest` → `Test Suites: 10 passed, 10 total; Tests: 15 passed, 15 total` — **GREEN**
- `grep FOREGROUND_SERVICE_LOCATION mobile/app.json` → match — **PASS**
- `grep expo-sqlite mobile/app.json` → match — **PASS**
- `grep "TaskManager.defineTask" mobile/src/services/locationService.ts` → 1 match at module scope — **PASS**
- `grep "1.0" mobile/src/services/heartbeatService.ts` → only as fallback default (caught by `.catch(() => 1.0)`), NOT as hardcoded heartbeat payload — **PASS**

## Self-Check: PASSED
