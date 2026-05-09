## Conflict Detection Report

Scope: 1 doc ingested (PRD_Darb_v2.md, type=PRD, mode=new). No prior `.planning/` context to reconcile against. No ADRs in the ingest set, so LOCKED-vs-LOCKED contradictions are impossible by construction. Conflict scan is therefore PRD-internal.

### BLOCKERS (0)

None.

### WARNINGS (2)

[WARNING] Competing timelines for Arabic outbound courier comms
  Found:
    - source: PRD_Darb_v2.md section 11 (risks) — "Arabic for outbound courier comms in Q1" (mitigation for the bilingual-gap risk).
    - source: PRD_Darb_v2.md section 9 Q2 — "Mobile app: Arabic outbound messages, agent inbox." (places mobile Arabic outbound in Q2).
    - source: PRD_Darb_v2.md section 13 question 5 — "If yes [founder Arabic-native], we move bilingual outbound forward. If you'll need translators, it stays Q2." (founder-gated, branches the schedule).
  Impact: Roadmapper cannot place a single delivery date on REQ-bilingual-courier-comms / CON-bilingual-outbound. If the founder is Arabic-native, the work moves into Q1 and is part of the wedge; otherwise the mobile-side Arabic experience lands in Q2 alongside the agent inbox.
  → Resolve by answering PRD section 13 question 5 (founder Arabic capacity) and locking REQ-bilingual-courier-comms to either Q1 or Q2 in PROJECT.md. Until then, downstream planners should keep both variants visible in the roadmap.

[WARNING] Owner default landing route — `/home` vs Decisions
  Found:
    - source: PRD_Darb_v2.md section 5.1 — "The owner opens Darb and lands here. ... This screen replaces `/overview`, `/v2`, `/insights`, `/kpis`, `/analytics`, `/tickets`." (frames Decisions as the new owner landing surface; route name not given).
    - source: PRD_Darb_v2.md section 5 role-based-landing — "Owner → Decisions" (no route).
    - source: PRD_Darb_v2.md section 9 Q1 — "Hide the old frontend behind a feature flag — old pages still exist, new landing is `/home`." (names the route as `/home`, not `/decisions`).
  Impact: Two plausible reads of the routing decision — (a) Decisions is the new owner landing and the URL is `/home`, OR (b) `/home` is a transitional umbrella surface in Q1 that hosts Decisions + Driver File + Chat together, with the URL settling later. Affects router setup, deep-links, marketing screenshots.
  → Pick one before routing: either rename to `/decisions` and update Q1 plan, or treat `/home` as the canonical owner landing and document Decisions as the dominant tile on `/home`.

### INFO (3)

[INFO] PRD-internal tension on GPS-stale threshold (different surfaces, different thresholds — not a contradiction)
  Found:
    - source: PRD_Darb_v2.md section 5.2 — Floor pill counter: "GPS-stale (>10 min)".
    - source: PRD_Darb_v2.md section 6.5 — example standing rule: "if a courier is GPS-stale > 15 min during a shift, draft a ping."
  Note: The 10-minute and 15-minute thresholds are referenced from different surfaces (a UI counter vs. an example standing rule) and are not necessarily the same setting. Captured as INFO so the roadmapper notices and asks whether to consolidate to one tunable threshold or keep them deliberately separate.

[INFO] Pricing floor (KD 200/month) vs design-partner #1 deal (KD 100/month)
  Found:
    - source: PRD_Darb_v2.md section 10 — "KD 2 per active courier per month, KD 200 minimum."
    - source: PRD_Darb_v2.md section 9 Q1 — "Onboard one fleet ... Charge them. Even 100 KD/month proves it has value."
  Note: The 100 KD figure for design partner #1 is intentionally below the public pricing minimum. Read as a co-design discount rather than a pricing contradiction. Captured for transparency so PROJECT.md can document the design-partner pricing exception.

[INFO] PRD treated as PROPOSED, not LOCKED, per classification
  Found:
    - source: classifications/PRD_Darb_v2.json — `locked: false`, classifier notes: "frontmatter explicitly states 'Status: Draft v0.1 — for founder review' and contains explicit 'Decisions I need from you this week' section, so requirements should be treated as proposed/draft (not locked)."
    - source: PRD_Darb_v2.md sections 13–14 — explicit founder-gated open questions and a five-item yes/no decision gate before engineering kick-off.
  Note: All decisions in `decisions.md` and all requirements in `requirements.md` carry status `proposed`. Roadmapper should preserve the founder-gated questions in PROJECT.md (or an open-questions file) and only promote items to LOCKED ADRs once explicitly approved by the founder.
