"use client";

import Link from "next/link";
import { useApiGet } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { cn } from "@/lib/cn";
import {
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  TrendingUp,
  TrendingDown,
  PackageX,
  Coins,
} from "lucide-react";

type ZoneRow = {
  zone: string;
  today: number;
  avg7: number;
  severity: "green" | "amber" | "red";
};

type RiderRow = {
  driverId: string;
  name: string;
  deliveries: number;
  utr: number;
  unassignedLinked: number;
};

type Overview = {
  unassignedByZone: ZoneRow[];
  topRiders: RiderRow[];
  bottomRiders: RiderRow[];
  kpis: {
    deliveries: number;
    cashKwd: number;
    tipsKwd: number;
    unassigned: number;
    dodPct: {
      deliveries: number | null;
      cashKwd: number | null;
      tipsKwd: number | null;
      unassigned: number | null;
    };
  };
  thresholds: { amber: number; red: number };
};

const SEVERITY: Record<ZoneRow["severity"], string> = {
  green: "bg-green-50 text-green-700 ring-green-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
};

export default function DeliverooOverviewPage() {
  const { data, loading, error } = useApiGet<Overview>("/api/platform-overview/deliveroo/overview");

  if (loading || !data) return <PageSkeleton />;
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;

  const { unassignedByZone, topRiders, bottomRiders, kpis } = data;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-deliveroo" />
        <h1 className="text-xl font-semibold">Deliveroo</h1>
        <span className="text-secondary/30 text-lg font-light">/</span>
        <span className="text-xl text-secondary font-medium">Overview</span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          label="Deliveries today"
          value={kpis.deliveries.toLocaleString()}
          dod={kpis.dodPct.deliveries}
          invert={false}
        />
        <KPI
          label="Cash collected"
          value={`${kpis.cashKwd.toFixed(3)} KD`}
          dod={kpis.dodPct.cashKwd}
          invert={false}
        />
        <KPI
          label="Tips"
          value={`${kpis.tipsKwd.toFixed(3)} KD`}
          dod={kpis.dodPct.tipsKwd}
          invert={false}
        />
        <KPI
          label="Unassigned"
          value={kpis.unassigned.toLocaleString()}
          dod={kpis.dodPct.unassigned}
          invert={true}
          icon={PackageX}
        />
      </div>

      {/* Unassigned by zone */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Unassigned orders by zone — today</h2>
          <Link
            href="/deliveroo/violations?violationType=DELIVEROO_UNASSIGNED_ORDER"
            className="text-xs text-deliveroo hover:underline"
          >
            View all
          </Link>
        </div>

        {unassignedByZone.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
            No metrics ingested yet today.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {unassignedByZone.map((z) => (
              <Link
                key={z.zone}
                href={`/deliveroo/violations?violationType=DELIVEROO_UNASSIGNED_ORDER&zone=${encodeURIComponent(z.zone)}`}
                className={cn(
                  "block rounded-xl p-4 ring-1 transition-transform hover:-translate-y-0.5",
                  SEVERITY[z.severity]
                )}
              >
                <div className="flex items-center gap-2 text-xs font-medium opacity-70">
                  <MapPin size={12} /> {z.zone}
                </div>
                <div className="mt-2 text-3xl font-semibold tabular-nums">{z.today}</div>
                <div className="mt-1 text-xs opacity-70">7-day avg {z.avg7}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top / Bottom riders */}
      <section className="grid gap-4 md:grid-cols-2">
        <RiderList title="Top 5 riders this week" rows={topRiders} tone="top" />
        <RiderList title="Bottom 5 riders this week" rows={bottomRiders} tone="bottom" />
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  dod,
  invert,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  dod: number | null;
  invert: boolean;
  icon?: React.ComponentType<any>;
}) {
  const positive = dod != null && dod >= 0;
  const good = invert ? !positive : positive;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500">
        {Icon ? <Icon size={12} className="text-gray-400" /> : null}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-xs",
          dod == null ? "text-gray-400" : good ? "text-green-600" : "text-red-600"
        )}
      >
        {dod == null ? (
          "—"
        ) : (
          <>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(dod).toFixed(1)}% DoD
          </>
        )}
      </div>
    </div>
  );
}

function RiderList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: RiderRow[];
  tone: "top" | "bottom";
}) {
  const Icon = tone === "top" ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={14} className={tone === "top" ? "text-green-600" : "text-red-500"} />
          {title}
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-400">No rider data this week.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.driverId} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/deliveroo/drivers/${r.driverId}`}
                className="text-sm font-medium hover:underline"
              >
                {r.name}
              </Link>
              <div className="flex items-center gap-4 text-xs text-gray-600 tabular-nums">
                <span title="Deliveries">{r.deliveries} deliv.</span>
                <span title="UTR (deliveries / online h)">UTR {r.utr.toFixed(2)}</span>
                {r.unassignedLinked > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                    <AlertCircle size={10} /> {r.unassignedLinked}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
