# Context

Verbatim context notes lifted from `PRD_Darb_v2.md` and grouped by topic. No DOC-class documents were ingested in this run; entries here capture the narrative / market / strategic background from the PRD that is informational rather than decision-shaped or requirement-shaped.

---

## Topic: pivot rationale

- source: PRD_Darb_v2.md (sections 0, 1)

> Darb is pivoting from a multi-platform fleet dashboard to the AI ops chief for delivery fleet owners in the Gulf — Kuwait first.

> One sentence pitch: "Replace your WhatsApp group + Excel sheet with an AI that runs your fleet's performance for you, in 20 minutes a day."

Three structural facts that decided the shape of v2:

1. The Darb mobile app on the courier's phone gives Darb cross-platform GPS that no individual platform has. Keeta knows where the courier is *when working for Keeta*. Darb knows where they are all day, on every platform. That is the data moat.
2. The buyer is the fleet owner. They don't open dashboards — they ask questions and want answers. Their natural interface is a question, not a navbar.
3. The status quo is Excel + WhatsApp. Customers are not displacing software, they're displacing chaos. The bar is low for utility but high for trust.

The pivot follows: keep the data backbone, kill most of the frontend, replace it with one agentic surface plus a small ring of watchtowers, and put all engineering weight behind the agent's *action-taking* tool surface — because action is where the moat lives, not in another chart.

## Topic: vision

- source: PRD_Darb_v2.md (section 2)

3-year vision: every fleet owner in the GCC who runs 50+ couriers across multiple platforms uses Darb as their daily operating brain. The agent makes >70% of routine performance, scheduling, and cash decisions — owners just approve. Darb is the system of record for fleet performance in the Gulf.

12-month goal: 8–12 paying fleets in Kuwait, KD 6–10k MRR, design-partner depth on at least 3 of them. The product is good enough that the owner opens it daily before opening WhatsApp.

## Topic: ICP

- source: PRD_Darb_v2.md (section 3)

ICP: fleet operators in Kuwait running 80–300 couriers across two or more of {Keeta, Talabat, Deliveroo, Americana}. They are profit-thin, ops-heavy, and currently coordinate via WhatsApp groups + Excel + per-platform partner portals.

## Topic: personas inside the customer

- source: PRD_Darb_v2.md (section 3)

- Owner / GM — primary buyer, primary daily user. Wants leverage and clarity. Decides on hires, fires, expansions. Will pay if Darb makes them smarter about their drivers.
- Ops manager / dispatcher — daily user, glance-mode. Watches the floor in real time. Will reject a chat-only product. Needs watchtowers.
- Accountant — heavy weekly user. Reconciles cash, processes payroll, applies deductions for violations. Spreadsheet brain.

Design intent: the agent for the owner, the watchtowers for the dispatcher, a focused workspace for the accountant. One product, three lenses.

## Topic: product principles (trade-off rules)

- source: PRD_Darb_v2.md (section 4)

These are re-derivation rules. When a decision comes up, derive from these:

1. Clarity over completeness. A correct answer to one question beats a comprehensive page that buries the question.
2. Action is the moat, not analytics. Anything that ends in a chart is a feature; anything that ends in an action a human approves is a product.
3. The watchtower exists; everything else is generative. Pre-build only the surfaces a dispatcher must glance at. Everything else is rendered by the agent on demand.
4. Propose-and-confirm is the default autonomy. No agent action against the world without one human click. Non-negotiable in v1.
5. Trust is earned per action class. First we earn the right to draft messages. Then to apply penalties. Then to schedule shifts. Don't ship the firing button on day one.
6. Cross-platform unification is the default view. Single-platform views are special cases, not the home page.
7. Owner reads English, courier reads Arabic. UI English-first; outbound courier comms drafted bilingual.

## Topic: roadmap (12 months by quarter)

- source: PRD_Darb_v2.md (section 9)

### Q1 (May–Jul 2026) — Wedge

Goal: one fleet (design partner #1) using Home + chat daily for performance decisions.

- Build `agent/` module: tool registry, read-tools wired, action ledger, propose-confirm UI.
- Build Home + Driver File + Chat surface.
- Hide the old frontend behind a feature flag — old pages still exist; new landing is `/home`.
- Onboard one fleet (the most receptive). Treat them as a co-design partner. **Charge them.** Even 100 KD/month proves it has value.
- Mobile app: always-on GPS shipped.

Exit criterion: the owner of design partner #1 says "I check Darb before WhatsApp every morning."

### Q2 (Aug–Oct 2026) — Watchtower & Cash

Goal: add the dispatcher and accountant. Move to 3 fleets paying.

- Build Live Floor (map + alert pills + courier panel).
- Build Cash Workbench. Wire all cash actions through the agent's confirm pattern.
- Add 5 high-value action tools: applyPenalty, suspendDriver, recordCashSettlement, generatePayrollAdjustment, sendCourierMessage.
- Hide behind feature flag: `/v2`, `/overview`, `/insights`, `/analytics`, `/kpis`, `/tickets` and most platform-specific deep pages. Replace with chat-generated equivalents.
- Mobile app: Arabic outbound messages, agent inbox.

Exit criterion: 3 fleets paying. >50% of "what the owner used to ask the dispatcher" goes through the chat.

### Q3 (Nov 2026–Jan 2027) — Trust & Autonomy v2

Goal: 6 fleets. Agent runs the morning standup for them.

- Scheduled briefings shipping daily (owner, accountant). Bilingual outbound.
- Auto-execute three low-risk action classes (pings, reminders, GPS notifications).
- Per-tenant agent memory matures (the agent learns the fleet's preferences).
- Anomaly detection promoted from `aiAnomalyService` to Home's primary signal.
- Begin formal partner-API conversations with Keeta + Talabat.

Exit criterion: 6 paying fleets, KD 4–6k MRR, NPS > 40 from owners.

### Q4 (Feb–Apr 2027) — Standing Rules & GCC prep

Goal: 10 fleets, KD 8–10k MRR, KSA market validation begun.

- AgentRule model: owner-authored standing rules ("auto-warn 3-strike absentees").
- Performance forecasting: agent predicts which couriers will churn / underperform next month.
- Begin KSA platform adapters (Hungerstation, Jahez) in parallel with Kuwait deepening.
- Design v1 of arabic-first UI for the next market.

Exit criterion: product is ready for a deliberate KSA expansion in Y2.

## Topic: pricing & GTM rationale

- source: PRD_Darb_v2.md (section 10)

- Pricing: KD 2 per active courier per month, KD 200 minimum. 150-courier fleet = KD 300/mo. Aligns price to value (more couriers = more leverage from the agent).
- GTM motion: founder-led sales. We are 7+ engineers and 0 reps. The first 5 customers come from the founder's network. Land via the owner, expand to the dispatcher and accountant inside the customer.
- Onboarding: in-person, white-glove. We ingest their last 30 days of data, generate a "Darb's read on your fleet" report, and present it as the close. The report itself sells the product.
- Free trial: 14 days with 1 hour of founder onboarding. No self-serve in v1.

## Topic: risks register

- source: PRD_Darb_v2.md (section 11)

- Scraping breaks / partner credentials revoked — HIGH severity. Mitigation: adapter pattern; XLSX fallback; mobile-app-as-first-source strategy; partner-API conversations Q3.
- Agent makes a wrong action and owner loses trust — HIGH severity. Mitigation: propose-confirm non-negotiable v1. Audit log visible to owner. Rollback per action class.
- Owners reject chat ("just give me a button") — MEDIUM severity. Mitigation: inbox of proposals = buttons generated by chat. Owner never has to type a question. They only chat when curious.
- Bilingual gap loses us deals — MEDIUM severity. Mitigation: Arabic for outbound courier comms in Q1. Full RTL UI deferred to Y2. Bilingual demos by founder mitigate gap in interim.
- 7 engineers in pre-revenue burns runway — MEDIUM severity. Mitigation: track 1 (Home + agent) and track 2 (mobile + data plumbing) in parallel. Reach revenue by Q2.
- Big fleets demand custom features — MEDIUM severity. Mitigation: generative UI absorbs most "just one more report" requests without code. Real custom features only for design partners with explicit deal value.
- A platform builds the same thing themselves — LOW severity (12 months). Mitigation: cross-platform is our moat — no single platform will build for their competitors.

## Topic: founder-gated open questions

- source: PRD_Darb_v2.md (section 13)

These questions block the PRD from being lockable. Roadmapper should mirror them in PROJECT.md or open-questions.md so they remain visible:

1. Pricing instinct — is KD 2/courier/month believable in this market? Would owners balk above KD 1.5?
2. Design partner #1 — who is it? Name, fleet size, why they would say yes. If none in mind in two weeks, the Q1 plan is at risk.
3. Founder bandwidth — how much of the founder's week can be founder-led sales / co-design with the first 3 fleets? Sub-40% breaks the GTM.
4. The 7+ engineers — what are their specialties? PRD assumes ~3 backend, ~2 frontend, 1 mobile, 1 ML/AI; different skew shifts the roadmap.
5. Arabic voice — is the founder Arabic-native? Yes → bilingual outbound moves forward. Translators required → stays Q2.
6. Legal posture on scraping — any conversations (formal or informal) with Keeta / Talabat partner ops? Their tolerance shapes Q3.
7. Deprecated pages — treat well-built pages (e.g., keeta/violations) as "harvest the components, throw away the page"? PRD recommends yes; needs confirm.
8. "Approve all" bulk button — ship at v1 for busy-and-trusting owners, or only after 6 months of confirm-data to know hit rate?

## Topic: founder week-1 gates

- source: PRD_Darb_v2.md (section 14)

Five yes/no gates required this week to unblock engineering kick-off:

1. Approve the pivot framing (Home + chat + Live Floor, not dashboards).
2. Approve the hide-behind-flag plan (most existing dashboard pages move behind a flag in Q2; not deleted).
3. Approve propose-and-confirm as v1 autonomy. No write-actions without click.
4. Approve KD 2/courier/month as the pricing target to test.
5. Commit founder time to design partner #1 in Q1.

If yes to all five, the next deliverable is the engineering kick-off doc: file-level deletion list, the `agent/` module skeleton, the migration sequence, and the first 4 sprints with named owners.

## Topic: cross-references to existing codebase

- source: PRD_Darb_v2.md (sections 5.1, 5.4, 6.2, 7.1, 7.2, 7.3, 8, 9 Q3)

The PRD explicitly references existing assets to be preserved or evolved:

- Backend services to preserve and promote: `aiChiefOfStaffService` (becomes the canonical read-tool surface, then the agent/ module spine), `aiScoringService` (already powers per-courier scoring, agent re-uses), `aiAnomalyService` (promoted to Home's primary signal in Q3).
- Routes to preserve as patterns: Keeta `POST /import` (the canonical XLSX-fallback pattern; replicate per platform).
- Frontend pages to retire or hide behind flag (Q2): `/overview`, `/v2`, `/insights`, `/kpis`, `/analytics`, `/tickets`, `/home` (re-implemented as the new Decisions surface), and most platform-specific deep pages.
- Frontend pages whose engine survives but UI is replaced: `keeta/violations` (engine kept, page harvested for components per PRD section 13 question 7).
- Existing infra to preserve: 40+ Prisma models, JWT auth (15-min access + 7-day refresh), RBAC middleware, tenantScope middleware, BullMQ workers, SSE notifications.
- New module to create: `agent/` directory containing tool registry, read tools, action ledger, memory store, and the propose-confirm orchestrator.
