# Decisions

Decisions extracted from PRDs and surfaced as proposed product/architecture decisions for the Darb v2 pivot. None are LOCKED — the source PRD is `Status: Draft v0.1 — for founder review` and explicitly contains a "Decisions I need from you this week" gating section. Treat all entries as PROPOSED until a founder-approved ADR ratifies them.

> No ADRs were ingested in this run. The entries below are decision-shaped statements lifted from the PRD so downstream planners (gsd-roadmapper) can promote them to ADRs as the founder approves each one.

---

## DEC-pivot-framing

- source: PRD_Darb_v2.md (sections 0, 1, 5, gate item 14.1)
- status: proposed
- scope: product strategy / overall pivot
- statement: Pivot Darb from a multi-platform fleet dashboard to "the AI ops chief for delivery fleet owners in the Gulf." Hero job is driver performance and retention. The product surface contracts to: Decisions (proposal inbox), Chat (generative UI), Floor (live map), Operations (per-platform), Driver File, Finance, HR, Settings.
- rationale: Pre-revenue, no sticky use case, current 80+ pages mostly clone what aggregators already show. Mobile cross-platform GPS is the data moat. Buyer interface is question + approval, not a navbar.
- gating: founder approval (PRD section 14, item 1) — this is the master decision; if rejected, all downstream decisions void.

## DEC-action-is-the-moat

- source: PRD_Darb_v2.md (sections 4 principles, 6.3 action tools)
- status: proposed
- scope: product principle / engineering investment
- statement: Engineering weight goes into the agent's action-taking tool surface, not analytics. "Anything that ends in a chart is a feature; anything that ends in an action a human approves is a product."
- rationale: Cross-platform GPS gives data moat; action tools (penalty, suspend, message, payroll adjustment) are where defensibility lives.

## DEC-watchtower-plus-generative

- source: PRD_Darb_v2.md (section 4 principle 3, section 5.3)
- status: proposed
- scope: UI architecture
- statement: Pre-build only the surfaces a dispatcher must glance at (Decisions, Floor, Driver File, Operations lists, Finance, HR). Everything else is rendered by the agent on demand inside Chat. Generated views can be pinned to grow the dashboard organically by user pull, not pre-built.
- rationale: Replaces ~50 pre-built analytics pages with one chat surface. Reduces frontend from 80+ pages to ~5 pages + chat surface.

## DEC-propose-and-confirm-v1

- source: PRD_Darb_v2.md (sections 4 principle 4, 6.4, gate item 14.3)
- status: proposed
- scope: agent autonomy model (v1, months 0–6)
- statement: Propose-and-confirm is the only autonomy mode in v1. No agent action against the world without one explicit human click. Non-negotiable in v1.
- gating: founder approval (PRD section 14, item 3).

## DEC-trust-graduated-autonomy

- source: PRD_Darb_v2.md (section 6.4)
- status: proposed
- scope: agent autonomy model (v2 + v3)
- statement:
  - v2 (months 6–12): auto-execute three low-risk action classes — draft+send routine pings, schedule reminders, GPS-stale notifications to dispatcher — with rate limits and per-tenant caps. Money/HR-touching actions stay propose-and-confirm.
  - v3 (year 2+): owner-authored standing rules (AgentRule) authorised once, agent runs forever with weekly digest of what it did.
- depends-on: DEC-propose-and-confirm-v1.

## DEC-cross-platform-default-view

- source: PRD_Darb_v2.md (section 4 principle 6)
- status: proposed
- scope: UI / data presentation
- statement: Cross-platform unification is the default view. Single-platform views (Operations → Keeta / Talabat / Deliveroo / Americana) are special cases, not the home page.

## DEC-language-strategy

- source: PRD_Darb_v2.md (sections 1 last paragraph, 4 principle 7)
- status: proposed
- scope: i18n / language coverage
- statement: English-first for v1 owner-facing UI. Arabic as fast-follow for courier-facing comms (WhatsApp / SMS) in Q1. Full RTL UI deferred to Y2.
- rationale: Buyer (owner / GM / accountant) reads English fluently in Kuwait segment. Courier comms can be Arabic without bilingual UI.
- gating: founder bandwidth on Arabic voice (PRD section 13, question 5).

## DEC-pricing-target

- source: PRD_Darb_v2.md (sections 10, gate item 14.4)
- status: proposed
- scope: commercial / pricing
- statement: KD 2 per active courier per month, KD 200 minimum. 150-courier fleet = KD 300/mo. Aligns price to value (more couriers = more agent leverage).
- gating: founder approval (PRD section 14, item 4).

## DEC-gtm-founder-led

- source: PRD_Darb_v2.md (sections 10, gate item 14.5)
- status: proposed
- scope: go-to-market motion
- statement: Founder-led sales for first 5+ customers. White-glove in-person onboarding with 30-day data ingest + "Darb's read on your fleet" report as the close. 14-day free trial with 1 hour of founder onboarding. No self-serve until 10 customers.
- gating: founder time commitment to design partner #1 in Q1 (PRD section 14, item 5).

## DEC-hide-behind-flag

- source: PRD_Darb_v2.md (sections 5.1 last paragraph, 9 Q2, gate item 14.2)
- status: proposed
- scope: legacy page deprecation
- statement: Most existing dashboard pages (`/v2`, `/overview`, `/insights`, `/analytics`, `/kpis`, `/tickets`, and most platform-specific deep pages) move behind a feature flag in Q2. Pages are NOT deleted — they remain resurrectable. The Decisions screen replaces `/overview`, `/v2`, `/insights`, `/kpis`, `/analytics`, `/tickets`.
- gating: founder approval (PRD section 14, item 2). Note: founder also asked (PRD section 13, question 7) whether to harvest components from well-built pages (e.g., keeta/violations engine survives, page does not). PRD recommendation: yes.

## DEC-keep-backend-foundations

- source: PRD_Darb_v2.md (sections 7.1, 8 tech-stack table)
- status: proposed
- scope: backend architecture
- statement: Keep the existing backend stack: Express 4 + TypeScript + Prisma 5 (PostgreSQL 15) + Redis 7 + BullMQ + JWT auth + RBAC + tenant scoping + SSE notifications. Existing 40+ Prisma models and existing AI services (`aiChiefOfStaffService`, `aiScoringService`, `aiAnomalyService`) are preserved.
- rationale: Backend was right; only the frontend was over-built.

## DEC-frontend-strip-down

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- status: proposed
- scope: frontend architecture
- statement: Keep Next.js 14 + Tailwind + Shadcn. Reduce surface area from 80+ pages to ~5 pages + one chat surface (Decisions, Chat, Floor, Operations index per platform with three sub-pages each, Driver File, Finance index, HR index, Settings).

## DEC-promote-agent-to-spine

- source: PRD_Darb_v2.md (sections 6, 7.2, 8 tech-stack table)
- status: proposed
- scope: agent / AI architecture
- statement: Promote agent from a service (`aiChiefOfStaffService`) to a dedicated `agent/` module with: tool registry (read tools + action tools), action ledger (`AgentAction`), per-tenant memory (`AgentMemory`), pinned views (`PinnedView`), performance snapshots (`PerformanceSnapshot`), and standing rules (`AgentRule` for v3). Use Claude Sonnet 4.6.

## DEC-add-realtime-streaming

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- status: proposed
- scope: realtime infrastructure
- statement: Keep SSE for notifications; add WebSocket for agent streaming and live floor map subscriptions.
- rationale: Chat needs streaming; map needs subscriptions.

## DEC-add-metric-events

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- status: proposed
- scope: in-product analytics
- statement: Add a `MetricEvent` table + lightweight in-product analytics so the agent can "see itself" — required for the agent to learn what users actually do.

## DEC-mobile-as-gps-beacon

- source: PRD_Darb_v2.md (sections 1 fact 1, 7.4)
- status: proposed
- scope: mobile app strategy
- statement: The Expo courier app stops being just an "agent app" and becomes the GPS + cross-platform telemetry beacon. New responsibilities: continuous background GPS while logged in (with battery/permission UX), active-platform detection (which delivery app is foregrounded), photo capture for delivery proof, WhatsApp-style inbox for agent-drafted messages.
- rationale: Cross-platform GPS that no single platform has = the data moat.

## DEC-scrapers-as-adapter-layer

- source: PRD_Darb_v2.md (section 7.3)
- status: proposed
- scope: data ingest architecture
- statement: Treat headless scrapers of Keeta/Talabat partner portals as a swappable adapter layer. Prefer own-app data sources (mobile GPS, courier check-ins) over scraped data. Reduce scraping dependency over 12 months. XLSX-import is the permanent fallback (the existing Keeta `POST /import` route is the right pattern). Begin formal partner-API conversations with Talabat and Keeta in Q3 once 5+ paying fleets exist.
- rationale: Scraping is fragile and creates legal/relationship risk.
- gating: legal posture on scraping (PRD section 13, question 6).

## DEC-role-based-landing

- source: PRD_Darb_v2.md (section 5)
- status: proposed
- scope: navigation / IA
- statement: Role-based landing pages — Owner → Decisions, Dispatcher → Floor, Accountant → Finance → Cash, HR person → HR → Employees.

## DEC-driver-vs-employee-split

- source: PRD_Darb_v2.md (section 5)
- status: proposed
- scope: data model + IA
- statement: Drivers (contractors, in Operations) are distinct records from office staff (Employees, in HR). Office staff = supervisors, accountants, dispatchers — tracked under HR with leave + documents. Drivers tracked under Operations.

## DEC-non-goals-12-months

- source: PRD_Darb_v2.md (sections 2, 12)
- status: proposed
- scope: product scope guardrails
- statement: Explicit non-goals for the next 12 months — drivers as a payment platform; courier-facing super-app; direct integration with end-customer-facing apps; replacing the partner platforms; second mobile app for the owner; direct payment processing; customer-facing features; courier marketplace; replacing partner platform consoles for non-fleet ops; voice interface to the agent; mobile-first chat (chat is desktop-primary); self-serve signup until 10 customers.

## DEC-pin-to-home-mechanic

- source: PRD_Darb_v2.md (sections 5.3 generative UI rules, 6.5)
- status: proposed
- scope: UX pattern
- statement: Every generated view in Chat has a "Pin to Home" button. Pinned views become tiles on Home. This is how the dashboard grows organically by user pull, instead of being pre-built. Generated views are ephemeral by default; pinning makes them durable. Conversation history is per-user and searchable.

## DEC-audit-log-is-the-product

- source: PRD_Darb_v2.md (section 6.3 final paragraph)
- status: proposed
- scope: agent / governance
- statement: Every action is an audited row in `AgentAction` with: who proposed (always Darb), who approved (the human), what was the proposal, what was modified before approving, the outcome, and the reasoning. The audit log is *the product* over time — it teaches the next agent run.
