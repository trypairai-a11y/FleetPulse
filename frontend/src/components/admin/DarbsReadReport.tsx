"use client";
// Phase 2 Wave 5 — DarbsReadReport.
//
// REQ-gtm-onboarding + UI-SPEC §3.4.3.
//
// The 9-section closing artifact in the founder's onboarding flow. Renders
// in two contexts:
//   1. Step 5 of the /admin/onboarding wizard (ReportPreview).
//   2. Standalone /admin/onboarding/[tenantId]/report page (for sharing).
//
// Visual contract (Wave 0 RED test + user memories):
//   - bg-white root container — NO gradient, NO watermark
//     (per feedback_invoices_white_background user memory).
//   - "Print to PDF" button is rendered but NEVER auto-fires window.print
//     on mount (per feedback_invoices_no_pdf user memory). User must click
//     explicitly.
//   - All 9 sections must render top to bottom: cover, top-line numbers,
//     top 5 performers, bottom 5 performers, cash exposure, violations,
//     what Darb would have done, what this costs, footer.
//
// The component accepts both the strict backend ReportData shape AND the
// looser test-fixture shape (Wave 0 RED test mocks fields like
// `cover.founderSignature` instead of `cover.founderSignatureLine`,
// `top5Performers[].name + compositeScore` instead of `driverName + score`).
// Normalisation lives at the per-field accessors below.

import { useState } from "react";
import {
  Calendar,
  Wallet,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2,
  Printer,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import type { ReportData } from "@/types/admin";

interface DarbsReadReportProps {
  data: ReportData;
  printMode?: boolean;
}

// ─── Normalisers ──────────────────────────────────────────────────────────
// Bridge backend strict shape ↔ test-fixture loose shape. Each accessor
// picks the strict field first, then falls back to the test-fixture alias.

function coverFounderLine(cover: ReportData["cover"]): string {
  // Strict backend shape uses founderSignatureLine; test mock uses
  // founderSignature. Default to a stable line.
  return (
    (cover as { founderSignatureLine?: string }).founderSignatureLine ??
    (cover as { founderSignature?: string }).founderSignature ??
    "Read by Darb — your AI chief of staff."
  );
}

function topLineHours(t: ReportData["topLineNumbers"]): number {
  return (
    (t as { totalOnlineHours?: number }).totalOnlineHours ??
    (t as { onlineHours?: number }).onlineHours ??
    0
  );
}

interface NormalisedPerformer {
  driverId: string;
  name: string;
  score: number;
  orders: number;
  revenueKd?: number;
  critique?: string;
}

function normalisePerformer(
  p: ReportData["top5Performers"][number] | ReportData["bottom5Performers"][number],
): NormalisedPerformer {
  const obj = p as Record<string, unknown>;
  return {
    driverId: String(obj.driverId ?? ""),
    name: String(obj.driverName ?? obj.name ?? "(unknown)"),
    score: Number(obj.score ?? obj.compositeScore ?? 0),
    orders: Number(obj.ordersCompleted ?? obj.orders ?? 0),
    revenueKd: typeof obj.revenueKd === "number" ? obj.revenueKd : undefined,
    critique:
      typeof obj.agentCritique === "string"
        ? obj.agentCritique
        : typeof obj.critique === "string"
          ? obj.critique
          : undefined,
  };
}

function normaliseCashTopRisks(c: ReportData["cashExposure"]) {
  const strictRisks = (c as { top3RiskyReceivables?: Array<{ driverId: string; driverName: string; amountKd: number }> })
    .top3RiskyReceivables;
  if (Array.isArray(strictRisks)) return strictRisks;
  const looseRisks = (c as { topRisks?: Array<{ driverId: string; driverName: string; amountKd: number }> }).topRisks;
  return Array.isArray(looseRisks) ? looseRisks : [];
}

function normaliseViolationsByType(v: ReportData["violations"]): Record<string, number> {
  const strict = (v as { countByType?: Record<string, number> }).countByType;
  if (strict && typeof strict === "object") return strict;
  const loose = (v as { byType?: Record<string, number> }).byType;
  return loose && typeof loose === "object" ? loose : {};
}

function normaliseWhatThisCosts(w: ReportData["whatThisCosts"]) {
  const obj = w as Record<string, unknown>;
  const fleetSize = Number(obj.fleetSize ?? 0);
  const monthlyKd = Number(obj.monthlyKd ?? obj.computedKd ?? 0);
  const overrideKd =
    obj.overrideKd === null
      ? null
      : obj.overrideKd === undefined
        ? null
        : Number(obj.overrideKd);
  const netKd = obj.netKd != null ? Number(obj.netKd) : (overrideKd ?? monthlyKd);
  // Formula string — prefer pre-computed `formula` (test fixture) or
  // `breakdown` (backend); else synthesise from numbers.
  const formula =
    typeof obj.formula === "string"
      ? obj.formula
      : typeof obj.breakdown === "string"
        ? obj.breakdown
        : `${fleetSize} × KD 2 = KD ${monthlyKd.toFixed(0)}`;
  return { fleetSize, monthlyKd, overrideKd, netKd, formula };
}

function normaliseFooter(f: ReportData["footer"]) {
  const obj = f as Record<string, unknown>;
  return {
    contactEmail: typeof obj.contactEmail === "string" ? obj.contactEmail : "founder@darb.kw",
    contactName: typeof obj.contactName === "string" ? obj.contactName : "",
    signatureLine: typeof obj.signatureLine === "string" ? obj.signatureLine : "",
    trialDays: typeof obj.trialDays === "number" ? obj.trialDays : 14,
    trialStartButtonHref:
      typeof obj.trialStartButtonHref === "string" ? obj.trialStartButtonHref : "#start-trial",
  };
}

// ─── Platform colour swatches (UI-SPEC §7.3) ─────────────────────────────
const PLATFORM_TILE_BG: Record<string, string> = {
  KEETA: "bg-amber-50 border-amber-200 text-amber-800",
  TALABAT: "bg-orange-50 border-orange-200 text-orange-800",
  DELIVEROO: "bg-teal-50 border-teal-200 text-teal-800",
  AMERICANA: "bg-sky-50 border-sky-200 text-sky-800",
  UNKNOWN: "bg-sand-50 border-sand-200 text-sand-800",
};

// Inline SVG horizontal bar chart for violations.byType (no chart library
// per UI-SPEC §3.4.3 §6).
function ViolationBarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-sand-600 italic">
        No violations recorded in this window.
      </p>
    );
  }
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="space-y-2">
      {entries.map(([type, count]) => {
        const pct = max > 0 ? (count / max) * 100 : 0;
        return (
          <div key={type} className="flex items-center gap-3 text-xs">
            <span className="w-40 truncate text-sand-700 font-medium">{type}</span>
            <div className="flex-1 bg-sand-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-red-400"
                style={{ width: `${pct}%` }}
                aria-label={`${type}: ${count} occurrences`}
              />
            </div>
            <span className="w-8 text-right font-mono tabular-nums text-sand-900">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DarbsReadReport({ data, printMode = false }: DarbsReadReportProps) {
  const [printing, setPrinting] = useState(false);

  // Explicit user click → window.print(). Per feedback_invoices_no_pdf, NEVER
  // auto-fire on mount. The `useEffect`-less default keeps the side effect
  // strictly user-initiated.
  const handlePrint = () => {
    if (typeof window === "undefined") return;
    setPrinting(true);
    try {
      window.print();
    } finally {
      // Reset state after a tick so the button is responsive again.
      setTimeout(() => setPrinting(false), 250);
    }
  };

  const cover = data.cover;
  const tenantName = (cover as { tenantName: string }).tenantName;
  const fleetSize =
    (cover as { fleetSize?: number }).fleetSize ?? data.top5Performers.length;
  const dateRange = (cover as { dateRange: { from: string; to: string } }).dateRange;
  const founderLine = coverFounderLine(cover);

  const tl = data.topLineNumbers as {
    totalOrders: number;
    totalRevenueKd: number;
    courierCount: number;
    completionRate: number;
  };
  const onlineHours = topLineHours(data.topLineNumbers);

  const top5 = data.top5Performers.map(normalisePerformer);
  const bottom5 = data.bottom5Performers.map(normalisePerformer);

  const cashExposure = data.cashExposure as {
    totalOutstandingKd: number;
    byPlatform: Record<string, number>;
  };
  const cashTopRisks = normaliseCashTopRisks(data.cashExposure);

  const violationsByType = normaliseViolationsByType(data.violations);
  const violationsMostCommon =
    (data.violations as { mostCommonPattern?: string }).mostCommonPattern ?? "—";
  const violationsTotal =
    (data.violations as { totalCount?: number }).totalCount ??
    Object.values(violationsByType).reduce((acc, n) => acc + n, 0);

  const cards = data.whatDarbWouldHaveDone;

  const cost = normaliseWhatThisCosts(data.whatThisCosts);
  const footer = normaliseFooter(data.footer);

  return (
    <div
      className="bg-white text-slate-900 max-w-[8.5in] mx-auto p-12 border border-sand-200 print:border-0 print:p-0 print:max-w-none"
      data-component="darbs-read-report"
    >
      {/* Print-to-PDF affordance — does NOT auto-fire on mount. */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          disabled={printing}
          className="inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium border border-sand-200 hover:bg-sand-50 transition-colors duration-200 disabled:opacity-50"
          aria-label="Print to PDF"
        >
          <Printer size={14} />
          <span>Print to PDF</span>
        </button>
      </div>

      {/* SECTION 1 — Cover */}
      <section data-section="cover" className="mb-12 pb-8 border-b border-sand-200">
        <p className="text-[11px] uppercase tracking-[0.18em] text-sand-600 mb-3">
          Darb's read on your fleet
        </p>
        <h1 className="font-display text-[40px] leading-tight text-slate-900 mb-4">
          {tenantName}
        </h1>
        <p className="text-sm text-sand-700 mb-6">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} className="text-sand-500" />
            <span>
              {dateRange.from} → {dateRange.to}
            </span>
          </span>
          {fleetSize > 0 && (
            <>
              <span className="mx-2 text-sand-300">·</span>
              <span>{fleetSize} couriers in fleet</span>
            </>
          )}
        </p>
        <p className="text-sm italic text-sand-700 leading-relaxed max-w-prose">
          {founderLine}
        </p>
      </section>

      {/* SECTION 2 — Top-line numbers */}
      <section data-section="top-line-numbers" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-5">
          Top-line numbers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard title="Total orders" value={tl.totalOrders.toLocaleString()} />
          <StatCard
            title="Revenue"
            value={`KD ${tl.totalRevenueKd.toFixed(0)}`}
          />
          <StatCard title="Couriers" value={tl.courierCount} />
          <StatCard
            title="Online hours"
            value={onlineHours.toLocaleString()}
          />
          <StatCard
            title="Completion"
            value={`${Math.round(tl.completionRate * 100)}%`}
          />
        </div>
      </section>

      {/* SECTION 3 — Top 5 performers */}
      <section data-section="top-5-performers" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-2 flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" />
          <span>Top 5 performers</span>
        </h2>
        <p className="text-sm text-sand-600 mb-4">
          Highest composite score in the window. Order volume in parens.
        </p>
        {top5.length === 0 ? (
          <p className="text-sm text-sand-600 italic">No performance data yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-sand-200 text-left text-[11px] uppercase tracking-wider text-sand-600">
                <th className="py-2 pe-2 font-medium w-10">#</th>
                <th className="py-2 px-2 font-medium">Courier</th>
                <th className="py-2 px-2 font-medium text-right">Score</th>
                <th className="py-2 ps-2 font-medium text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((p, i) => (
                <tr key={p.driverId} className="border-b border-sand-100">
                  <td className="py-2.5 pe-2 text-sand-500 font-mono">
                    {i + 1}
                  </td>
                  <td className="py-2.5 px-2 text-slate-900 font-medium">
                    {p.name}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-900 font-semibold tabular-nums">
                    {p.score}
                  </td>
                  <td className="py-2.5 ps-2 text-right text-sand-700 tabular-nums">
                    {p.orders.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* SECTION 4 — Bottom 5 performers */}
      <section data-section="bottom-5-performers" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-2 flex items-center gap-2">
          <TrendingDown size={20} className="text-amber-600" />
          <span>Bottom 5 performers</span>
        </h2>
        <p className="text-sm text-sand-600 mb-4">
          Lowest composite scores. Use as coaching candidates, not punishment lists.
        </p>
        {bottom5.length === 0 ? (
          <p className="text-sm text-sand-600 italic">No performance data yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-sand-200 text-left text-[11px] uppercase tracking-wider text-sand-600">
                <th className="py-2 pe-2 font-medium w-10">#</th>
                <th className="py-2 px-2 font-medium">Courier</th>
                <th className="py-2 px-2 font-medium text-right">Score</th>
                <th className="py-2 px-2 font-medium text-right">Orders</th>
                <th className="py-2 ps-2 font-medium">Agent critique</th>
              </tr>
            </thead>
            <tbody>
              {bottom5.map((p, i) => (
                <tr key={p.driverId} className="border-b border-sand-100">
                  <td className="py-2.5 pe-2 text-sand-500 font-mono">
                    {i + 1}
                  </td>
                  <td className="py-2.5 px-2 text-slate-900 font-medium">
                    {p.name}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-900 font-semibold tabular-nums">
                    {p.score}
                  </td>
                  <td className="py-2.5 px-2 text-right text-sand-700 tabular-nums">
                    {p.orders.toLocaleString()}
                  </td>
                  <td className="py-2.5 ps-2 text-sand-600 italic">
                    {p.critique ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* SECTION 5 — Cash exposure */}
      <section data-section="cash-exposure" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-2 flex items-center gap-2">
          <Wallet size={20} className="text-sky-600" />
          <span>Cash exposure</span>
        </h2>
        <p className="text-sm text-sand-600 mb-4">
          Outstanding settlements as of {dateRange.to}.
        </p>
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-wider text-sand-600 mb-1">
            Total outstanding
          </p>
          <p className="font-display text-3xl text-slate-900 tabular-nums">
            KD {cashExposure.totalOutstandingKd.toFixed(3)}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {Object.entries(cashExposure.byPlatform).map(([platform, amount]) => {
            const tone = PLATFORM_TILE_BG[platform] ?? PLATFORM_TILE_BG.UNKNOWN;
            return (
              <div
                key={platform}
                className={`rounded-2xl border p-4 ${tone}`}
              >
                <p className="text-[11px] uppercase tracking-wider opacity-80">
                  {platform}
                </p>
                <p className="font-display text-xl mt-1 tabular-nums">
                  KD {Number(amount).toFixed(3)}
                </p>
              </div>
            );
          })}
        </div>
        {cashTopRisks.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-sand-600 mb-2">
              Top risky receivables
            </p>
            <ul className="space-y-1.5">
              {cashTopRisks.map((r) => (
                <li
                  key={r.driverId}
                  className="flex justify-between text-sm border-b border-sand-100 py-1.5"
                >
                  <span className="text-slate-900">{r.driverName}</span>
                  <span className="font-mono tabular-nums text-sand-700">
                    KD {r.amountKd.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* SECTION 6 — Violations */}
      <section data-section="violations" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-500" />
          <span>Violations</span>
        </h2>
        <p className="text-sm text-sand-600 mb-4">
          {violationsTotal} incident{violationsTotal === 1 ? "" : "s"} detected
          across the window.
        </p>
        <ViolationBarChart data={violationsByType} />
        {violationsMostCommon && violationsMostCommon !== "—" && (
          <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-amber-700 mb-1">
              Most common pattern
            </p>
            <p className="text-sm text-amber-900">{violationsMostCommon}</p>
          </div>
        )}
      </section>

      {/* SECTION 7 — What Darb would have done */}
      <section data-section="what-darb-would-have-done" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-2 flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          <span>What Darb would have done</span>
        </h2>
        <p className="text-sm text-sand-600 mb-4">
          Up to 10 simulated proposals. Each card shows the action your AI
          chief of staff would have drafted and the reasoning behind it. None
          of these were sent — propose-and-confirm only fires when an owner
          approves.
        </p>
        {cards.length === 0 ? (
          <p className="text-sm text-sand-600 italic">
            No proposals in this window — the agent is still learning your fleet.
          </p>
        ) : (
          <ol className="space-y-3">
            {cards.map((c, i) => (
              <li
                key={`${c.action}-${i}`}
                className="rounded-2xl border border-sand-200 bg-sand-50/40 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                    {c.action}
                  </span>
                  {c.dateRange && (
                    <span className="text-[11px] text-sand-500 font-mono">
                      {c.dateRange.from} → {c.dateRange.to}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-1.5">
                  {c.courierName}
                </p>
                <p className="text-sm text-sand-700 leading-relaxed">
                  {c.reasoning}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* SECTION 8 — What this costs */}
      <section data-section="what-this-costs" className="mb-12">
        <h2 className="font-display text-2xl text-slate-900 mb-2">
          What this costs
        </h2>
        <p className="text-sm text-sand-600 mb-5">
          KD 2 per active courier per month. Floor at KD 200/month. Design
          partners can negotiate an override — see footer to start a 14-day
          trial.
        </p>
        <div className="rounded-2xl border border-sand-200 p-6 bg-sand-50/40">
          <p className="font-display text-4xl text-slate-900 tabular-nums">
            KD {cost.netKd.toFixed(3)}
            <span className="text-sm text-sand-600 font-sans align-middle ms-2">
              / month
            </span>
          </p>
          <p className="mt-3 text-sm text-sand-700 leading-relaxed">
            {cost.formula}
          </p>
          {cost.overrideKd != null && cost.overrideKd !== cost.monthlyKd && (
            <p className="mt-2 text-xs text-primary">
              Design-partner override applied: KD {cost.overrideKd.toFixed(3)}/month.
            </p>
          )}
        </div>
      </section>

      {/* SECTION 9 — Footer */}
      <section
        data-section="footer"
        className="mt-12 pt-8 border-t border-sand-200 print:break-inside-avoid"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {footer.contactName && (
              <p className="text-sm font-medium text-slate-900">
                {footer.contactName}
              </p>
            )}
            <p className="text-sm text-sand-700">
              <a
                href={`mailto:${footer.contactEmail}`}
                className="underline-offset-2 hover:underline"
              >
                {footer.contactEmail}
              </a>
            </p>
            {footer.signatureLine && (
              <p className="mt-2 text-xs text-sand-600 italic max-w-prose">
                {footer.signatureLine}
              </p>
            )}
          </div>
          {!printMode && (
            <a
              href={footer.trialStartButtonHref}
              className="inline-flex items-center gap-2 rounded-pill bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary-hover transition-colors duration-200 print:hidden"
            >
              <CheckCircle2 size={16} />
              Start {footer.trialDays}-day trial
            </a>
          )}
        </div>
      </section>

      {/* Print stylesheet — keep PDF output clean. */}
      <style jsx>{`
        @media print {
          [data-component="darbs-read-report"] {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

export default DarbsReadReport;
