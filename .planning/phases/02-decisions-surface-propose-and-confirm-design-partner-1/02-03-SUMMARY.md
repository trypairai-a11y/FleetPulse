---
phase: 02-decisions-surface-propose-and-confirm-design-partner-1
plan: 03
subsystem: frontend-decisions-surface
tags: [phase-2, wave-3, decisions-ui, owner-inbox, app-router, vitest, sidebar, login-redirect, optimistic-ui]
dependency_graph:
  requires:
    - 02-00-wave-0-red-tests
    - 02-01-wave-1-spine-extensions
    - 02-02-wave-2-decisions-api
    - phase-1-shared-components
    - phase-1-auth-context
  provides:
    - decisions-inbox-page-/decisions
    - decisions-audit-page-/decisions/audit
    - decisions-permalink-page-/decisions/[id]
    - decision-card-component-CON-decisions-card-shape
    - sidebar-v2-decisions-nav-with-pending-badge
    - role-based-login-redirect
    - useAuth-login-returns-User-shape
  affects:
    - frontend/src/types/decisions.ts
    - frontend/src/lib/decisionsApi.ts
    - frontend/src/components/decisions/
    - frontend/src/app/(dashboard)/decisions/
    - frontend/src/components/layout/SidebarV2.tsx
    - frontend/src/app/login/page.tsx
    - frontend/src/contexts/AuthContext.tsx
tech_stack:
  added: []
  patterns:
    - "URL-search-param backed FilterChipStrip — selection survives reload + is shareable; useSearchParams from next/navigation drives the filter state, not React useState."
    - "Optimistic UI with eviction-tick: approved cards stay visible for the 5s undo window + 1.5s slide-out; a 1-Hz interval reaps map entries past the deadline. mergeCards(prev, fresh) preserves locally-approved-but-not-yet-server-evicted cards through the 30s poll cycle."
    - "Server-as-source-of-truth optimistic flips (T-02-17 mitigation): approve/dismiss flip the card UI immediately, but on 4xx/5xx the original snapshot is restored and an error toast surfaces. AgentAction is written ONLY by the server."
    - "Phase-2 live-tools Set in frontend (`PHASE_2_LIVE_TOOLS = new Set(['draftCourierMessage'])`) mirrors the backend constant. The Approve button binds disabled to `!card.toolIsLive` (the cardProjector emits this from the registry's PHASE_2_LIVE_TOOLS lookup) — UI never independently decides which tool is live, it just renders what the server says."
    - "scrollIntoView jsdom guard pattern — `typeof el.scrollIntoView === 'function'` short-circuit so component tests don't crash in the test env. Used in both DecisionCard.useEffect and DecisionsList list-level effect."
    - "DriverName-deduplication-render: the driver name renders as a small linked label above the headline ONLY when the headline doesn't already contain it — keeps the driver name searchable on every card without doubling-up the text on cards whose headline already starts with the name (e.g. Mohamed Khaled card from the Wave 0 RED test)."
    - "Role-based login redirect via ROLE_LANDING map. AuthContext.login + demoLogin now return the freshly-authenticated User so the login page can route by `result.role` synchronously without a render round-trip."
    - "Sub-link nav pattern in SidebarV2: NavItem.subItems renders an indented child immediately under its parent (no collapsible group needed for Phase 2's 1 sub-link). Inherits parent's role visibility through ROLE_VISIBILITY map."
key_files:
  created:
    - frontend/src/types/decisions.ts
    - frontend/src/lib/decisionsApi.ts
    - frontend/src/components/decisions/TagPill.tsx
    - frontend/src/components/decisions/EvidenceList.tsx
    - frontend/src/components/decisions/AuditRowPreview.tsx
    - frontend/src/components/decisions/FilterChipStrip.tsx
    - frontend/src/components/decisions/DecisionsEmptyState.tsx
    - frontend/src/components/decisions/DismissConfirm.tsx
    - frontend/src/components/decisions/KeyboardShortcutsHelp.tsx
    - frontend/src/components/decisions/EditDrawer.tsx
    - frontend/src/components/decisions/DecisionCard.tsx
    - frontend/src/components/decisions/DecisionsList.tsx
    - frontend/src/components/decisions/AuditEntryDetail.tsx
    - frontend/src/app/(dashboard)/decisions/layout.tsx
    - frontend/src/app/(dashboard)/decisions/page.tsx
    - frontend/src/app/(dashboard)/decisions/audit/page.tsx
    - frontend/src/app/(dashboard)/decisions/[id]/page.tsx
    - .planning/phases/02-decisions-surface-propose-and-confirm-design-partner-1/02-03-SUMMARY.md
  modified:
    - frontend/src/components/layout/SidebarV2.tsx
    - frontend/src/app/login/page.tsx
    - frontend/src/contexts/AuthContext.tsx
decisions:
  - "Tag values are CAPITALIZED — 'Warn', 'Cash reminder', 'Suspend', etc. — matching Wave 2's backend cardProjector output and the Wave 0 RED test contract verbatim. The UI-SPEC §4.5 lowercase alias was a doc inconsistency; the test (line 19, 38, 53) and Wave 2's Tag Mapping Reference are the source of truth."
  - "Decisions route group has its own layout.tsx that uses SidebarV2 (not the legacy Sidebar that the (dashboard) parent group uses). Mirrors the v2/layout.tsx pattern. This keeps the new owner-facing nav scoped to /decisions/* without touching the legacy dashboard pages."
  - "Driver name dedupe in DecisionCard. The Wave 0 RED test asserts `screen.getByText(/Mohamed Khaled/i).toBeInTheDocument()` (singular — throws on multi-match). Mock card 1 has driverName='Mohamed Khaled' AND headline='Mohamed Khaled (driver_xy12) — 3 late clock-ins this week' — rendering both as separate elements would produce 2 matches and throw. Solution: render the driverName label only when `!card.headline.includes(card.driverName)`. Cards 2 and 3 (Ali Hassan, Yousef) have driverName NOT in their headline so the label renders; card 1 skips the label and the headline carries the name."
  - "scrollIntoView guarded for jsdom. The Wave 0 test mounts the list (auto-focuses first card → useEffect → scrollIntoView call), but jsdom doesn't implement that DOM method and would throw 'cardRef.current.scrollIntoView is not a function'. Guard pattern: `typeof el.scrollIntoView === 'function'`. Production behavior is unchanged."
  - "Login redirect requires AuthContext.login to RETURN the user. The pre-existing AuthContext returned `Promise<void>`, so the login page couldn't route by role without a render round-trip. Changed login + demoLogin to return `Promise<User>`. The login page calls `landingForRole(result?.role)` synchronously. The default-context throw was added so callers see a runtime error instead of silently calling a no-op (caught by tests)."
  - "Audit log read access for ACCOUNTANT/SUPERVISOR/VIEWER per UI-SPEC §11 Q3 default. ROLE_VISIBILITY map gives all roles read access to /decisions/audit; backend's audit.ts has the same RBAC posture (Wave 2 SUMMARY confirmed). The rollback button on the audit detail drawer is gated to `useRole().isOpsManager` (which is true for ADMIN+OPS_MANAGER) so the read/write split lives in the UI as well as the API."
  - "Admin section in SidebarV2 only renders when `useAuth().user.isSuperAdmin === true`. Backend isSuperAdmin column was staged in Wave 1 but not yet returned by /api/auth/me — for now, the admin section never appears. The links 404 until Wave 5 ships /admin/onboarding + /admin/billing. Acceptable per plan."
  - "30s polling on inbox + sidebar pending-count badge are TWO independent intervals. The inbox polls listDecisions, the sidebar polls getPendingCount. Both are separate React useEffect blocks with their own cleanups so toggling pages doesn't accidentally tear down one without the other."
metrics:
  duration_minutes: 38
  completed: 2026-05-09T20:05:00Z
  tasks_completed: 3
  files_created: 17
  files_modified: 3
  commits:
    - "42e68f2 — Task 1 (types + API + 8 leaf components)"
    - "7ca8cd8 — Task 2 (DecisionCard + DecisionsList + AuditEntryDetail; Wave 0 RED test GREEN)"
    - "61387fc — Task 3 (3 routes + sidebar update + login redirect)"
---

# Phase 2 Plan 03: Wave 3 Frontend Decisions Surface Summary

**One-liner:** /decisions ships as the owner's daily landing — 12 in-tree
React components, 3 App Router routes, an updated SidebarV2 with a live
pending-count badge, and a role-based login redirect that routes ADMIN /
OPS_MANAGER / VIEWER to /decisions on sign-in. Wave 0's frontend RED test
(`DecisionsList.test.tsx`) flips from RED to GREEN, the Wave 2 backend's 13
decisions tests stay GREEN, and the production build emits all three
/decisions routes (`/decisions`, `/decisions/audit`, `/decisions/[id]`)
without TypeScript errors.

## What Was Built

Wave 3 lands the **wedge surface** — the page the owner opens before WhatsApp.
Three deliverables, each in its own commit:

### 1. Type contract + API client (commit 42e68f2)

**`frontend/src/types/decisions.ts`** mirrors the backend cardProjector output:

```ts
export type DecisionTag = 'Penalty' | 'Suspend' | 'Warn' | 'Cash reminder'
                        | 'Promote' | 'Review' | 'Other';

export interface DecisionCardData { id, tag, confidence, driverName,
  driverId, headline, reasoning, evidence, proposalDraft, toolName,
  toolIsLive, state, createdAt, approvedAt?, approvedById?,
  dismissedAt?, dismissalReason? }

export const PHASE_2_LIVE_TOOLS = new Set(['draftCourierMessage']);
export const TOOL_EDITABLE_PARAMS = {
  draftCourierMessage: ['bodyEnglish'],
  proposeCashReminder: ['bodyEnglish', 'amountKd'],
  flagForReview: [],
};
```

Audit detail types (`AgentActionRow`, `AgentActionDetail`) included so the
audit log + rollback drawer share a single source of truth.

**`frontend/src/lib/decisionsApi.ts`** — 9 typed axios wrappers built on the
shared `@/lib/api` instance:

| Function | Method + Path |
| -------- | ------------- |
| `listDecisions(params)` | GET /api/decisions |
| `getPendingCount()` | GET /api/decisions/pending-count |
| `getDecision(id)` | GET /api/decisions/:id |
| `approveDecision(id, modifications?)` | POST /api/decisions/:id/approve |
| `dismissDecision(id, reason)` | POST /api/decisions/:id/dismiss |
| `undoDecision(id)` | POST /api/decisions/:id/undo |
| `listAuditActions(params)` | GET /api/audit/agent-actions |
| `getAuditAction(id)` | GET /api/audit/agent-actions/:id |
| `rollbackAuditAction(id, reason)` | POST /api/audit/agent-actions/:id/rollback |

### 2. 12 components in components/decisions/

Built across 2 commits. **Leaf components** (commit 42e68f2) — pure
presentation, no API calls:

- `TagPill.tsx` — 7-color static map per UI-SPEC §3.1.2 Tag Colour Map.
  22px tall, font-semibold, 11px text, dot + label, role="status" so
  screen readers announce "{tag} proposal".
- `EvidenceList.tsx` — Lucide icon per evidence type (shift→Calendar,
  violation→AlertTriangle, cashRecord→Wallet, order→Package, gps→MapPin,
  note→StickyNote) + label + 8-char entityId chip. Empty list renders
  "No evidence linked yet" italic muted.
- `AuditRowPreview.tsx` — In-tree JSON tokeniser (no library) that walks
  `JSON.stringify(payload, null, 2)` output and tags each token as
  key/string/number/bool/punct/ws. Coloured per UI-SPEC §7.3 (keys
  foreground, strings primary forest green, numbers/bools forest-700,
  punctuation sand-700). max-h-60 + overflow-y-auto.
- `FilterChipStrip.tsx` — URL-search-param-backed single-select chips.
  AA-compliant 32px tall (UI-SPEC §6 touch-target note bumped from spec's
  28px). Active chip `bg-foreground text-white`; counts in tabular-nums.
- `DecisionsEmptyState.tsx` — Two flavours: filtered ("No {filter} cards.
  Try All." with clear button) vs unfiltered ("Nothing for you right now.
  The agent is still learning your fleet." with Open Ask Darb button).
- `DismissConfirm.tsx` — 4 preset reasons (Phone repair / known absence,
  Driver already addressed, False positive — agent over-eager, Other) +
  free-text textarea shown only when "Other" is selected. Submit disabled
  until reason picked. 280-char counter on the Other textarea.
- `KeyboardShortcutsHelp.tsx` — `?`-triggered modal listing all 8
  shortcuts with `<kbd>` chips per UI-SPEC §3.1.3.
- `EditDrawer.tsx` — SlidePanel-wrapped drawer that reads
  TOOL_EDITABLE_PARAMS for the card's toolName and renders one input per
  param (textarea for bodyEnglish with 500-char limit, KD-prefix number
  input for amountKd with 3-decimal step). Diffs against
  `card.proposalDraft.args` and emits only the changed keys to onSave.

**Composite components** (commit 7ca8cd8):

- `DecisionCard.tsx` — The hero. Renders all UI-SPEC §3.1.2 regions: tag
  pill, confidence percentage, training-only chip on Phase-8 tools, focus
  shortcut hint, driver name link (Phase 3 placeholder alert),
  90-char-truncated headline, line-clamp-2 reasoning with click-to-expand,
  Show evidence + Audit-row preview disclosures, 3-button action footer.
  Cmd+Enter / Cmd+E / Cmd+D shortcuts wired with form-field-focus and
  modal-open guards. Approved + dismissed state branches per UI-SPEC
  §3.1.5 (approved → primary/5 bg + Undo link; dismissed → opacity-60
  with reason).
- `DecisionsList.tsx` — Container. Arrow / j / k / Cmd+1..9 / Cmd+Enter
  focus management at the list level (mirrors the per-card listener so
  the Wave 0 test, which fires keydown on `window`, hits the right
  handler). 5-skeleton loading state. Empty-state delegated. Auto-focuses
  first card on mount.
- `AuditEntryDetail.tsx` — SlidePanel with 7 sections per UI-SPEC §3.2.3
  (header / timing / original proposal / modifications diff / reasoning /
  outcome / subject link). Rollback button visible only when
  `canRollback && outcome==='success' && !rolledBackAt &&
  toolName==='draftCourierMessage'`. Confirm flow opens a textarea
  beneath the ConfirmModal where the user records the rollback reason.

### 3. 3 App Router routes + Sidebar + Login redirect (commit 61387fc)

**`(dashboard)/decisions/layout.tsx`** — Uses SidebarV2 + Header +
AskDarbPalette via dynamic import. Mirrors the existing v2/layout.tsx
pattern.

**`(dashboard)/decisions/page.tsx`** — Owner inbox at `max-w-[760px]`:
- 30-second `setInterval` poll on `listDecisions({status:'pending', filter, sort, limit:25})`.
- mergeCards(prev, fresh, approvedAt) preserves locally-approved cards
  through the poll cycle (within the eviction window) and folds in fresh
  pending cards from the server.
- Eviction tick (1 Hz) drops approved cards 1.5s past the 5s undo
  deadline (5s + 1.5s = 6.5s after click).
- Optimistic approve/dismiss/undo with full snapshot rollback on 4xx/5xx
  + error toast.
- `?` key toggles KeyboardShortcutsHelp.
- EditDrawer Save → approve(modifications) → close drawer.
- Filter + sort changes write to URL search params via
  `router.replace`, so refreshing or sharing the URL preserves view
  state.

**`(dashboard)/decisions/audit/page.tsx`** — `max-w-7xl` log:
- 5 FilterBar filters (date range from/to, toolName, outcome,
  subjectType).
- DataTable with columns: Time / Tool / Subject (truncated) / Approver
  (truncated) / Outcome (color chip).
- Row click opens AuditEntryDetail SlidePanel via getAuditAction.
- Rollback flow gated to `useRole().isOpsManager`.

**`(dashboard)/decisions/[id]/page.tsx`** — `max-w-2xl` permalink:
- Server-fetches the card via getDecision(id).
- 404 → ErrorState with Retry.
- Renders a single DecisionCard (`focused=true, index=0`) with the same
  approve/edit/dismiss/undo flow as the inbox.
- "View in audit log →" link appears once the card is no longer pending.

**`SidebarV2.tsx`** modifications:
- New `Decisions` nav item at the top with Inbox icon + live pending-count
  badge polled from `/api/decisions/pending-count` every 30s. Red pill
  shows when count > 0.
- New `Audit` sub-link with History icon, rendered indented under
  Decisions. Inherits parent's role visibility.
- Existing 7 nav items (Command Centre / Drivers / Dispatch / Orders /
  Triage / Money / Intelligence) preserved in the same relative order,
  just shifted one row down. Hide-behind-flag is Phase 10's job.
- Admin footer section (Onboarding + Billing) only renders when
  `useAuth().user.isSuperAdmin === true`. The /admin/* pages 404 until
  Wave 5 ships them.
- Role visibility map updated so SUPERVISOR / ACCOUNTANT / VIEWER all
  see the Audit log read-only per UI-SPEC §11 Q3 default.

**Login redirect** (login/page.tsx + AuthContext.tsx):
- `ROLE_LANDING` table maps role → post-auth path.
  | Role | Lands on |
  | ---- | -------- |
  | ADMIN | /decisions |
  | OPS_MANAGER | /decisions |
  | VIEWER | /decisions |
  | SUPERVISOR | /v2/triage (unchanged) |
  | ACCOUNTANT | /v2/money (unchanged) |
- `AuthContext.login` + `demoLogin` now return `Promise<User>` so the
  login page can route synchronously by role.

## Test File Status at End of Wave 3

| Test File | Status at Wave 3 End | Wave 2 End |
| --------- | -------------------- | ---------- |
| `frontend/decisions/DecisionsList.test.tsx` | GREEN (3/3) | RED (module-404) |
| `decisions/cardProjector.test.ts` | GREEN (preserved, 4/4) | GREEN |
| `decisions/approveFlow.test.ts` | GREEN (preserved, 6/6) | GREEN |
| `decisions/dismissFlow.test.ts` | GREEN (preserved, 3/3) | GREEN |
| Wave 0/1/2 baseline (14 agent + middleware suites) | GREEN (preserved) | GREEN |

**Aggregate (frontend Phase 2 only):** 1/1 suite, 3/3 tests GREEN —
flipped from "1 failed (1)" at end of Wave 2.

**Aggregate (backend full suite):** Unchanged from Wave 2 — 26/31 suites
passing, 5 still RED for the planned-for-later-waves billing/onboarding
files. 177 tests passing, zero regressions.

**Out-of-scope frontend test failures:** The 16 pre-existing
`formatters.test.ts` + `StatusBadge.test.tsx` failures from the Sierra
design-token migration (`bg-gray-*` → `bg-sand-*`) remain RED. These were
documented in Wave 0's SUMMARY as out-of-scope and were not caused by
this plan.

## Verification Commands

```bash
cd frontend
npx vitest run src/__tests__/decisions/DecisionsList.test.tsx
                         # → 3/3 GREEN
npx tsc --noEmit         # 0 errors in src/* (pre-existing .next/types/* are build cache, not source)
npm run build            # builds /decisions, /decisions/audit, /decisions/[id] routes successfully

cd ../backend
npx jest --testPathPatterns='decisions'
                         # → 13/13 GREEN (cardProjector + approveFlow + dismissFlow)
```

## Component Inventory (Phase 2 Decisions Surface)

```
frontend/src/types/decisions.ts                    [type contract]
frontend/src/lib/decisionsApi.ts                   [9 axios wrappers]
frontend/src/components/decisions/
  ├── TagPill.tsx                                  [tag chip, 7 colors]
  ├── EvidenceList.tsx                             [evidence rows]
  ├── AuditRowPreview.tsx                          [JSON syntax-coloured]
  ├── FilterChipStrip.tsx                          [URL-backed chips]
  ├── DecisionsEmptyState.tsx                      [filtered + unfiltered]
  ├── DismissConfirm.tsx                           [4 reasons + Other]
  ├── KeyboardShortcutsHelp.tsx                    [? modal]
  ├── EditDrawer.tsx                               [param-driven drawer]
  ├── DecisionCard.tsx                             [hero card]
  ├── DecisionsList.tsx                            [list + focus mgmt]
  └── AuditEntryDetail.tsx                         [audit drawer]
frontend/src/app/(dashboard)/decisions/
  ├── layout.tsx                                   [SidebarV2 layout]
  ├── page.tsx                                     [owner inbox]
  ├── audit/page.tsx                               [audit log]
  └── [id]/page.tsx                                [permalink]
```

## Sidebar Diff

| Position | Before Wave 3 | After Wave 3 |
| -------- | ------------- | ------------ |
| 1 | Command Centre | **Decisions** (with pending badge) |
| 1.1 | — | **Audit** (sub-link under Decisions) |
| 2 | Drivers | Command Centre |
| 3 | Dispatch | Drivers |
| 4 | Orders | Dispatch |
| 5 | Triage | Orders |
| 6 | Money | Triage |
| 7 | Intelligence | Money |
| 8 | (Settings, footer) | Intelligence |
| Footer | Settings (when canManageSettings) | **Admin** (Onboarding / Billing — super-admin only) → Cmd+K hint → Settings |

## Keyboard Shortcut Map (UI-SPEC §3.1.3)

| Key | Action |
| --- | ------ |
| ⌘ + Enter | Approve focused card (no-op when toolIsLive=false) |
| ⌘ + E | Open Edit drawer (no-op when editableParams is empty) |
| ⌘ + D | Open Dismiss confirm |
| ↓ / j | Move focus to next card |
| ↑ / k | Move focus to previous card |
| ⌘ + 1..9 | Jump focus to card N |
| Esc | Close drawer / dialog |
| ? | Toggle keyboard shortcuts help |

All shortcuts are guarded against form-field focus (input/textarea/select/
contenteditable) and don't fire while a dismiss confirm modal is open.

## Polling Cadence

| Surface | Interval | API |
| ------- | -------- | --- |
| /decisions inbox refresh | 30s | listDecisions |
| Sidebar pending-count badge | 30s | getPendingCount |
| Sidebar triage queue badge (preserved from Phase 1) | 30s | /api/queue/counts |
| /decisions inbox eviction tick (approved-card cleanup) | 1s | (in-memory only) |

## Hand-off Note for Wave 4

Wave 4's first act:

1. **Build `backend/src/routes/admin/onboarding.ts`** + **`billing.ts`**
   gated behind `requireSuperAdmin` (Wave 1 already shipped the
   middleware). Endpoints needed for the wizard:
   - `POST /api/admin/onboarding/tenants` — create Tenant + initial
     owner User.
   - `POST /api/admin/onboarding/tenants/:id/couriers/import` — reuse
     keeta/import pattern.
   - `POST /api/admin/onboarding/tenants/:id/platform-credentials` —
     stores encrypted credentials.
   - `POST /api/admin/onboarding/tenants/:id/run-backwash` — enqueues a
     BullMQ job; returns `jobId`.
   - `GET /api/admin/onboarding/tenants/:id/backwash-status?jobId=…` —
     polling endpoint for the wizard step.
   - `GET /api/admin/onboarding/tenants/:id/report` — renders Darb's
     read on your fleet data.
   - `POST /api/admin/onboarding/tenants/:id/start-trial` — flips
     `tenant.designPartner = true`, `trialEndsAt = now+14d`,
     `monthlyOverrideKd = 100`.
   - Billing routes per UI-SPEC §8.4.

2. **Build `backend/src/services/onboarding/onboardingBackwashWorker.ts`**
   + **`onboardingReport.ts`** + **`backend/src/services/billing/
   billingService.ts`**. Wave 0 RED tests for these flip GREEN.

3. **Build `frontend/src/app/(dashboard)/admin/onboarding/page.tsx`** +
   the 5-step wizard components per UI-SPEC §3.4. Reuse the existing
   keeta CSV/XLSX import drag-drop pattern for Step 2.

4. **Build `frontend/src/app/(dashboard)/admin/billing/page.tsx`** +
   `[tenantId]/page.tsx` per UI-SPEC §3.5.

5. **Add `isSuperAdmin` to /api/auth/me response.** The Wave 1 schema
   added `User.isSuperAdmin` but the Phase-1 auth route doesn't yet
   include it in the `/api/auth/me` response. SidebarV2 reads
   `user.isSuperAdmin` and only renders the Admin section when truthy —
   so until /api/auth/me ships the flag, the Admin section never
   appears. One-line fix in `backend/src/routes/auth.ts` /me handler.

6. **Wave 0 RED test for `DarbsReadReport.test.tsx`** turns GREEN once
   the report component ships.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] cardRef.current.scrollIntoView is not a function**

- **Found during:** Task 2 — running the Wave 0 RED test (DecisionsList.test.tsx).
- **Issue:** jsdom (the Vitest test env) doesn't implement
  `Element.scrollIntoView`. DecisionCard's auto-scroll on focus useEffect
  threw `TypeError: cardRef.current.scrollIntoView is not a function`
  during the test's first render, masking the actual assertion failures.
- **Fix:** Guard pattern `typeof el.scrollIntoView === "function"`
  applied in BOTH DecisionCard.tsx (per-card) and DecisionsList.tsx
  (list-level). Production behavior unchanged; tests now run cleanly.
- **Files modified:** DecisionCard.tsx, DecisionsList.tsx.
- **Commit:** Folded into 7ca8cd8 (Task 2).

**2. [Rule 1 - Bug] driverName matched twice in getByText("Mohamed Khaled")**

- **Found during:** Task 2 — first Wave 0 test execution.
- **Issue:** Initial render put `card.driverName` as a separate label
  AND also inside the headline. Mock card 1 has `driverName="Mohamed
  Khaled"` and `headline="Mohamed Khaled (driver_xy12) — 3 late clock-ins
  this week"` — both contained "Mohamed Khaled" so `screen.getByText(
  /Mohamed Khaled/i)` matched 2 elements and threw
  `TestingLibraryElementError: Found multiple elements`.
- **Fix:** Render the driverName label only when the headline doesn't
  already contain it: `{card.driverName &&
  !card.headline.includes(card.driverName) && (<a>...)}`. Keeps the
  driver name searchable on every card without doubling-up text on
  cards whose headline already starts with the name.
- **Files modified:** DecisionCard.tsx.
- **Commit:** Folded into 7ca8cd8 (Task 2).

**3. [Rule 3 - Blocking] AuthContext.login returned `Promise<void>` so the login page couldn't route by role**

- **Found during:** Task 3 — wiring the role-based redirect.
- **Issue:** The pre-Wave-3 AuthContext.login signature was
  `(email, password) => Promise<void>`. The login page needed to know
  the resolved User's role to pick a destination. Reading `user` from
  the context after `await login(...)` is racy — the state update
  hasn't flushed yet — and would cause a flash of the wrong destination
  before the next render.
- **Fix:** Changed login + demoLogin to return `Promise<User>` so the
  login page can call `landingForRole(result.role)` synchronously after
  await. Default-context implementations now throw "AuthContext not
  initialised" so callers see a runtime error if the provider tree is
  broken (no silent no-op).
- **Files modified:** AuthContext.tsx, login/page.tsx.
- **Commit:** Folded into 61387fc (Task 3).

### Rule 4 (architectural) — None

No architectural changes. Wave 3 ships pure UI on top of Wave 2's API +
existing shared components.

## Skipped Per Orchestrator Direction

The plan's `<task type="checkpoint:human-verify">` (the morning-ritual
visual sign-off) was skipped per the orchestrator's instruction:
"Skip the plan's human-verify smoke checkpoint at the end — user will
smoke-test after deploy. Continue past the checkpoint after writing
SUMMARY." The deferred verification points are:

1. Sign in as ADMIN → land on /decisions (URL bar check).
2. Cards render with coloured tag pills + driver name + headline +
   2-line reasoning.
3. Approve a draftCourierMessage card → optimistic flip + 5s undo
   toast → AgentAction row written with proposer="Darb",
   approverId=user, in DB.
4. Approve a Phase-8 (Suspend / Penalty) card → button disabled with
   tooltip "Action tool ships in Phase 8 — your approval is recorded
   for training".
5. Edit flow → drawer opens with bodyEnglish prefilled → save →
   AgentAction.modificationsBeforeApproval is non-null in DB.
6. Dismiss flow → 4-reason confirm → AgentMemory key
   `dismissed:{tool}:{Driver}:{driverId}` written.
7. Undo within 5s → AgentAction.outcome flips to "rolled_back".
8. Keyboard nav (↓/↑/⌘+Enter/⌘+D) all work.
9. Sidebar badge shows pending count, polled every 30s.
10. /decisions/audit DataTable + row click → SlidePanel detail.
11. /decisions/[id] permalink renders single card at max-w-2xl.
12. Empty state copy with filter applied.
13. Two-tab conflict edge case (poll reconciliation after another tab
    approves the card).

## Threat Model Compliance

| Threat | Mitigation Status |
| ------ | ----------------- |
| T-02-17 — Client-side optimistic state could mark cards approved without server confirmation | DONE — Optimistic UI is presentation-only. On server 4xx/5xx, the original snapshot is restored from a closure-captured `original` object and an error toast surfaces. The 30s poll reconciles any drift. AgentAction is written ONLY by the server. |
| T-02-18 — /decisions/[id] permalink leak | DONE — Backend's tenantScope middleware enforces 403 on cross-tenant access (Wave 2). cuid() permalink IDs are non-sequential — guess-attack infeasible. The frontend never embeds the tenantId in the URL. |
| T-02-19 — Cmd+Enter shortcut triggered by malicious script in courier-supplied free-text | ACCEPTED — All courier-supplied text in proposals is rendered via React (auto-escaped); no `dangerouslySetInnerHTML` used in DecisionCard or any descendant. XSS-via-headline is not a vector. |
| T-02-20 — Sidebar pending-count badge polled every 30s could leak across tenants on shared workstations | DONE — JWT cookie is httpOnly + tenant-bound. Logout clears the JWT and the badge stops polling on next tick. No tenant ID embedded in the URL. |

## Threat Flags

None — Wave 3 ships UI on top of the Wave 2 backend's
already-tenant-scoped routes. No new HTTP surfaces, no new outbound
integrations, no new schema changes, no new secrets. The 30s polling on
both the inbox and sidebar uses the existing axios instance with the
existing JWT-cookie auth.

## Self-Check: PASSED

Verified all 17 created files exist + 3 modified files updated + all 3
commits are reachable:

```
FOUND: frontend/src/types/decisions.ts
FOUND: frontend/src/lib/decisionsApi.ts
FOUND: frontend/src/components/decisions/TagPill.tsx
FOUND: frontend/src/components/decisions/EvidenceList.tsx
FOUND: frontend/src/components/decisions/AuditRowPreview.tsx
FOUND: frontend/src/components/decisions/FilterChipStrip.tsx
FOUND: frontend/src/components/decisions/DecisionsEmptyState.tsx
FOUND: frontend/src/components/decisions/DismissConfirm.tsx
FOUND: frontend/src/components/decisions/KeyboardShortcutsHelp.tsx
FOUND: frontend/src/components/decisions/EditDrawer.tsx
FOUND: frontend/src/components/decisions/DecisionCard.tsx
FOUND: frontend/src/components/decisions/DecisionsList.tsx
FOUND: frontend/src/components/decisions/AuditEntryDetail.tsx
FOUND: frontend/src/app/(dashboard)/decisions/layout.tsx
FOUND: frontend/src/app/(dashboard)/decisions/page.tsx
FOUND: frontend/src/app/(dashboard)/decisions/audit/page.tsx
FOUND: frontend/src/app/(dashboard)/decisions/[id]/page.tsx
MODIFIED: frontend/src/components/layout/SidebarV2.tsx (Decisions nav + pending badge + Admin section)
MODIFIED: frontend/src/app/login/page.tsx (ROLE_LANDING redirect map)
MODIFIED: frontend/src/contexts/AuthContext.tsx (login/demoLogin return User)
FOUND COMMIT: 42e68f2 (Task 1 — types + API + 8 leaf components)
FOUND COMMIT: 7ca8cd8 (Task 2 — DecisionCard + DecisionsList + AuditEntryDetail; Wave 0 RED test GREEN)
FOUND COMMIT: 61387fc (Task 3 — 3 routes + sidebar update + login redirect)
```
