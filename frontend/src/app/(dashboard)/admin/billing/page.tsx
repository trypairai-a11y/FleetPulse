"use client";
// Phase 2 Wave 5 — /admin/billing fleet-wide billing dashboard.
//
// REQ-pricing-model. UI-SPEC §3.5.2.
//
// KPI strip (3 StatCards): Total tenants / MRR (KD) / Active couriers
// across fleets. Month picker (default current). DataTable with columns:
// Tenant / Plan / Active / Bill / Override / Trial.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Building2, Wallet } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import { Skeleton } from "@/components/shared/Skeleton";
import ErrorState from "@/components/shared/ErrorState";
import SuperAdminGuard from "@/components/admin/SuperAdminGuard";
import { listBilling } from "@/lib/adminApi";
import type { BillingTenant, BillingTotals } from "@/types/admin";

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function trialDaysLeft(trialEndsAt: BillingTenant["trialEndsAt"]): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function AdminBillingPage() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const [tenants, setTenants] = useState<BillingTenant[] | null>(null);
  const [totals, setTotals] = useState<BillingTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listBilling(month)
      .then((resp) => {
        if (cancelled) return;
        setTenants(resp.tenants);
        setTotals(resp.totals);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const columns = [
    {
      key: "tenantName",
      label: "Tenant",
      render: (_v: unknown, row: BillingTenant) => (
        <span className="font-medium text-slate-900">
          {row.tenantName ?? row.tenantId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (_v: unknown, row: BillingTenant) =>
        row.designPartner ? (
          <span className="inline-flex items-center rounded-pill bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
            Design partner
          </span>
        ) : (
          <span className="inline-flex items-center rounded-pill bg-sand-100 text-sand-800 text-[11px] font-medium px-2 py-0.5">
            Standard
          </span>
        ),
    },
    {
      key: "activeCouriers",
      label: "Active",
      className: "text-right",
      render: (v: unknown) => (
        <span className="font-mono tabular-nums">{Number(v).toLocaleString()}</span>
      ),
    },
    {
      key: "netKd",
      label: "Bill (KD)",
      className: "text-right",
      render: (_v: unknown, row: BillingTenant) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {Number(row.netKd).toFixed(3)}
        </span>
      ),
    },
    {
      key: "override",
      label: "Override",
      render: (_v: unknown, row: BillingTenant) =>
        row.override != null ? (
          <span className="inline-flex items-center rounded-pill bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
            ✓ KD {Number(row.override).toFixed(3)}
          </span>
        ) : (
          <span className="text-xs text-sand-500">—</span>
        ),
    },
    {
      key: "trialEndsAt",
      label: "Trial",
      render: (_v: unknown, row: BillingTenant) => {
        const days = trialDaysLeft(row.trialEndsAt);
        if (days == null) return <span className="text-xs text-sand-500">—</span>;
        return (
          <span className="text-xs text-sand-700 font-mono">
            {days} day{days === 1 ? "" : "s"} left
          </span>
        );
      },
    },
  ];

  return (
    <SuperAdminGuard>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-sand-600">
              Founder dashboard
            </p>
            <h1 className="font-display text-2xl text-slate-900">Billing</h1>
            <p className="text-sm text-sand-600 mt-0.5">
              Fleet-wide monthly bill, with per-tenant override and trial state.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-sand-500" />
            <span className="text-sand-700">Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-sand-200 text-sm"
            />
          </label>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!loading && totals && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total tenants"
              value={totals.tenantCount}
              icon={Building2}
            />
            <StatCard
              title="MRR (this month)"
              value={`KD ${totals.mrrKd.toFixed(3)}`}
              icon={Wallet}
            />
            <StatCard
              title="Active couriers (all fleets)"
              value={totals.activeCouriersAcrossFleets.toLocaleString()}
            />
          </div>
        )}

        {!loading && error && (
          <ErrorState
            error={error}
            onRetry={() => setMonth((m) => m)}
          />
        )}

        {!loading && tenants && tenants.length > 0 && (
          <DataTable
            columns={columns}
            data={tenants}
            rowKey="tenantId"
            onRowClick={(row) =>
              router.push(`/admin/billing/${row.tenantId}`)
            }
          />
        )}

        {!loading && tenants && tenants.length === 0 && (
          <div className="py-16 text-center text-sand-600 text-sm">
            No tenants yet. Onboard one via /admin/onboarding.
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}
