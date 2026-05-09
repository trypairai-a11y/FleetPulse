# Requirements

Requirements extracted from `PRD_Darb_v2.md`. All entries inherit the PRD's draft status — they are PROPOSED requirements awaiting founder approval per PRD section 14. IDs are derived `REQ-{slug}` and grouped by surface.

---

## Surface: Decisions (owner inbox)

### REQ-decisions-proposal-inbox

- source: PRD_Darb_v2.md (section 5.1)
- description: Default landing for owner role. Single screen, no clutter. Stack of agent-generated proposal cards.
- acceptance:
  - Each card displays: a coloured tag (Suspend / Cash reminder / Promote / Warn), the driver's name and headline, the agent's two-line reasoning, and three buttons — Approve, Modify, Dismiss.
  - Approve fires the proposed action.
  - Modify opens an editor on the draft so the human can adjust before approving.
  - Dismiss closes the proposal AND trains the agent to propose differently next time.
  - No KPI strip and no leaderboard on this screen — numbers live in Chat.
- replaces: `/overview`, `/v2`, `/insights`, `/kpis`, `/analytics`, `/tickets` (per PRD section 5.1 last paragraph).
- scope: Owner persona (primary buyer / primary daily user).

## Surface: Floor (live map)

### REQ-floor-live-map

- source: PRD_Darb_v2.md (section 5.2)
- description: Default landing for dispatcher role. Live map of Kuwait, all platforms, real-time, glanceable, stays open all shift.
- acceptance:
  - Every online driver rendered as a coloured dot.
  - Dot colour codes: green (working), grey (idle), red (GPS-stale), blue (scheduled-not-online).
  - Each dot tagged with platform colour.
  - Three pill counters at top: Scheduled-not-online, GPS-stale (>10 min), Order-rejection ×3+. Click → filtered list.
  - Click a dot → right panel slides out with driver details: phone, vehicle, current order, last GPS, today's stats.
  - One action per driver: "Ping (WhatsApp)" — agent drafts message, dispatcher one-clicks send.
- scope: Dispatcher persona (daily user, glance-mode).

## Surface: Chat (Ask Darb / generative UI)

### REQ-chat-global-access

- source: PRD_Darb_v2.md (section 5.3)
- description: Single chat-style surface accessible from everywhere via ⌘K and pinned in the sidebar.
- acceptance:
  - ⌘K shortcut opens chat from any page.
  - Pinned in the sidebar always.
  - Per-user, searchable conversation history; yesterday's answer is one click away.

### REQ-chat-generated-dashboards

- source: PRD_Darb_v2.md (sections 5.3, 6.5)
- description: Any analytical question produces an inline generated mini-dashboard rather than navigating to a static page.
- acceptance:
  - Worked example required: "Why did revenue drop yesterday in Hawally?" returns a 3-tile KPI strip (revenue, courier coverage, reject rate), a Tue-vs-Wed bar chart by hour, an amber callout naming the two no-show drivers, and three action buttons: Draft warnings, Reassign tomorrow, Pin to home.
  - Agent picks format based on question — table (interactive grid, sortable, pinnable), time series chart, mini-map, side-by-side comparison cards, KPI tiles, action card, draft message.
  - Every generated view has a "Pin to Home" button; pinned views become tiles on Home.
  - Every analytical answer ends in actions the user can take, not just numbers. If the agent surfaces a problem, it offers the fix in the same response.
- replaces: ~50 pre-built analytics pages (PRD section 5.3 last line).

### REQ-chat-action-proposals

- source: PRD_Darb_v2.md (section 5.3 item 2)
- description: Chat can propose actions, not just answer questions.
- acceptance:
  - Worked example: "Apply a 10 KD penalty to drivers who missed shift today" — agent shows the list, the proposed payroll deduction, the WhatsApp draft, and waits for confirm.
  - All proposed actions go through the propose-and-confirm pattern (REQ-agent-propose-confirm).

### REQ-chat-scheduled-jobs

- source: PRD_Darb_v2.md (section 5.3 item 3)
- description: Chat can run scheduled jobs — pinned briefings and standing rules.
- acceptance:
  - Pinned briefings example: "every morning at 6, summarise yesterday and surface today's top 3 risks."
  - Standing-rule example: "if a courier is GPS-stale > 15 min during a shift, draft a ping" (note: standing-rule autonomy is v3 per DEC-trust-graduated-autonomy).

## Surface: Operations (per-platform)

### REQ-operations-per-platform-sections

- source: PRD_Darb_v2.md (section 5.4)
- description: Each platform (Keeta, Talabat, Deliveroo, Americana) has its own section with three sub-pages: Drivers, Orders, Violations.
- acceptance:
  - Drivers sub-page: sortable list with score, status, today's orders, last seen. Click a row → full Driver File.
  - Orders sub-page: today's orders for that platform, with status, courier, customer area.
  - Violations sub-page: list filterable; engine flags new ones automatically; surface mirrors what's in Decisions.
  - NO per-platform attendance, shifts, performance, or vehicle pages. Those collapse into Driver File or Chat.

## Surface: Driver File (canonical per-driver page)

### REQ-driver-file

- source: PRD_Darb_v2.md (section 5.5)
- description: One canonical page per driver, reachable by clicking any driver name anywhere in the app. Source of truth before any owner approves a fire/promote action.
- acceptance:
  - Sections present: Profile (name, photo, vehicle, platform, contract terms); Live status and today's orders; Performance score with trend over 90 days; Violations history; Cash history (settlements + outstanding); Attendance and shifts; Agent's running notes (auto-generated observations); Decision audit log (every agent proposal touching this driver — approved, modified, dismissed).

## Surface: Finance

### REQ-finance-cash-workbench

- source: PRD_Darb_v2.md (section 5.6)
- description: Driver receivables across platforms. Default landing for accountant role.
- acceptance:
  - Covers Keeta, Talabat, Deliveroo only — Americana has no driver cash and is excluded.
  - Reconciliation, age buckets, agent-drafted reminder messages.

### REQ-finance-payroll

- source: PRD_Darb_v2.md (section 5.6)
- description: Driver payouts.
- acceptance:
  - Computes weekly pay.
  - Applies deductions for violations.
  - Generates payslips.
  - Exports to bank file.

### REQ-finance-invoices

- source: PRD_Darb_v2.md (section 5.6)
- description: Incoming invoices from platforms — what Keeta/Talabat/Deliveroo/Americana owe the fleet for completed deliveries.
- acceptance: covers all four platforms.

### REQ-finance-expenses-pl

- source: PRD_Darb_v2.md (section 5.6)
- description: Expenses & P&L view.
- acceptance:
  - Tracks vehicle maintenance, fuel, rent, office staff salaries, utilities.
  - Full P&L view with month/quarter cuts.

## Surface: HR

### REQ-hr-employees

- source: PRD_Darb_v2.md (section 5.7)
- description: Office staff records (supervisors, accountants, dispatchers).
- acceptance: stores contracts, salaries, civil ID, contacts.
- scope: Office staff only — drivers tracked separately in Operations (see DEC-driver-vs-employee-split).

### REQ-hr-leave

- source: PRD_Darb_v2.md (section 5.7)
- description: Leave management.
- acceptance:
  - Annual leave, sick days, public holidays.
  - Office staff only.

### REQ-hr-documents

- source: PRD_Darb_v2.md (section 5.7)
- description: Document tracking with expiry alerts.
- acceptance:
  - Tracks visa, civil ID, contract expiry.
  - Surfaces expiry alerts (critical for Kuwait labour law).

## Agent capabilities

### REQ-agent-continuous-monitoring

- source: PRD_Darb_v2.md (section 6.1)
- description: Every minute, scan for anomalies — courier offline during shift, GPS-stale, rejection spikes, cash overdue, performance regression. Surface as inbox items in Decisions.

### REQ-agent-scoring

- source: PRD_Darb_v2.md (section 6.1)
- description: Maintain a live composite score per courier. Already partially done in `aiScoringService`.
- acceptance: agent must explain the score in plain English when asked.

### REQ-agent-natural-language-qa

- source: PRD_Darb_v2.md (section 6.1)
- description: Natural-language questions over fleet data → generated tables/charts via tools, all tenant-scoped.

### REQ-agent-action-drafting

- source: PRD_Darb_v2.md (section 6.1)
- description: Translate a goal ("warn the worst 3 today") into a concrete action plan with WhatsApp drafts, penalty entries, audit reasons. Wait for confirm before firing.

### REQ-agent-scheduled-briefings

- source: PRD_Darb_v2.md (section 6.1)
- description: Daily/weekly digests for owner, accountant, dispatcher.
- acceptance:
  - Bilingual where the brief touches couriers (Arabic outbound).

### REQ-agent-long-term-memory

- source: PRD_Darb_v2.md (section 6.1)
- description: Per-tenant memory of decisions, owner preferences, courier history. Agent gets smarter at the *specific* fleet's patterns over time. Backed by the `AgentMemory` model.

### REQ-agent-propose-confirm

- source: PRD_Darb_v2.md (sections 4 principle 4, 6.3, 6.4 v1)
- description: All action tools require a confirm card before firing. v1 has no auto-execute. Non-negotiable.
- acceptance:
  - Every action tool produces a confirm card.
  - No write-actions to the world without explicit human click.
  - Every fired action is recorded in `AgentAction` with proposer = Darb, approver = the human, original proposal, modifications before approval, outcome, and reasoning.

### REQ-agent-trust-graduation

- source: PRD_Darb_v2.md (section 6.4)
- description: Autonomy tiers earned over time per action class.
- acceptance:
  - v1 (months 0–6): all actions propose-and-confirm.
  - v2 (months 6–12): three low-risk action classes auto-execute with rate limits and per-tenant caps — draft+send routine pings, schedule reminders, GPS-stale notifications to dispatcher. Money-touching and HR-touching actions stay propose-and-confirm.
  - v3 (year 2+): owner-authored standing rules (`AgentRule`) authorised once, agent runs forever with weekly digest of what it did.

## Agent tool surface — read tools

### REQ-agent-read-tools

- source: PRD_Darb_v2.md (section 6.2)
- description: Canonical read-tool surface for the agent. Tenant-scoped. Migrated from existing `aiChiefOfStaffService`.
- acceptance — these tools must exist:
  - `revenueByDay`, `revenueByPlatform`, `revenueByZone`
  - `courierLeaderboard(metric, order, limit, period)`
  - `courierProfile(driverId)` — full file
  - `violationsList(filters)`
  - `cashOutstanding(filters)`
  - `attendanceForPeriod(filters)`
  - `liveFleetStatus()` — current online/offline/idle
  - `gpsTrack(driverId, period)` — courier movement
  - `searchOrders(filters)` — find specific orders by status, time, customer, etc.
  - `forecastDemand(zone, hourBucket)` — predicted orders next N hours
  - `forecastSupplyGap(zone, hourBucket)` — predicted courier shortfall

## Agent tool surface — action tools (the moat)

### REQ-agent-action-tools

- source: PRD_Darb_v2.md (section 6.3)
- description: Action-tool surface. Every tool requires a confirm card before firing.
- acceptance — these tools must exist:
  - `draftCourierMessage(driverId, intent, language)` — generates WhatsApp/SMS body
  - `sendCourierMessage(messageId)` — fires it (after confirm)
  - `applyPenalty(driverId, type, amount, reason, sourceViolationId?)`
  - `suspendDriver(driverId, durationDays, reason)`
  - `reassignShift(shiftId, newDriverId, reason)`
  - `flagForReview(driverId, reason)` — opens a record in the owner's inbox
  - `createTrainingTask(driverId, trainingType)`
  - `recordCashSettlement(driverId, amount, method, note)`
  - `escalateToHumanSupervisor(driverId, reason)` — pings supervisor on WhatsApp/Slack
  - `generatePayrollAdjustment(driverId, period, items[])`
- audit:
  - Every action recorded in `AgentAction` with: proposer (always Darb), approver (the human), original proposal, modifications before approval, outcome, reasoning.

## Data architecture additions

### REQ-data-agent-action

- source: PRD_Darb_v2.md (section 7.2)
- description: Add `AgentAction` model — every proposal/approval/outcome (acts as both audit log and training data).

### REQ-data-agent-memory

- source: PRD_Darb_v2.md (section 7.2)
- description: Add `AgentMemory` model — per-tenant key/value notes the agent maintains (e.g., "owner prefers Friday warnings over Thursday").

### REQ-data-pinned-view

- source: PRD_Darb_v2.md (sections 5.3, 7.2)
- description: Add `PinnedView` model — saved generated views per user. The dynamic dashboard equivalent.

### REQ-data-performance-snapshot

- source: PRD_Darb_v2.md (section 7.2)
- description: Add `PerformanceSnapshot` model — daily snapshot per driver for trend analysis. Fixes the current pattern of recomputing on every read.

### REQ-data-agent-rule

- source: PRD_Darb_v2.md (section 7.2)
- description: Add `AgentRule` model — standing rules ("if X then propose Y") for v3 autonomy.

### REQ-data-metric-event

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- description: Add `MetricEvent` table for lightweight in-product analytics. Required for the agent to "see itself" and learn what users actually do.

## Mobile (strategic asset)

### REQ-mobile-always-on-gps

- source: PRD_Darb_v2.md (sections 1, 7.4, 9 Q1)
- description: Continuous background GPS while logged in. Battery and permission UX done well. Ship in Q1.
- acceptance:
  - GPS streams while the courier is logged into the Darb mobile app, regardless of which delivery app is foregrounded.
  - Battery / permission flows are a deliberate UX deliverable, not an afterthought.

### REQ-mobile-active-platform-detection

- source: PRD_Darb_v2.md (section 7.4)
- description: Detect which delivery app is foregrounded (Keeta / Talabat / Deliveroo / Americana) so we get per-platform attribution without scraping.

### REQ-mobile-delivery-photo-capture

- source: PRD_Darb_v2.md (section 7.4)
- description: Photo capture for delivery proof. Already partly there in the existing app.

### REQ-mobile-agent-inbox

- source: PRD_Darb_v2.md (sections 7.4, 9 Q2)
- description: WhatsApp-style inbox to receive agent-drafted messages directly without leaving the app. Ship in Q2.

## Data ingest

### REQ-ingest-adapter-layer

- source: PRD_Darb_v2.md (section 7.3)
- description: Treat scrapers of Keeta/Talabat partner portals as a swappable adapter layer.
- acceptance:
  - Scrapers can be replaced without affecting the rest of the system.
  - Wherever an own-app data source exists (mobile GPS, courier check-ins) it is preferred over scraped data.
  - XLSX-import remains a permanent fallback for any platform that breaks scraping. The Keeta `POST /import` route is the canonical pattern.

### REQ-ingest-partner-api-conversations

- source: PRD_Darb_v2.md (sections 7.3, 9 Q3)
- description: Begin formal partner-API conversations with Talabat and Keeta in Q3, once 5+ paying fleets exist.

## Realtime infrastructure

### REQ-realtime-streaming

- source: PRD_Darb_v2.md (section 8 tech-stack table)
- description: Keep SSE for notifications; add WebSocket for agent streaming and live floor map subscriptions.

## Pricing & GTM

### REQ-pricing-model

- source: PRD_Darb_v2.md (section 10)
- description: KD 2 per active courier per month, KD 200 minimum.
- acceptance:
  - Worked example: a 150-courier fleet bills at KD 300/month.
  - Pricing aligns to value (more couriers = more leverage from the agent).

### REQ-gtm-onboarding

- source: PRD_Darb_v2.md (section 10)
- description: White-glove in-person onboarding.
- acceptance:
  - Ingest customer's last 30 days of data.
  - Generate a "Darb's read on your fleet" report and present it as the close.
  - 14-day free trial with 1 hour of founder onboarding.
  - No self-serve in v1 (per DEC-non-goals-12-months until 10 customers).

## Non-functional / scope guardrails

### REQ-bilingual-courier-comms

- source: PRD_Darb_v2.md (sections 1, 4 principle 7)
- description: All outbound courier comms drafted bilingual.
- acceptance:
  - WhatsApp / SMS messages from the agent drafted in both English and Arabic.
  - Owner-facing UI remains English-first; full RTL UI is deferred to Y2.

### REQ-tenant-scoped-everything

- source: PRD_Darb_v2.md (sections 6.2, 7.1)
- description: Every read tool, every action tool, every memory entry, every pinned view, every metric event must be tenant-scoped (preserving existing tenantScope middleware pattern from the legacy stack).
