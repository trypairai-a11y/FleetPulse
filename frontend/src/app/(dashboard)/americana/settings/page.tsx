"use client";
import Link from "next/link";
import { Building2, Store, FileText, Coins, Inbox, Target } from "lucide-react";

const SECTIONS = [
  { href: "/americana/settings/chains", label: "Chains", blurb: "KFC, Pizza Hut, Hardees and so on.", icon: Building2 },
  { href: "/americana/settings/stores", label: "Stores", blurb: "Branches with manager contact info and area.", icon: Store },
  { href: "/americana/settings/contracts", label: "Contracts", blurb: "Upload signed contract PDFs for OCR rate extraction.", icon: FileText },
  { href: "/americana/settings/chain-rates", label: "Chain rates", blurb: "Per-chain × vehicle-type rate table.", icon: Coins },
  { href: "/americana/settings/ingest", label: "Daily ingest", blurb: "IMAP inbox config, manual upload, ingestion history.", icon: Inbox },
  { href: "/americana/settings/targets", label: "Targets & tier weights", blurb: "Monthly-order targets, tier thresholds and weights.", icon: Target },
];

export default function AmericanaSettingsPage() {
  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-americana" />
        <h1 className="text-xl font-semibold">Americana — Settings</h1>
      </div>
      <p className="text-sm text-secondary">
        Americana is a B2B corporate contract fleet. Configure the chains you serve, the stores you staff, the contracts you operate under,
        and the rates you invoice at.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-americana/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-americana/10 text-americana flex items-center justify-center">
                <s.icon size={18} />
              </div>
              <h2 className="text-base font-semibold">{s.label}</h2>
            </div>
            <p className="text-sm text-secondary">{s.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
