# Phase 1 Deferred Items

Items discovered during phase execution that are out-of-scope for the
current work but should be tracked.

## DI-01-01: Lint:tenant scope kept narrow due to 184 pre-existing violations

**Discovered during:** Wave 4 Task 4.3 (broaden lint:tenant to src/)

**Issue:** Running the broadened `lint:tenant` against all of `src/` surfaces
**184 pre-existing tenant-scoping violations** spread across **35 files** —
nearly every API route and many services. Examples:

- `src/routes/talabat.ts`: 27 violations across talabatSession queries
- `src/routes/keeta.ts`: numerous violations on driver, shift, orderLog
- `src/routes/vehicles.ts`: 6 violations on vehicle queries
- `src/services/aiInsightsEngine.ts`: 3 driver.findMany calls without tenantId
- `src/services/violationEngine.ts`: device + driver lookups without scoping

These are NOT introduced by Phase 1 work — the violations existed before
Wave 0 and were hidden because lint:tenant was scoped to `src/agent/` from
Wave 0 onward.

**Why deferred:** Fixing 184 violations across 35 files requires non-trivial
analysis per call (some are legitimate global queries that need
`// eslint-disable-next-line` comments; others are real bugs that need
`tenantId: ctx.tenantId` added). This is multi-day work that falls outside
the Phase 1 close-out scope.

**Wave 4 final scope:** `lint:tenant` covers
`src/agent/` + `src/__tests__/agent/` + `src/routes/aiChiefOfStaff.ts` +
`src/routes/ai.ts` — i.e., the agent module + Phase 1 refactored routes. The
rule prevents NEW agent-touching code from regressing; pre-existing
violations are out of scope for this phase.

**Tracker:** Phase 11 (the "agent matures, full memory + WORM" phase per
ROADMAP) should include a "tenant-scope hygiene" plan to triage and fix
the 184 violations. Possible plan structure:

1. Run `npm run lint:tenant -- src/` (broadened ad-hoc)
2. For each file: triage violations as
   - **REAL**: add `tenantId` to where clause
   - **FALSE POSITIVE**: add `// eslint-disable-next-line no-prisma-without-tenant -- justification`
3. Re-broaden the npm script to `src/`
4. CI gate on `npm run lint:tenant` exit 0

**Reference:** Wave 0 SUMMARY explicitly documented this as deferred:
> "Pre-existing Lint Violations (deferred to Wave 4) ... A scan was NOT
> performed against the full tree to keep the Wave 0 acceptance gate clean."

Wave 4's scan revealed 184 violations across 35 files — too broad for a
close-out wave. Re-deferred to Phase 11.

## DI-01-02: Migration history defect — PlatformSettings + Notification have no CREATE TABLE migration

**Discovered during:** Wave 4 Task 4.1 (`prisma migrate dev`)

**Issue:** Two existing tables (`PlatformSettings`, `Notification`) exist
in the dev DB and schema.prisma but have no `CREATE TABLE` migration in
`prisma/migrations/`. The earliest migrations that reference them only
contain `ALTER TABLE` statements. Most likely cause: someone ran
`prisma db push` against an empty DB before formal migrations existed,
then started adding migrations on top.

**Symptom:** `prisma migrate dev` (which rebuilds the shadow DB from scratch
to compute the diff) fails with P3006 "underlying table does not exist"
when ALTER TABLE hits a non-existent table.

**Wave 4 workaround:** Used `prisma db push` to apply the new agent-spine
schema directly to the dev DB, then hand-crafted
`20260509180000_add_agent_spine_models/migration.sql` with `IF NOT EXISTS`
guards, marked it as applied via `prisma migrate resolve --applied`. This
gives us:
- A real migration file (so production deploy via `migrate deploy` works)
- The 5 new tables in the dev DB
- Idempotent SQL (re-running it is a no-op)

**What's still broken:** Future devs running `prisma migrate dev` from a
fresh checkout will hit the same shadow-DB error. This affects new dev
environment setup but not production.

**Tracker:** Phase 11 or whoever owns DB tooling should:
1. Identify the exact CREATE TABLE statements for PlatformSettings + Notification (already exists in dev DB; can be dumped via `pg_dump --schema-only`).
2. Either:
   - Prepend CREATE TABLE IF NOT EXISTS statements to the existing ALTER migrations (least invasive), OR
   - Create a "baseline" migration that consolidates the schema state (cleaner long-term but requires `migrate resolve --applied` for ALL existing dev DBs).
3. Verify `prisma migrate dev --create-only` works on a fresh DB.
