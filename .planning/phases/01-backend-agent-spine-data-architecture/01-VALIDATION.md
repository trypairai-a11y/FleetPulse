---
phase: 1
slug: backend-agent-spine-data-architecture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.3.0 + ts-jest 29.4.9 |
| **Config file** | `backend/jest.config.js` |
| **Quick run command** | `cd backend && npm test -- --testPathPattern=agent` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | quick ~5s, full ~30s |

Existing test setup uses module mocking via `moduleNameMapper` to swap `prisma`, `redis`, `auth`, `tenantScope`, and individual services with hand-written mocks under `backend/src/__tests__/mocks/`. Phase 1 tests follow this pattern; **no new mock infrastructure is needed**.

---

## Sampling Rate

- **After every task commit:** `cd backend && npm test -- --testPathPattern=agent` (covers only the new agent tests)
- **After every plan wave:** `cd backend && npm test` (full suite — verifies no regression in existing tests: `lateClockInPolicy`, `kpiScoring`, `pagination`, `rulesEngine`, `validation`, plus route tests)
- **Before `/gsd-verify-work`:** Full suite green + ESLint custom rule clean + `prisma migrate dev` runs without errors locally + walking-skeleton test passes against seeded test DB
- **Max feedback latency:** ~5 seconds (quick), ~30 seconds (full)

---

## Per-Task Verification Map

> The planner will populate concrete Task IDs after `01-PLAN.md` exists. The columns below pre-stage the requirement → test mapping the plan must honor.

| Req ID | Behavior | Test Type | Automated Command | File Exists |
|--------|----------|-----------|-------------------|-------------|
| REQ-data-agent-action | `writeAgentAction` produces a CON-audit-row-shape compliant row (proposer, approver, originalProposal, modificationsBeforeApproval, outcome, reasoning) | unit | `npm test -- agent/ledger.test.ts` | ❌ Wave 0 |
| REQ-data-agent-action | `AgentAction` table has tenantId index + Tenant relation | schema test | `npm test -- agent/schema.test.ts` | ❌ Wave 0 |
| REQ-data-agent-memory | Upsert + read-latest-by-key returns most recent value | unit | `npm test -- agent/memory.test.ts` | ❌ Wave 0 |
| REQ-data-pinned-view | Create + list-by-user returns only the calling user's pins | unit | `npm test -- agent/pinnedView.test.ts` | ❌ Wave 0 |
| REQ-data-performance-snapshot | Schema migrates without breaking existing migrations + tenant-scoped index | schema test | `npm test -- agent/schema.test.ts` | ❌ Wave 0 |
| REQ-data-metric-event | `recordMetricEvent({event, properties})` writes a row with correct tenantId, userId, createdAt | unit | `npm test -- agent/metricEvent.test.ts` | ❌ Wave 0 |
| REQ-agent-read-tools (×11) | Each tool returns tenant-scoped data only (a row from tenant B is NOT in tenant A's result) | integration | `npm test -- agent/tools/read/<toolName>.test.ts` | ❌ Wave 0 (one per tool) |
| REQ-agent-read-tools | Each tool's Zod validator rejects malformed input | unit | covered above | ❌ Wave 0 |
| REQ-agent-read-tools | Each tool's JSON Schema is `additionalProperties: false` and Anthropic-strict-compliant | unit | `npm test -- agent/tools/strict.test.ts` | ❌ Wave 0 |
| REQ-tenant-scoped-everything | ESLint custom rule fires on `prisma.driver.findMany({ where: {} })` (no tenantId) | lint test | `cd backend && npx eslint src/ --rule './eslint-rules/no-prisma-without-tenant'` | ❌ Wave 0 |
| Walking Skeleton | A "hello, agent" run: `runAgent({agentId: "chat", tenantId: 'X', userMessage: 'How many active drivers?'})` calls `liveFleetStatus` and persists an `AgentRunLog` row in <2s | smoke | `npm test -- agent/walkingSkeleton.test.ts` | ❌ Wave 0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/agent/ledger.test.ts` — covers REQ-data-agent-action
- [ ] `backend/src/__tests__/agent/memory.test.ts` — covers REQ-data-agent-memory
- [ ] `backend/src/__tests__/agent/pinnedView.test.ts` — covers REQ-data-pinned-view
- [ ] `backend/src/__tests__/agent/metricEvent.test.ts` — covers REQ-data-metric-event
- [ ] `backend/src/__tests__/agent/schema.test.ts` — schema-shape assertions
- [ ] `backend/src/__tests__/agent/tools/read/{...11 files}.test.ts` — one per read tool
- [ ] `backend/src/__tests__/agent/tools/strict.test.ts` — verifies every registered tool has `strict: true` + `additionalProperties: false` (one test, iterates the registry)
- [ ] `backend/src/__tests__/agent/walkingSkeleton.test.ts` — end-to-end "hello, agent" smoke
- [ ] `backend/eslint-rules/no-prisma-without-tenant.js` — the lint rule itself
- [ ] `backend/eslint-rules/__tests__/no-prisma-without-tenant.test.js` — meta-tests for the lint rule
- [ ] `npm run lint` script + `eslint-plugin-local-rules` (or equivalent) wiring so the custom rule loads
- [ ] `backend/package.json` test scripts updated: `"test:agent": "jest --testPathPattern=agent"`, `"lint:tenant": "eslint src/ --no-eslintrc --rulesdir eslint-rules --rule no-prisma-without-tenant:error"`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `prisma migrate dev` succeeds locally without prompting on existing dev DB | REQ-data-* (all 5 new models) | Migration ordering against the live 40+ table schema can produce false positives in mocked tests; only a real Postgres instance proves migration safety | 1) `cd backend && DATABASE_URL=$LOCAL_DB npx prisma migrate dev --name add_agent_spine` 2) inspect output for shadow-DB conflicts 3) verify all 5 new tables exist with `\d AgentAction` etc. in psql |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (full suite)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
