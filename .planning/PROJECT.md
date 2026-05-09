# Darb

## What This Is

Darb is the AI ops chief for delivery fleet owners in the Gulf — Kuwait first. It replaces the WhatsApp group + Excel sheet that fleet owners currently use to manage 80–300 couriers across Keeta, Talabat, Deliveroo, and Americana. The product surface is one agent that proposes actions, one chat that generates dashboards on demand, and one live floor for the dispatcher — backed by an Expo mobile app that gives Darb cross-platform GPS no single delivery platform has.

This v2 PRD is a deliberate pivot from a shipped multi-platform fleet dashboard (80+ pages) to an AI-agentic product (~5 pages + chat surface). Existing backend foundations (40+ Prisma models, JWT/RBAC/tenant-scope middleware, BullMQ workers, SSE notifications, Anthropic-backed services) are preserved. Most existing frontend pages move behind a feature flag in Q2 and remain resurrectable.

## Core Value

**Replace the fleet owner's WhatsApp + Excel chaos with an AI that runs their fleet's performance for them, in 20 minutes a day — by proposing actions a human approves with one click, never firing actions on its own in v1.**

If everything else fails, propose-and-confirm with a clean audit log must work. The agent earns trust per action class; the audit log is the product over time.

## Personas (one product, three lenses)

- **Owner / GM** — primary buyer, primary daily user. Lands on **Decisions** (proposal inbox). Wants leverage and clarity. Decides hires, fires, expansions.
- **Ops manager / dispatcher** — daily user, glance-mode. Lands on **Floor** (live map). Will reject a chat-only product. Needs watchtowers.
- **Accountant** — heavy weekly user. Lands on **Finance → Cash**. Reconciles cash, processes payroll, applies deductions for violations. Spreadsheet brain.

Design intent: agent for the owner, watchtower for the dispatcher, focused workspace for the accountant.

## ICP

Fleet operators in Kuwait running 80–300 couriers across two or more of {Keeta, Talabat, Deliveroo, Americana}. Profit-thin, ops-heavy, currently coordinated via WhatsApp groups + Excel + per-platform partner portals.

## 12-Month Goal

8–12 paying fleets in Kuwait, KD 6–10k MRR, design-partner depth on at least 3 of them. Owner opens Darb daily before opening WhatsApp.

## Product Principles (re-derivation rules)

When a decision comes up, derive from these (verbatim from PRD section 4):

1. **Clarity over completeness.** A correct answer to one question beats a comprehensive page that buries the question.
2. **Action is the moat, not analytics.** Anything that ends in a chart is a feature; anything that ends in an action a human approves is a product.
3. **The watchtower exists; everything else is generative.** Pre-build only the surfaces a dispatcher must glance at. Everything else is rendered by the agent on demand.
4. **Propose-and-confirm is the default autonomy.** No agent action against the world without one human click. Non-negotiable in v1.
5. **Trust is earned per action class.** First we earn the right to draft messages. Then to apply penalties. Then to schedule shifts. Don't ship the firing button on day one.
6. **Cross-platform unification is the default view.** Single-platform views are special cases.
7. **Owner reads English, courier reads Arabic.** UI English-first; outbound courier comms drafted bilingual.

## Requirements

### Validated

(None yet — pivot is pre-revenue. Existing v1 dashboard shipped but is being deprecated behind a feature flag in Q2; treat it as legacy, not validated v2 scope.)

### Active

See `.planning/REQUIREMENTS.md` for the full 33-requirement list with REQ-IDs. The 14 surfaces are:

- Decisions (1 req) — owner proposal inbox
- Floor (1 req) — live map
- Chat (4 reqs) — global access, generated dashboards, action proposals, scheduled jobs
- Operations (1 req) — per-platform sub-pages
- Driver File (1 req) — canonical per-driver page
- Finance (4 reqs) — Cash, Payroll, Invoices, Expenses & P&L
- HR (3 reqs) — Employees, Leave, Documents
- Agent capabilities (8 reqs) — continuous monitoring, scoring, NL Q&A, action drafting, scheduled briefings, long-term memory, propose-and-confirm, trust graduation
- Agent tool surfaces (2 reqs) — 11 read tools, 10 action tools
- Data model additions (6 reqs) — AgentAction, AgentMemory, PinnedView, PerformanceSnapshot, AgentRule, MetricEvent
- Mobile (4 reqs) — always-on GPS, active-platform detection, delivery photo, agent inbox
- Ingest (2 reqs) — adapter layer, partner-API conversations
- Realtime (1 req) — SSE + WebSocket
- Pricing & GTM (2 reqs) — KD 2/courier/month, white-glove onboarding
- NFR / scope (2 reqs) — bilingual outbound, tenant-scoped everywhere

### Out of Scope (explicit non-goals for the next 12 months)

Per PRD sections 2 and 12 (CON-non-goals-12-months):

- Drivers as a payment platform — banking/regulatory cost not justified
- Courier-facing super-app — courier mobile app is a GPS beacon + agent inbox, not a marketplace
- Direct integration with end-customer-facing apps — partner platforms own that surface
- Second mobile app for the owner — web suffices; chat is desktop-primary
- Direct payment processing — out of scope; integrates with existing accounting
- Customer-facing features — Darb serves the fleet, not end customers
- Courier marketplace — competing with platforms breaks our cross-platform position
- Replacements for partner platform consoles for non-fleet ops — we run the fleet, not the platform
- Voice interface to the agent — Phase 2; chat first
- Mobile-first chat — chat is desktop-primary; mobile is GPS + inbox
- Self-serve signup — until 10 customers, founder-led only
- Full RTL UI — deferred to Y2; English-first owner UI; bilingual outbound only

### Design-Partner Pricing Exception

Public floor is KD 200/month (CON-pricing-model). Design partner #1 may be onboarded at KD 100/month as a co-design discount. Documented to prevent confusion with the public price list.

## Context

### Existing Codebase (Brownfield Pivot)

This is a pivot, not a greenfield. The existing Darb codebase ships:

- **Backend** (`backend/`): Express 4 + TypeScript + Prisma 5 (PostgreSQL 15) + Redis 7 + BullMQ. 32 route files, 17 service files, 40+ Prisma models, JWT auth (15-min access + 7-day refresh), RBAC middleware, tenantScope middleware, SSE notifications, Swagger docs. Existing AI services to preserve and promote: `aiChiefOfStaffService` (becomes the agent module spine), `aiScoringService` (powers REQ-agent-scoring), `aiAnomalyService` (promoted to Floor's primary signal in Q3).
- **Frontend** (`frontend/`): Next.js 14 + React 18 + Tailwind + Shadcn + React Leaflet. ~80 pages — most retire behind a feature flag in Q2 (NOT deleted): `/overview`, `/v2`, `/insights`, `/kpis`, `/analytics`, `/tickets`, and most platform-specific deep pages. Components from well-built pages (e.g., `keeta/violations`) are harvested; engines survive, pages do not (subject to founder confirmation on PRD section 13 question 7).
- **Mobile** (`mobile/`): Expo 52 React Native app. Currently a basic agent app; v2 promotes it to the cross-platform GPS / telemetry beacon (continuous background GPS, active-platform detection, photo capture, agent inbox).

### Cross-References

- Routes to preserve as patterns: Keeta `POST /import` (canonical XLSX-fallback pattern; replicate per platform)
- Frontend pages whose engine survives but UI is replaced: `keeta/violations`
- New module to create: `backend/src/agent/` directory containing tool registry, read tools (11), action tools (10), action ledger, memory store, propose-confirm orchestrator, standing rules engine (v3)

### Risks

Per PRD section 11:

- HIGH: Scraping breaks / partner credentials revoked → adapter pattern + XLSX fallback + mobile-app-as-first-source + partner-API conversations Q3 (Phase 11)
- HIGH: Agent makes a wrong action and owner loses trust → propose-confirm non-negotiable v1 + visible audit log + per-action-class rollback
- MEDIUM: Owners reject chat ("just give me a button") → inbox of proposals = buttons generated by chat; owner only types when curious
- MEDIUM: Bilingual gap loses deals → Arabic for outbound courier comms in Q1 or Q2 (founder-gated, see Open Questions)
- MEDIUM: 7-engineer team in pre-revenue burns runway → track 1 (agent + Decisions) and track 2 (mobile + data plumbing) in parallel; reach revenue by Q2
- MEDIUM: Big fleets demand custom features → generative UI absorbs most "just one more report" without code
- LOW (12-month horizon): A platform builds the same thing themselves → cross-platform is our moat; no single platform builds for competitors

## Constraints

- **Tech stack — backend** (CON-stack-backend-pinned): Express 4 + TypeScript + Prisma 5 (PostgreSQL 15) + Redis 7 + BullMQ. JWT auth + RBAC + tenant scoping middleware preserved. SSE for notifications.
- **Tech stack — frontend** (CON-stack-frontend): Next.js 14 + Tailwind + Shadcn. Page count drops from 80+ to ~5 + chat surface.
- **Tech stack — mobile** (CON-stack-mobile): Expo 52 with always-on GPS and the agent inbox added.
- **Tech stack — agent runtime** (CON-stack-agent-runtime): Anthropic Claude Sonnet 4.6 via the Anthropic SDK, organised into a dedicated `backend/src/agent/` module (tool registry, action ledger, memory, pinned views, rules).
- **Realtime protocols** (CON-realtime-protocols): SSE for notifications (existing). Add WebSocket for agent streaming (chat tokens) and live floor map subscriptions.
- **Tenant scope everywhere** (CON-tenant-scope-everywhere): All agent read tools, action tools, memory entries, pinned views, metric events must be tenant-scoped via the existing `tenantScope` middleware.
- **Action confirm card** (CON-action-confirm-card): Every action tool emits a confirm card (proposed action + affected entity + agent reasoning + Approve/Modify/Dismiss). Action does not fire until Approve. v1 has no exceptions.
- **Audit row shape** (CON-audit-row-shape): Every fired action writes to `AgentAction` with proposer (always "Darb"), approver (human user id), originalProposal, modificationsBeforeApproval (diff), outcome (success/failure/rolled-back), reasoning. Audit log is the training corpus.
- **Driver File sections** (CON-driver-file-sections): Driver File must expose Profile, Live status + today's orders, Performance score with 90-day trend, Violations, Cash history, Attendance + shifts, Agent's running notes, Decision audit log.
- **Floor counters** (CON-floor-counters): Three pill counters at top — Scheduled-not-online, GPS-stale (>10 min), Order-rejection ×3+. Each clickable, filters the map.
- **Floor dot colors** (CON-floor-dot-colors): Driver dots colour-coded — green (working), grey (idle), red (GPS-stale), blue (scheduled-not-online). Each dot also carries platform-colour tag.
- **Decisions card shape** (CON-decisions-card-shape): Coloured tag (Suspend / Cash reminder / Promote / Warn) + driver name + headline + two-line agent reasoning + Approve/Modify/Dismiss. NO KPI strip on this page; numbers live in Chat.
- **Cash platform coverage** (CON-cash-platform-coverage): Finance → Cash covers Keeta, Talabat, Deliveroo only. Americana excluded (no driver cash flow).
- **Bilingual outbound** (CON-bilingual-outbound): All outbound courier-facing comms (WhatsApp, SMS) drafted bilingual (English + Arabic). Owner-facing UI English-only in v1; full RTL deferred to Y2.
- **Non-goals 12 months** (CON-non-goals-12-months): See Out of Scope section above.
- **Mobile GPS UX** (CON-mobile-gps-ux): Always-on GPS implemented with explicit attention to battery consumption and permission flows. UX deliverable, not a checkbox.
- **Scraper replaceable** (CON-scraper-replaceable): All Keeta/Talabat partner-portal scrapers sit behind a swappable adapter interface. Replacing a scraper requires zero changes outside the adapter.
- **XLSX fallback** (CON-xlsx-fallback): Every platform with a scraping ingest pathway must also have an XLSX-import fallback. Existing Keeta `POST /import` is the reference pattern.
- **Rate limits — v2 autonomy** (CON-rate-limits-v2-autonomy): When v2 autonomy ships (months 6–12), the three auto-executable action classes (routine pings, scheduled reminders, GPS-stale notifications) must enforce rate limits AND per-tenant caps. Money/HR-touching actions remain propose-and-confirm.
- **Pricing model** (CON-pricing-model): KD 2 / active courier / month, KD 200 minimum. Billing aligned to active courier count per tenant per month.
- **Onboarding format** (CON-onboarding-format): V1 onboarding is white-glove — 30 days of data ingested at start, founder produces "Darb's read on your fleet" report, 14-day free trial, 1 hour of founder onboarding included, no self-serve until 10 customers.
- **Engineer allocation assumption** (CON-engineer-allocation-assumption): The 12-month roadmap's PRD-stated allocation was ~3 backend, ~2 frontend, 1 mobile, 1 ML/AI. **For this planning cycle the actual allocation is 1 engineer + Claude Code (~6 months effective).** Aggressive phasing; all phases sequential; founder-gated questions become blocking gates rather than parallel-track concerns.

<decisions>

No LOCKED ADRs yet. The source PRD is `Status: Draft v0.1 — for founder review` and explicitly contains a "Decisions I need from you this week" gating section (PRD section 14). All 22 decisions extracted from the PRD are tracked below as PROPOSED, awaiting founder approval. They will be promoted to LOCKED ADRs only after the founder week-1 yes/no gates clear.

</decisions>

## Proposed Decisions Awaiting Founder Approval

All 22 decisions inherit `status: proposed`. The five week-1 yes/no gates (DEC-pivot-framing, DEC-hide-behind-flag, DEC-propose-and-confirm-v1, DEC-pricing-target, DEC-gtm-founder-led) are master gates — if any of them is rejected, downstream decisions void or rescope.

| ID | Statement (one-line) | Gate type |
|----|----------------------|-----------|
| DEC-pivot-framing | Pivot from multi-platform fleet dashboard to AI ops chief; surface contracts to Decisions/Chat/Floor/Operations/Driver File/Finance/HR/Settings | Week-1 master gate (PRD §14.1) |
| DEC-action-is-the-moat | Engineering weight goes into the agent's action-taking tool surface, not analytics | Principle |
| DEC-watchtower-plus-generative | Pre-build only Decisions/Floor/Driver File/Operations/Finance/HR; everything else is agent-generated on demand | Architecture |
| DEC-propose-and-confirm-v1 | Propose-and-confirm is the only autonomy mode in v1; no write-actions without explicit human click | Week-1 master gate (PRD §14.3) |
| DEC-trust-graduated-autonomy | v2: three low-risk auto-execute action classes with rate limits; v3: owner-authored standing rules | Roadmap (Q3 / Q4+) |
| DEC-cross-platform-default-view | Cross-platform unification is the default view; single-platform views are special cases | Principle |
| DEC-language-strategy | English-first owner UI; Arabic outbound courier comms in Q1 fast-follow; full RTL Y2 | Founder-gated (PRD §13 Q5) |
| DEC-pricing-target | KD 2 / active courier / month, KD 200 minimum | Week-1 master gate (PRD §14.4) |
| DEC-gtm-founder-led | Founder-led sales for first 5+ customers; white-glove in-person onboarding; 14-day free trial; no self-serve until 10 customers | Week-1 master gate (PRD §14.5) |
| DEC-hide-behind-flag | Most existing dashboard pages move behind feature flag in Q2; pages NOT deleted, remain resurrectable | Week-1 master gate (PRD §14.2) |
| DEC-keep-backend-foundations | Keep existing backend stack and existing AI services (`aiChiefOfStaffService`, `aiScoringService`, `aiAnomalyService`) | Architecture |
| DEC-frontend-strip-down | Reduce Next.js surface from 80+ pages to ~5 pages + one chat surface | Architecture |
| DEC-promote-agent-to-spine | Promote `aiChiefOfStaffService` from a service to a dedicated `backend/src/agent/` module with tool registry, action ledger, memory, pinned views, rules | Architecture |
| DEC-add-realtime-streaming | Keep SSE for notifications; add WebSocket for agent streaming and live floor map subscriptions | Architecture |
| DEC-add-metric-events | Add `MetricEvent` table + lightweight in-product analytics so the agent can "see itself" | Architecture |
| DEC-mobile-as-gps-beacon | Mobile app becomes the GPS + cross-platform telemetry beacon (continuous background GPS, active-platform detection, photo capture, agent inbox) | Architecture |
| DEC-scrapers-as-adapter-layer | Headless scrapers behind a swappable adapter interface; XLSX-import permanent fallback; partner-API conversations Q3 | Founder-gated (PRD §13 Q6) |
| DEC-role-based-landing | Owner → Decisions; Dispatcher → Floor; Accountant → Finance → Cash; HR → HR → Employees | IA |
| DEC-driver-vs-employee-split | Drivers (contractors, in Operations) are distinct records from office staff (Employees, in HR) | Data model + IA |
| DEC-non-goals-12-months | Explicit 12-month non-goals (see Out of Scope above) | Scope guardrail |
| DEC-pin-to-home-mechanic | Every generated view in Chat has a "Pin to Home" button; pinned views become tiles on Home; conversation history per-user and searchable | UX pattern |
| DEC-audit-log-is-the-product | Every action audited in `AgentAction` (proposer/approver/proposal/modifications/outcome/reasoning); audit log is the product over time and the training corpus for the next agent run | Governance |

## Open Questions (founder-gated; mirrored here so they remain visible)

These two ingest WARNINGs and the eight founder questions from PRD section 13 must be answered before the roadmap can be locked. Until each is resolved, the corresponding phase/requirement is dual-tracked or held.

### Ingest WARNINGs (must resolve before routing)

1. **Arabic outbound timing — Q1 vs Q2.** PRD section 11 (risks) places Arabic outbound courier comms in Q1; PRD section 9 Q2 places mobile Arabic outbound in Q2; PRD section 13 question 5 makes it founder-gated on Arabic-native bandwidth. **Roadmap places REQ-bilingual-courier-comms in Q2 (Phase 9: Mobile Agent Inbox + Bilingual Outbound) as the safe default; if founder confirms Arabic-native bandwidth, the requirement moves into Q1 alongside the agent module spine.**
2. **Owner default landing route — `/home` vs `/decisions`.** PRD section 5.1 frames Decisions as the new owner landing; PRD section 9 Q1 names the route `/home`. **Roadmap places the owner landing at `/decisions` (route name follows surface name) but treats this as a routing decision to be re-confirmed before Phase 2 ships. If founder prefers `/home` as a transitional umbrella, Decisions becomes the dominant tile on `/home`.**

### Founder-gated open questions (PRD section 13)

1. **Pricing instinct** — is KD 2/courier/month believable in this market? Would owners balk above KD 1.5? *(Phase 2 / Phase 8 implication.)*
2. **Design partner #1** — who is it? Name, fleet size, why they would say yes. If none in mind in two weeks, the Q1 plan is at risk. *(Phase 2 exit criterion blocker.)*
3. **Founder bandwidth** — how much of the founder's week can be founder-led sales / co-design with the first 3 fleets? Sub-40% breaks the GTM. *(Phase 2 / Phase 11 implication.)*
4. **The 7+ engineers** — what are their specialties? PRD assumed ~3 backend, ~2 frontend, 1 mobile, 1 ML/AI. **For this planning cycle, allocation is 1 engineer + Claude Code (~6 months) — already absorbed into roadmap pacing.** *(Already factored.)*
5. **Arabic voice** — is the founder Arabic-native? Yes → bilingual outbound moves into Q1. No → stays Q2. *(Phase 9 placement.)*
6. **Legal posture on scraping** — any conversations (formal or informal) with Keeta / Talabat partner ops? Their tolerance shapes Q3. *(Phase 11 implication.)*
7. **Deprecated pages** — treat well-built pages (e.g., `keeta/violations`) as "harvest the components, throw away the page"? PRD recommends yes; needs confirm. *(Phase 10 implication.)*
8. **"Approve all" bulk button** — ship at v1 for busy-and-trusting owners, or only after 6 months of confirm-data to know hit rate? *(Phase 2 implication; default = ship at v1 only after confirm hit-rate data.)*

### Threshold tunable to consolidate (INFO from ingest, not blocking)

- **GPS-stale threshold** — Floor pill counter is `>10 min` (CON-floor-counters) while example standing rule is `>15 min` (PRD section 6.5). Recommendation: keep them deliberately separate (UI counter vs. tunable standing rule). **Roadmap models this as: 10 min is hard-coded for Floor pills (CON-floor-counters); 15 min is the default for the standing-rule template in Phase 12 but is owner-tunable.**

### Phase-2 Scope Deferral (RESOLVED via plan-checker BLOCKER 2)

- **Onboarding ingestion in Phase 2 is scaffolding-only.** Phase 2 ships the BullMQ queue, the chunked 5-day-window iterator, per-platform progress tracking, and audit-row writes per chunk. **Real scraper invocation is deferred to Phase 6 (Ingest Adapter Layer).**
- For the design-partner-1 dry-run inside Phase 2, the wizard runs against pre-seeded fixture data created by `backend/prisma/seed-design-partner-fixture.ts` (8 drivers × 30 days of Shifts/Attendance/LocationLogs/OrderLogs + 1–2 cash mismatches + 2–3 violations + 5–10 PendingAgentAction rows). Plan 04 Task 5 ships the seed script; Plan 05's checkpoint runs it BEFORE the wizard.
- **ROADMAP success criterion 6 ("ingest customer's last 30 days of data")** is satisfied by either (a) the Phase 6 scrapers when ready, or (b) the seed-design-partner-fixture script as a one-time interim. The dry-run uses (b); the real first paying customer onboards via (a) once Phase 6 ships.

## Key Decisions

<!-- Decisions that constrain future work. Currently empty until founder week-1 gates clear. Migrate from "Proposed Decisions" table above as each is approved. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| *(Awaiting founder week-1 yes/no gates)* | See Open Questions section. | — Pending |

---
*Last updated: 2026-05-09 after `/gsd-new-project` ingest synthesis (PRD_Darb_v2.md, Draft v0.1).*
