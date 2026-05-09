/**
 * Phase 2 — propose tools aggregator.
 *
 * Side-effect imports — each module self-registers its tool on load. The
 * monitor agent (and triage / reconciliation / narrator where allow-listed)
 * see these tools in `toolRegistry.list(...)` immediately after the import
 * resolves.
 *
 * Three propose tools ship with Phase 2:
 *   - draftCourierMessage  — LIVE write tool. Sends a Notification after
 *                            human Confirm. The only Phase 2 tool whose
 *                            execute body actually mutates production data.
 *   - flagForReview        — Audit-only review flag. Wave 2 approve route
 *                            writes the AgentAction row; execute body is a
 *                            no-op shape.
 *   - proposeCashReminder  — Audit-only cash reminder. Phase 8 wires it to
 *                            the live Cash Workbench (recordCashSettlement
 *                            + sendCourierMessage). Phase 2 returns a
 *                            structured payload only.
 *
 * REQ-agent-action-drafting / REQ-agent-propose-confirm.
 */

import "./draftCourierMessage";
import "./flagForReview";
import "./proposeCashReminder";
