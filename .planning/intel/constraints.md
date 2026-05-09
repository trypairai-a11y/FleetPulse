# Constraints

Constraints extracted from `PRD_Darb_v2.md`. No SPEC documents were ingested in this run; entries below are constraint-shaped statements lifted from the PRD (status: proposed) so downstream planners can promote them to formal SPEC entries when needed.

---

## CON-stack-backend-pinned

- source: PRD_Darb_v2.md (sections 7.1, 8 tech-stack table)
- type: nfr
- statement: Backend stack is fixed as Express 4 + TypeScript + Prisma 5 (PostgreSQL 15) + Redis 7 + BullMQ. JWT auth (15-min access + 7-day refresh cookies) + RBAC + tenant scoping middleware preserved. SSE for notifications.

## CON-stack-frontend

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- type: nfr
- statement: Frontend stays on Next.js 14 + Tailwind + Shadcn. Page count drops from 80+ to ~5 + chat surface.

## CON-stack-mobile

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- type: nfr
- statement: Mobile stays on Expo 52, with always-on GPS and the agent inbox added.

## CON-stack-agent-runtime

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- type: nfr
- statement: Agent runtime uses Anthropic Claude Sonnet 4.6 via the Anthropic SDK, organised into a dedicated `agent/` module (tool registry, action ledger, memory, pinned views, rules).

## CON-realtime-protocols

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- type: protocol
- statement: SSE for notifications (existing). Add WebSocket for agent streaming (chat tokens) and live floor map subscriptions.

## CON-tenant-scope-everywhere

- source: PRD_Darb_v2.md (sections 6.2, 7.1)
- type: nfr
- statement: All agent read tools and action tools are tenant-scoped. The existing `tenantScope` middleware pattern is mandatory for every new route.

## CON-action-confirm-card

- source: PRD_Darb_v2.md (sections 4 principle 4, 6.3, 6.4 v1)
- type: protocol
- statement: Every action tool emits a confirm card. The card must include: the proposed action, the affected entity (driver / shift / cash row), the agent's reasoning, and Approve / Modify / Dismiss buttons. The action does not fire until Approve is clicked. v1 has no exceptions.

## CON-audit-row-shape

- source: PRD_Darb_v2.md (section 6.3 final paragraph)
- type: schema
- statement: Every fired action writes a row to `AgentAction` with the following fields:
  - proposer (always "Darb")
  - approver (the human user id)
  - originalProposal (the agent's first draft)
  - modificationsBeforeApproval (diff from the human's edits, if any)
  - outcome (success/failure/rolled-back)
  - reasoning (the agent's natural-language justification)
  - audit log is the training corpus for future agent runs.

## CON-driver-file-sections

- source: PRD_Darb_v2.md (section 5.5)
- type: api-contract (UI contract)
- statement: The Driver File page must expose, at minimum: Profile, Live status + today's orders, Performance score with 90-day trend, Violations history, Cash history, Attendance and shifts, Agent's running notes, Decision audit log.

## CON-floor-counters

- source: PRD_Darb_v2.md (section 5.2)
- type: api-contract (UI contract)
- statement: The Floor page must expose three pill counters at the top: Scheduled-not-online, GPS-stale (>10 min), Order-rejection ×3+. Each counter is clickable and filters the map.

## CON-floor-dot-colors

- source: PRD_Darb_v2.md (section 5.2)
- type: api-contract (UI contract)
- statement: Driver dots on the Floor map are colour-coded: green (working), grey (idle), red (GPS-stale), blue (scheduled-not-online). Each dot also carries a platform-colour tag.

## CON-decisions-card-shape

- source: PRD_Darb_v2.md (section 5.1)
- type: api-contract (UI contract)
- statement: A Decisions card has: a coloured tag (Suspend / Cash reminder / Promote / Warn), driver name + headline, two-line agent reasoning, and three buttons — Approve, Modify, Dismiss. No KPI strip on this page.

## CON-cash-platform-coverage

- source: PRD_Darb_v2.md (section 5.6)
- type: api-contract
- statement: Finance → Cash workbench covers Keeta, Talabat, Deliveroo only. Americana is excluded because it has no driver cash flow.

## CON-bilingual-outbound

- source: PRD_Darb_v2.md (sections 1, 4 principle 7, 6.1)
- type: nfr
- statement: All outbound courier-facing communications (WhatsApp, SMS) must be drafted bilingual (English + Arabic). Owner-facing UI remains English-only in v1; full RTL is deferred to Y2.

## CON-non-goals-12-months

- source: PRD_Darb_v2.md (sections 2, 12)
- type: nfr (scope guardrail)
- statement: For 12 months we will NOT build:
  - drivers as a payment platform
  - a courier-facing super-app
  - direct integration with end-customer-facing apps
  - a second mobile app for the owner (web suffices)
  - direct payment processing
  - customer-facing features
  - a courier marketplace
  - replacements for partner platform consoles for non-fleet ops
  - a voice interface to the agent (Phase 2)
  - mobile-first chat (chat is desktop-primary)
  - self-serve signup (until 10 customers)

## CON-mobile-gps-ux

- source: PRD_Darb_v2.md (section 7.4)
- type: nfr
- statement: Mobile always-on GPS must be implemented with explicit attention to battery consumption and permission flows. Treated as a UX deliverable, not a checkbox.

## CON-scraper-replaceable

- source: PRD_Darb_v2.md (section 7.3)
- type: protocol
- statement: All Keeta / Talabat partner-portal scrapers must sit behind a swappable adapter interface. Replacing a scraper with an XLSX importer (or, eventually, a partner API) must require zero changes outside the adapter module.

## CON-xlsx-fallback

- source: PRD_Darb_v2.md (section 7.3)
- type: api-contract
- statement: Every platform that has a scraping ingest pathway must also have an XLSX-import fallback route. The existing Keeta `POST /import` route is the reference implementation pattern.

## CON-rate-limits-v2-autonomy

- source: PRD_Darb_v2.md (section 6.4 v2)
- type: nfr
- statement: When v2 autonomy ships (months 6–12), the three auto-executable action classes (routine pings, scheduled reminders, GPS-stale notifications) must enforce rate limits AND per-tenant caps. Money/HR-touching actions remain propose-and-confirm.

## CON-pricing-model

- source: PRD_Darb_v2.md (section 10)
- type: nfr (commercial)
- statement: Per-courier pricing model: KD 2 / active courier / month with a KD 200 minimum. Billing aligned to active courier count per tenant per month.

## CON-onboarding-format

- source: PRD_Darb_v2.md (section 10)
- type: nfr (process)
- statement: V1 onboarding is white-glove: 30 days of data ingested at the start; founder produces a "Darb's read on your fleet" report; 14-day free trial; 1 hour of founder onboarding included; no self-serve until 10 customers.

## CON-engineer-allocation-assumption

- source: PRD_Darb_v2.md (section 13 question 4)
- type: nfr (planning assumption)
- statement: The 12-month roadmap assumes ~3 backend, ~2 frontend, 1 mobile, 1 ML/AI engineer allocation. If actual skew differs, the roadmap shifts. Flagged as a founder-gated open question.
