# Deferred Items — Phase 4 (chat-generative-ui-websocket)

Pre-existing failures discovered during execution but out of scope per the
deviation rules SCOPE BOUNDARY ("Only auto-fix issues DIRECTLY caused by the
current task's changes").

## Backend

### `src/__tests__/agent/tools/tenantIsolation.test.ts` — 11 failures

- **Discovered:** Wave 4 (04-04) final verification (`npm test`).
- **Status:** Pre-existing — last touched by commit `36fff73`
  ("refactor(01-04): gpsTrack uses driver-relation filter instead of cast-away tenantId").
- **Why deferred:** Failures predate Wave 4 and are unrelated to
  PinnedViews routes / Chat surface. Wave 4 only added
  `backend/src/routes/pinnedViews.ts` and one server.ts mount line — nothing
  in the failing test suite's tenant-isolation paths overlaps.
- **Recommended owner:** Phase 1 follow-up or future tenant-isolation hardening pass.

## Frontend

### `src/__tests__/scheduled-jobs/ScheduledBriefingsList.test.tsx`

- **Discovered:** Wave 3 (per the prior SUMMARY).
- **Status:** Wave 0 RED scaffold with intentional placeholder syntax; carried
  forward in `.eslintignore` until Wave 5 ships ScheduledBriefingsList.
- **Why deferred:** Component lands in Wave 5 per the phase plan; replacing the
  RED scaffold here would require building the not-yet-planned component.
