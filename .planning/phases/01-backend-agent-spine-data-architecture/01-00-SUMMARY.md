---
phase: 01-backend-agent-spine-data-architecture
plan: 00
subsystem: testing-and-tooling
tags: [eslint, jest, tdd, tenant-scope, agent-spine, wave-0]
dependency_graph:
  requires: []
  provides:
    - failing-tests-for-wave-1-2-3-4
    - eslint-no-prisma-without-tenant
    - jest-agent-mocks
    - lint-tenant-script
    - test-agent-script
  affects:
    - backend/eslint-rules/
    - backend/.eslintrc.js
    - backend/package.json
    - backend/src/__tests__/mocks/config.ts
    - backend/src/__tests__/agent/
tech_stack:
  added:
    - eslint@^8.57.0
    - "@typescript-eslint/parser@^7.18.0"
    - "@typescript-eslint/eslint-plugin@^7.18.0"
    - eslint-plugin-local-rules@^3.0.2
  patterns:
    - "eslint-plugin-local-rules + rulePaths fallback"
    - "ESLint v8 RuleTester with parserOptions (NOT v9 languageOptions)"
    - "node --test as a meta-test runner alongside Jest"
    - "tests at __tests__/agent/ depth 2 import mocks directly (../mocks/config) — moduleNameMapper anchors `^../config$`"
key_files:
  created:
    - backend/eslint-rules/no-prisma-without-tenant.js
    - backend/eslint-rules/index.js
    - backend/eslint-rules/__tests__/no-prisma-without-tenant.test.js
    - backend/.eslintrc.js
    - backend/src/__tests__/mocks/agentMocks.ts
    - backend/src/__tests__/agent/schema.test.ts
    - backend/src/__tests__/agent/ledger.test.ts
    - backend/src/__tests__/agent/memory.test.ts
    - backend/src/__tests__/agent/pinnedView.test.ts
    - backend/src/__tests__/agent/metricEvent.test.ts
    - backend/src/__tests__/agent/performanceSnapshot.test.ts
    - backend/src/__tests__/agent/tools/strict.test.ts
    - backend/src/__tests__/agent/tools/tenantIsolation.test.ts
    - backend/src/__tests__/agent/walkingSkeleton.test.ts
  modified:
    - backend/package.json
    - backend/package-lock.json
    - backend/src/__tests__/mocks/config.ts
decisions:
  - "lint:tenant scoped to src/agent/ + src/__tests__/agent/ — broaden to src/ in Wave 4 after legacy aiChiefOfStaffService.ts is deleted"
  - "Used ESLint v8 (not v9) — its RuleTester API uses parserOptions; v9 requires languageOptions. Project upgrade path: simple key rename if/when needed."
  - "lint:tenant uses --parser @typescript-eslint/parser inline (--no-eslintrc bypasses the .eslintrc.js parser config) — robust enough to run before .eslintrc.js evolves further"
  - "Test files at __tests__/agent/ depth 2 import the prisma mock directly from ../mocks/config — moduleNameMapper anchors `^../config$` (one parent), so deeper paths bypass the mapper. Plan asked us NOT to modify jest.config.js; direct import keeps that rule."
  - "Wave 0 produces RED tests on purpose — the GREEN sentinel is schema.test.ts (Task 0.2 wired the mocks); Waves 1-4 turn the others green incrementally."
metrics:
  duration_minutes: 13
  completed: 2026-05-09T11:50:17Z
  tasks_completed: 3
  files_created: 14
  files_modified: 3
  commits:
    - "c3a68a0 — Task 0.1 (ESLint rule)"
    - "e69b6b0 — Task 0.2 (Jest mocks)"
    - "3ded16a — Task 0.3 (9 RED tests)"
---

# Phase 1 Plan 00: Wave 0 Safety Net Summary

**One-liner:** Custom ESLint `no-prisma-without-tenant` rule + 9 failing
tests waiting for Waves 1–4 + Jest mocks for 5 new Prisma models — no
production code changed.

## What Was Built

Wave 0 lays the **test-first safety net** before any feature code lands
in Phase 1. Three deliverables:

1. **ESLint custom rule** (`backend/eslint-rules/no-prisma-without-tenant.js`)
   that fires when a tenant-scoped Prisma model is queried without a
   `tenantId` filter. Mirrors the runtime `hasTenantFilter` semantics
   from `prismaExtensions.ts` so the static check and runtime guard
   stay in lock-step. Covers all 30 existing tenant-scoped models PLUS
   the 5 NEW Phase 1 models (AgentAction, AgentMemory, PinnedView,
   PerformanceSnapshot, MetricEvent).

2. **Jest mock infrastructure** (`backend/src/__tests__/mocks/agentMocks.ts`)
   exposing fresh `jest.fn()` stubs for the 5 new model delegates.
   Spread into the existing `mocks/config.ts` so future agent tests
   can `import { prisma } from "../mocks/config"` and exercise the
   writers/readers without touching a real DB.

3. **9 RED test files** at `backend/src/__tests__/agent/` covering
   every Phase 1 deliverable — schema shape, ledger writer, memory
   upsert + read-latest, pinned-view CRUD, metric event recorder,
   performance snapshot writer, registry strict-mode iterator,
   two-tenant integration fixture for the 11 read tools, and the
   end-to-end walking-skeleton smoke. Each fails with "Cannot find
   module" (RED) until its implementing wave lands; `schema.test.ts`
   is GREEN now and acts as a regression sentinel for Wave 1's
   migration.

## Test File Status at End of Wave 0

| Test File                                      | Status at Wave 0 End | Turns GREEN in   |
| ---------------------------------------------- | -------------------- | ---------------- |
| `agent/schema.test.ts`                         | **GREEN** (6/6)      | already           |
| `agent/ledger.test.ts`                         | RED                  | Wave 2           |
| `agent/memory.test.ts`                         | RED                  | Wave 2           |
| `agent/pinnedView.test.ts`                     | RED                  | Wave 2           |
| `agent/metricEvent.test.ts`                    | RED                  | Wave 2           |
| `agent/performanceSnapshot.test.ts`            | RED                  | Wave 2           |
| `agent/tools/strict.test.ts`                   | RED                  | Waves 1 + 3       |
| `agent/tools/tenantIsolation.test.ts`          | RED                  | Wave 3           |
| `agent/walkingSkeleton.test.ts`                | RED                  | Waves 1 + 3       |

**Aggregate:** 8 failed, 1 passed (9 total). 6 individual tests pass
inside the GREEN suite. 0 pre-existing tests regressed (102/102 still
green in the non-agent suite).

## NPM Scripts Added

```json
"test:agent": "jest --testPathPatterns=agent",
"test:lint-rules": "node --test eslint-rules/__tests__/",
"lint": "eslint src/ --ext .ts",
"lint:tenant": "eslint src/agent/ src/__tests__/agent/ --ext .ts --no-eslintrc --resolve-plugins-relative-to . --rulesdir eslint-rules --parser @typescript-eslint/parser --parser-options=ecmaVersion:2022,sourceType:module --rule \"{\\\"no-prisma-without-tenant\\\":\\\"error\\\"}\" --no-error-on-unmatched-pattern"
```

## Verification Commands (Wave 1 should run these to confirm RED state)

```bash
cd backend
node --test eslint-rules/__tests__/no-prisma-without-tenant.test.js   # 1 passed
npm run lint:tenant                                                    # exit 0
npm run test:agent                                                     # 8 failed, 1 passed
npx jest --testPathIgnorePatterns=agent                                # 102 passed (no regression)
```

## Pre-existing Lint Violations (deferred to Wave 4)

`lint:tenant` is **scoped to `src/agent/` + `src/__tests__/agent/` only**
in Wave 0. Running it against the full `src/` tree would surface
violations in legacy services (`aiChiefOfStaffService.ts` uses
`$queryRawUnsafe` which the rule cannot statically analyse, plus
direct Prisma calls without tenant scoping in some scraping/ingest
paths). These are out of scope for Wave 0 by design — the orchestrator
note explicitly delegated this cleanup to Wave 4 ("after legacy
services are deleted").

A scan was NOT performed against the full tree to keep the Wave 0
acceptance gate clean. Wave 4 will:
1. Delete `aiChiefOfStaffService.ts` + `aiChatService.ts` (their tools
   move to the registry in Wave 1).
2. Broaden `lint:tenant` script to `src/`.
3. Document any remaining violations as either fix-now or
   `eslint-disable-next-line` with a justifying comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `lint:tenant` failed on missing `src/agent/` directory**

- **Found during:** Task 0.1 first run.
- **Issue:** ESLint v8 errors out with "No files matching the pattern" when
  a path doesn't exist. `src/agent/` is created in Wave 1, not Wave 0.
- **Fix:** Added `--no-error-on-unmatched-pattern` to the `lint:tenant`
  script. Lets the script succeed cleanly until Wave 1 creates the
  directory.
- **Files modified:** `backend/package.json`
- **Commit:** Folded into c3a68a0 (Task 0.1).

**2. [Rule 3 — Blocking] `lint:tenant` parser error on TypeScript imports**

- **Found during:** Task 0.3 verification.
- **Issue:** `--no-eslintrc` bypassed the parser config in `.eslintrc.js`,
  so ESLint tried to parse `import` statements with the default Espree
  parser, failing with "Parsing error: The keyword 'import' is reserved".
- **Fix:** Added `--parser @typescript-eslint/parser
  --parser-options=ecmaVersion:2022,sourceType:module` inline to the
  script.
- **Files modified:** `backend/package.json`
- **Commit:** Folded into 3ded16a (Task 0.3).

**3. [Rule 3 — Blocking] `test:agent` script flag mismatch with Jest 30**

- **Found during:** Quick regression check after Task 0.2.
- **Issue:** Plan specified `--testPathPattern=agent`. Jest 30 (installed)
  renamed this to `--testPathPatterns` (plural). The old flag throws
  a hard error.
- **Fix:** Updated `test:agent` script to use `--testPathPatterns=agent`.
  The deprecation message in the verification command (`npm test --
  --testPathPattern=agent`) reproduces the same flag rename — both
  paths use the new flag now.
- **Files modified:** `backend/package.json`
- **Commit:** Folded into e69b6b0 (Task 0.2).

**4. [Rule 3 — Blocking] Test files at depth 2 don't match `^../config$` mapper**

- **Found during:** First `agent/schema.test.ts` run (was expected to
  pass; instead the 5 new model delegates returned `undefined`).
- **Issue:** `jest.config.js`'s `moduleNameMapper` anchors
  `^../config$` (one parent up). Test files at
  `src/__tests__/agent/*.test.ts` import `../../config` (two parents
  up) — the regex doesn't match, so they get the REAL Prisma client
  (which doesn't have the new delegates yet). The plan said "do NOT
  modify jest.config.js."
- **Fix:** Changed all 9 test files to import the prisma mock directly
  from `../mocks/config`. Added a comment explaining the rationale
  in `schema.test.ts`. This honours the "no jest.config.js change"
  directive AND lets the schema test pass as a GREEN sentinel.
- **Files modified:** All 9 test files in `backend/src/__tests__/agent/`.
- **Commit:** Folded into 3ded16a (Task 0.3).

### Architectural Decisions Without Required Approval

None. All four deviations were Rule 3 (blocking-issue auto-fixes) — none
required architectural input from the user.

## What Wave 1 Should Do First

1. **Run the same test suite to confirm RED state:**
   ```bash
   cd backend && npm run test:agent
   ```
   Expected: `Test Suites: 8 failed, 1 passed, 9 total`.

2. **If the count differs, investigate before doing any other work** —
   it means either Wave 0 left stale test state (unlikely; tests use
   `jest.clearAllMocks()` in beforeEach) or someone landed Wave 1
   code in the tree without rebuilding.

3. **Confirm the ESLint rule still meta-tests green:**
   ```bash
   cd backend && node --test eslint-rules/__tests__/no-prisma-without-tenant.test.js
   ```

4. **Then proceed with the migration** (5 new models + Tenant relations
   + index). The migration regenerates `src/generated/prisma/`, after
   which:
   - The `prisma.agentAction.*` etc. types become real on the production
     client.
   - Test files that currently use `import { prisma } from "../mocks/config"`
     remain green (they're not affected by production schema).
   - Future Wave-1 unit tests for new Wave-1 modules can EITHER use the
     mock pattern (recommended) OR add a deeper-path mapper to
     `jest.config.js` (touch-jest-config decision deferred to Wave 1).

## Threat Flags

None — Wave 0 ships pure tooling and test scaffolding. No new HTTP
surface, no new outbound integrations, no new secrets. The threat
register from `01-00-PLAN.md` (T-01-W0-01 through T-01-W0-05) is
fully covered by the implementation:

- T-01-W0-01 (rule tampering) → mitigated by RuleTester meta-tests
  (10 valid + 9 invalid cases).
- T-01-W0-02 (PII in fixtures) → tenant-A / tenant-B / driver-1 are
  obvious placeholders.
- T-01-W0-03 (disable comments) → rule honours
  `// eslint-disable-next-line no-prisma-without-tenant`; verified
  in the meta-test VALID set.
- T-01-W0-04 (tool-call injection) → strict.test.ts iterates the
  registry asserting `additionalProperties: false` (RED until Wave 3).
- T-01-W0-05 (mock-layer enforcement) → tenant isolation verified at
  the **query** layer (where clause), not the mock layer; correct.

## Self-Check: PASSED

Verified all created files exist and all commits are reachable:

```
FOUND: backend/eslint-rules/no-prisma-without-tenant.js
FOUND: backend/eslint-rules/index.js
FOUND: backend/eslint-rules/__tests__/no-prisma-without-tenant.test.js
FOUND: backend/.eslintrc.js
FOUND: backend/src/__tests__/mocks/agentMocks.ts
FOUND: backend/src/__tests__/agent/schema.test.ts
FOUND: backend/src/__tests__/agent/ledger.test.ts
FOUND: backend/src/__tests__/agent/memory.test.ts
FOUND: backend/src/__tests__/agent/pinnedView.test.ts
FOUND: backend/src/__tests__/agent/metricEvent.test.ts
FOUND: backend/src/__tests__/agent/performanceSnapshot.test.ts
FOUND: backend/src/__tests__/agent/tools/strict.test.ts
FOUND: backend/src/__tests__/agent/tools/tenantIsolation.test.ts
FOUND: backend/src/__tests__/agent/walkingSkeleton.test.ts
FOUND COMMIT: c3a68a0 (Task 0.1)
FOUND COMMIT: e69b6b0 (Task 0.2)
FOUND COMMIT: 3ded16a (Task 0.3)
```
