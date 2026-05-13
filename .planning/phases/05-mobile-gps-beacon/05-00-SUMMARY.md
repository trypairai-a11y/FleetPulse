---
phase: 05-mobile-gps-beacon
plan: 00
subsystem: mobile-gps-beacon
tags: [testing, jest-expo, red-scaffolding, wave-0]
requires:
  - "/Users/mac/Documents/Darb/mobile/src (existing services to be rewritten in Wave 1)"
  - "/Users/mac/Documents/Darb/backend/src/__tests__/setup.ts (getMockPrisma + resetAllMocks)"
provides:
  - "jest-expo test runner for mobile codebase (mobile/jest.config.js + setup)"
  - "10 mobile RED test files defining Wave 1+ behavioural contracts"
  - "5 backend RED test files defining Wave 2 endpoint/service/middleware contracts"
  - "Phase 5 prisma model mocks (locationLog, courierOnlineSession, orderEvent, device)"
  - "Extended lint:tenant scope covering Phase 5 file globs"
affects:
  - "mobile/package.json (added test script + 5 devDeps + lockfile bump)"
  - "backend/package.json (lint:tenant glob extended with 4 new file paths)"
  - "backend/src/__tests__/mocks/config.ts (additive prisma delegate stubs)"
tech-stack:
  added:
    - "jest-expo ~52.0.0 (mobile test preset)"
    - "@testing-library/react-native ^13.0.0"
    - "@types/jest ^30.0.0"
    - "jest ^29.7.0"
    - "react-test-renderer 18.3.1"
  patterns:
    - "Module mocks via jest.config.js moduleNameMapper (matches backend pattern)"
    - "In-memory expo-sqlite that simulates INSERT OR IGNORE on UNIQUE(idempotencyKey)"
    - "RED tests via require() of not-yet-existing Wave 1+ modules"
key-files:
  created:
    - "mobile/jest.config.js"
    - "mobile/__tests__/setup.ts"
    - "mobile/__tests__/jest-globals.ts"
    - "mobile/__tests__/mocks/expo-sqlite.ts"
    - "mobile/__tests__/mocks/expo-location.ts"
    - "mobile/__tests__/mocks/expo-task-manager.ts"
    - "mobile/__tests__/mocks/expo-image-manipulator.ts"
    - "mobile/__tests__/mocks/expo-camera.ts"
    - "mobile/__tests__/mocks/expo-battery.ts"
    - "mobile/__tests__/mocks/expo-secure-store.ts"
    - "mobile/__tests__/mocks/async-storage.ts"
    - "mobile/__tests__/mocks/api-client.ts"
    - "mobile/__tests__/outbox.idempotency.test.ts"
    - "mobile/__tests__/outbox.flushSemantics.test.ts"
    - "mobile/__tests__/outbox.giveUp.test.ts"
    - "mobile/__tests__/locationService.permissionFlow.test.ts"
    - "mobile/__tests__/locationService.taskRegistration.test.ts"
    - "mobile/__tests__/photoService.compress.test.ts"
    - "mobile/__tests__/photoService.uploadDirect.test.ts"
    - "mobile/__tests__/platformGuess.lastTab.test.ts"
    - "mobile/__tests__/heartbeatService.battery.test.ts"
    - "mobile/__tests__/appJson.androidPermissions.test.ts"
    - "backend/src/__tests__/agent/locationIngest.test.ts"
    - "backend/src/__tests__/agent/presignFlow.test.ts"
    - "backend/src/__tests__/agent/deliveryPhoto.test.ts"
    - "backend/src/__tests__/services/activePlatformAttribution.test.ts"
    - "backend/src/__tests__/middleware/agentRateLimit.test.ts"
  modified:
    - "mobile/package.json"
    - "mobile/package-lock.json"
    - "backend/package.json"
    - "backend/src/__tests__/mocks/config.ts"
decisions:
  - "Use require() instead of dynamic await import() for Wave 1+ module references — jest VM rejects dynamic import callbacks without --experimental-vm-modules; require() is the conventional Jest+ts-jest pattern"
  - "Mock @react-native-async-storage/async-storage alongside expo-* modules — the existing locationService.ts still imports it (Wave 1 rewrites to SQLite outbox); mock keeps the legacy module load path testable until rewrite"
  - "Phase 5 prisma mock additions are purely additive jest.fn() delegates — no behavior change for any existing Phase 1-4 test"
  - "Eslint-disable-next-line directives for @typescript-eslint/no-var-requires removed from new test files — the lint:tenant scope's --no-eslintrc invocation only loads the no-prisma-without-tenant local rule, so referencing typescript-eslint rules in disable directives causes hard failures"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-13"
  files_created: 27
  files_modified: 4
  tests_added: "10 mobile RED + 5 backend RED (15 total RED suites)"
---

# Phase 5 Plan 00: Mobile GPS Beacon — Wave 0 RED Scaffolding Summary

Wave 0 establishes the safety-net before any Phase 5 production code lands.
Mobile codebase had zero test infrastructure; this plan bootstraps `jest-expo`
and ships 15 failing test files (10 mobile + 5 backend) that turn GREEN exactly
when each Wave 1–3 behavior is implemented correctly.

## Wave 0 Deliverables

### Mobile (Task 0 — commit `f15ca22`)
1. `mobile/jest.config.js` — jest-expo preset + 9 moduleNameMapper entries + transformIgnorePatterns tuned for RN ecosystem
2. `mobile/__tests__/setup.ts` — resets mock state via `beforeEach` (SQLite db, SecureStore map, defined-tasks list)
3. `mobile/__tests__/jest-globals.ts` — quiets the legacy AsyncStorage console.error
4. 8 module mocks under `mobile/__tests__/mocks/`:
   - `expo-sqlite.ts` — most important; simulates `INSERT OR IGNORE` semantics on `UNIQUE(idempotencyKey)` + UPDATE attempts++ + DELETE-by-id
   - `expo-location.ts` — Accuracy/ActivityType enums + permission/task-start jest.fn() seams
   - `expo-task-manager.ts` — captures `defineTask` registrations for assertion
   - `expo-image-manipulator.ts` — `SaveFormat` enum + `manipulateAsync` jest.fn()
   - `expo-camera.ts`, `expo-battery.ts`, `expo-secure-store.ts`, `async-storage.ts` — minimal in-memory surfaces
   - `api-client.ts` — all 14 named exports from real `src/api/client.ts` plus 2 Wave-1+ seams (`requestUploadUrl`, `recordDeliveryPhotoMetadata`)
5. 10 RED test files (all currently failing — modules don't yet exist)

### Backend (Task 1 — commit `52a141e`, see Deviations below)
1. 5 new RED test files
2. 4 additive prisma model delegates in `__tests__/mocks/config.ts` (locationLog, courierOnlineSession, orderEvent, device) — additive only
3. `lint:tenant` scope extended with 4 Phase 5 paths (still exits 0; `--no-error-on-unmatched-pattern` keeps it green pre-Wave 2)

## Test File → Wave/Task Mapping

| Test File | Wave / Task | Grep-able Invariant |
|---|---|---|
| `mobile/__tests__/outbox.idempotency.test.ts` | Wave 1 outbox.ts | `INSERT OR IGNORE → 1 row` |
| `mobile/__tests__/outbox.flushSemantics.test.ts` | Wave 1 outbox.ts | `uploadLocations(5) → _countForTests()===0` |
| `mobile/__tests__/outbox.giveUp.test.ts` | Wave 1 outbox.ts | `attempts>=5 → mockApi NOT called` |
| `mobile/__tests__/locationService.permissionFlow.test.ts` | Wave 1 locationService.ts | `foreground denied → no background ask` |
| `mobile/__tests__/locationService.taskRegistration.test.ts` | Wave 1 locationService.ts | `defineTask('darb-background-location')` |
| `mobile/__tests__/photoService.compress.test.ts` | Wave 1 photoService.ts | `manipulateAsync({compress:0.7, format:JPEG, resize:1280})` |
| `mobile/__tests__/photoService.uploadDirect.test.ts` | Wave 1 photoService.ts | `presign → fetch PUT Content-Type:image/jpeg → metadata POST` |
| `mobile/__tests__/platformGuess.lastTab.test.ts` | Wave 1 platformGuess.ts | `setLastTab/getLastTab roundtrip + 30min decay` |
| `mobile/__tests__/heartbeatService.battery.test.ts` | Wave 1 heartbeatService.ts | `batteryLevel: 0.42 (not 1.0)` |
| `mobile/__tests__/appJson.androidPermissions.test.ts` | Wave 1 app.json edit | `FOREGROUND_SERVICE_LOCATION ∈ android.permissions` |
| `backend/src/__tests__/agent/locationIngest.test.ts` | Wave 2 routes/agent.ts | `5 POST → 5 LocationLog + CourierOnlineSession.upsert` |
| `backend/src/__tests__/agent/presignFlow.test.ts` | Wave 2 routes/agent.ts + services/r2Service.ts | `key matches /^tenA\/order1\/dev1\/\d+\.jpg$/` |
| `backend/src/__tests__/agent/deliveryPhoto.test.ts` | Wave 2 routes/agent.ts | `OrderEvent.create({action:'DELIVERY_PHOTO'})` + cross-tenant 403 |
| `backend/src/__tests__/services/activePlatformAttribution.test.ts` | Wave 2 services/activePlatformAttribution.ts | `Tier 1→HIGH, Tier 2→MEDIUM, Tier 3→LOW, UNKNOWN` |
| `backend/src/__tests__/middleware/agentRateLimit.test.ts` | Wave 2 middleware/agentRateLimit.ts | `200 ok, 201st 429, per-deviceId buckets` |

## jest-expo Bootstrap Notes

- **Issue:** Initial test run hit `TypeError: A dynamic import callback was invoked without --experimental-vm-modules` on every test using `await import(...)`. **Fix:** Replaced all `await import("...")` with `require("...")` — the conventional Jest+ts-jest pattern.
- **Issue:** `mobile/src/services/locationService.ts` imports `@react-native-async-storage/async-storage` at module top; jest-expo doesn't ship an AsyncStorage mock by default and the package crashed on jest's `__DEV__` check. **Fix:** Added `mocks/async-storage.ts` + a `moduleNameMapper` entry. Wave 1's rewrite to SQLite outbox makes this mock obsolete but keeps the legacy load path testable in the meantime.
- **Issue:** `jest-globals.ts` was being picked up as a test suite. **Fix:** Added it to `testPathIgnorePatterns`.
- **Final state:** `cd mobile && npm test` reports `10 failed suites, 1 passed test` in ~1 second. The single passing test is `locationService.taskRegistration` — the existing legacy `locationService.ts` already calls `TaskManager.defineTask('darb-background-location', ...)` at module load, satisfying that invariant. The same test will continue to pass after Wave 1 rewrites the file (the registration call remains).

## lint:tenant Scope — Before/After Diff

**Before:**
```
src/agent/ src/__tests__/agent/ … src/agent/tools/view/
```

**After (4 globs appended):**
```
… src/agent/tools/view/
  src/services/activePlatformAttribution.ts
  src/services/r2Service.ts
  src/middleware/agentRateLimit.ts
  src/__tests__/services/activePlatformAttribution.test.ts
```

`--no-error-on-unmatched-pattern` keeps the script green even though the 3 Wave 2 production files don't yet exist. Once Wave 2 lands, every prisma access in those files must already use a tenant-scoped where clause or `npm run lint:tenant` will fail.

## Deviations from Plan

### Concurrent commit collision (commit attribution drift)

**Found during:** Task 1 commit (final step)
**Issue:** Between writing Task 1 backend test files and running `git commit`, two concurrent commits (`40e6030` "Phase 6 Wave 0 RED scaffolding" and `52a141e` "extend lint:tenant scope to src/services/ingest/") landed on `main`. The agent that authored those commits inadvertently staged + committed all 7 of my Phase 5 Task 1 files (5 RED tests + mocks/config.ts + backend/package.json) inside its `52a141e` commit alongside Phase 6's lint:tenant changes.
**Outcome:** All Phase 5 Task 1 files are committed and on disk; both `lint:tenant` and `jest` pass/RED-state as expected. The work is correct but the commit message in `52a141e` mislabels the scope as `06-00` when it also contains `05-00` Task 1 files.
**Files affected:** All Task 1 deliverables (see "key-files.created" frontmatter)
**Status:** Documented; no rollback needed — files are intact and behavioral contracts are met. Wave 1 executor must check both `f15ca22` (mobile Task 0) **and** `52a141e` (backend Task 1, mislabeled) for the Wave 0 starting state.
**Tracked as:** Deviation Rule 3 — pre-existing repo state out of agent's direct control; documented inline rather than blocking.

### Auto-fix: removed eslint-disable directives in new test files

**Found during:** Task 1 verification (`npm run lint:tenant`)
**Issue:** `eslint-disable-next-line @typescript-eslint/no-var-requires` comments I'd added (initially to silence local IDE complaints about `require()`) caused `lint:tenant` to fail with `Definition for rule '@typescript-eslint/no-var-requires' was not found` — because `lint:tenant` uses `--no-eslintrc` and only loads the local `no-prisma-without-tenant` rule via `--rulesdir`. Referencing other rule namespaces in disable directives is a hard failure under that config.
**Fix:** Removed all 5 disable directives. `require()` is fine because `--no-eslintrc` skips the `@typescript-eslint/no-var-requires` rule entirely.
**Tracked as:** Rule 3 (blocking issue) — auto-fixed inline.

### Pre-existing failure noted (not introduced)

`backend/src/__tests__/services/ingest/orderSourceMobileGps.test.ts` was failing in the baseline at the time Phase 5 Wave 0 ran. Verified by `git stash`-ing all Phase 5 changes and re-running — failure persists. Out of Phase 5 scope (Phase 6 ingest concern).

## Self-Check

### Files exist
- `/Users/mac/Documents/Darb/mobile/jest.config.js` — **FOUND**
- `/Users/mac/Documents/Darb/mobile/__tests__/setup.ts` — **FOUND**
- 8 mock files under `mobile/__tests__/mocks/` — **FOUND**
- 10 mobile RED test files under `mobile/__tests__/` — **FOUND**
- 5 backend RED test files (3 under `agent/`, 1 under `services/`, 1 under `middleware/`) — **FOUND**

### Commits exist
- `f15ca22` — `test(05-00): bootstrap jest-expo + 10 RED test files for Phase 5 mobile` — **FOUND** (`git log` confirms)
- `52a141e` — contains Phase 5 Task 1 files (mislabeled as `06-00`) — **FOUND**

### Verification commands
- `cd mobile && npm test` → `Test Suites: 10 failed, 10 total; Tests: 10 failed, 1 passed` — **RED as expected**
- `cd backend && npx jest --testPathPatterns="locationIngest|presignFlow|deliveryPhoto|activePlatformAttribution|agentRateLimit"` → `Test Suites: 5 failed, 5 total; Tests: 10 failed, 1 passed` — **RED as expected**
- `cd backend && npm run lint:tenant` → exit 0 — **PASS**
- `cd backend && npx tsc --noEmit` — Phase 5 files contribute **0** errors (pre-existing ingest-test errors unchanged)

## Self-Check: PASSED
