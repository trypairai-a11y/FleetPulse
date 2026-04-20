"use client";
import { useEffect, useState } from "react";
import ShortlistView, { ShortlistItem } from "@/components/shared/ShortlistView";
import { MOCK_MONEY } from "@/mocks/v2";

export default function MoneyPage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  const shortlistItems: ShortlistItem[] = [
    {
      id: "m-1",
      badge: { label: "FRAUD SIGNAL", tone: "critical" },
      title: "Saeed K. — cash gaps 4 days running",
      description:
        "Reconciliation Agent flagged: KD 32.700 unexplained across 4 consecutive days. No matching refunds.",
      meta: [{ label: "driver: Saeed K." }, { label: "total: 32.700 KD", tone: "critical" }],
      primaryAction: { label: "Review", onClick: () => {} },
      secondaryAction: { label: "Dismiss", onClick: () => {} },
    },
    {
      id: "m-2",
      badge: { label: "PENDING PAYOUT", tone: "warning" },
      title: "5 incentive payouts awaiting approval",
      description: "Total KD 1,240.000 pending for this week's incentive tier.",
      primaryAction: { label: "Open payouts", onClick: () => {} },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MoneyStat label="Cash pending" value={`KD ${MOCK_MONEY.cashPending.totalKd.toFixed(3)}`} sub={`${MOCK_MONEY.cashPending.records} records`} />
        <MoneyStat label="Cash reconciled (week)" value={`KD ${MOCK_MONEY.cashReconciled.totalKd.toFixed(0)}`} sub={`${MOCK_MONEY.cashReconciled.records} records`} />
        <MoneyStat label="Flagged discrepancies" value={`${MOCK_MONEY.flaggedDiscrepancies}`} sub="Recon Agent" tone="critical" />
        <MoneyStat label="Payouts waiting" value={`${MOCK_MONEY.pendingIncentivePayouts}`} sub="incentive tiers" tone="warning" />
      </div>

      <ShortlistView
        title="Money"
        subtitle="Cash gaps, reconciliation flags, and payouts that need attention."
        items={shortlistItems}
        loading={loading}
        browseContent={
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-secondary shadow-sm">
            Browse view — full cash ledger, billings, tax invoices, payouts table.
          </div>
        }
      />
    </div>
  );
}

function MoneyStat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "critical" | "warning" }) {
  const ring = tone === "critical" ? "ring-1 ring-red-200" : tone === "warning" ? "ring-1 ring-amber-200" : "";
  const color = tone === "critical" ? "text-red-600" : tone === "warning" ? "text-amber-700" : "text-foreground";
  return (
    <div className={"rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md " + ring}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">{label}</p>
      <p className={"mt-1 text-xl font-semibold " + color}>{value}</p>
      <p className="mt-0.5 text-[11px] text-secondary">{sub}</p>
    </div>
  );
}
