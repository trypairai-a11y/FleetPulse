"use client";
// Phase 2 Wave 5 — /admin/billing/[tenantId] per-tenant billing detail.
//
// REQ-pricing-model. UI-SPEC §3.5.3.
//
// - Header: tenant name + plan + designPartner badge
// - Big number this-month bill + breakdown text
// - OverrideToggle wired to PATCH /override
// - Past-6-months chart (inline SVG, no library)
// - Past invoices DataTable with HTML / Make PDF buttons (PDF on explicit
//   click only, per feedback_invoices_no_pdf)

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, Printer, FileText } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import { Skeleton } from "@/components/shared/Skeleton";
import ErrorState from "@/components/shared/ErrorState";
import OverrideToggle from "@/components/admin/OverrideToggle";
import SuperAdminGuard from "@/components/admin/SuperAdminGuard";
import { getBillingDetail, patchOverride } from "@/lib/adminApi";
import type { BillingDetail } from "@/types/admin";

interface ChartPoint {
  yearMonth: string;
  netKd: number;
}

function MonthlyChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.netKd), 1);
  const padding = 16;
  const width = 480;
  const height = 120;
  const barWidth = (width - padding * 2) / points.length - 6;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-md"
      role="img"
      aria-label="Past 6 months billing"
    >
      {points.map((p, i) => {
        const h = ((p.netKd / max) * (height - padding * 2)) || 2;
        const x = padding + i * ((width - padding * 2) / points.length);
        const y = height - padding - h;
        return (
          <g key={p.yearMonth}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={2}
              className="fill-primary/60"
            />
            <text
              x={x + barWidth / 2}
              y={height - 2}
              textAnchor="middle"
              className="text-[8px] fill-sand-600"
              style={{ fontFamily: "monospace" }}
            >
              {p.yearMonth.slice(5)}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 2}
              textAnchor="middle"
              className="text-[8px] fill-slate-700"
              style={{ fontFamily: "monospace" }}
            >
              {p.netKd.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminBillingDetailPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId;
  const [detail, setDetail] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBillingDetail(tenantId)
      .then((data) => {
        if (!cancelled) setDetail(data);
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
  }, [tenantId, refreshKey]);

  async function handleSaveOverride(
    override: number | null,
    reason: string,
  ): Promise<void> {
    if (!tenantId) return;
    await patchOverride(tenantId, { override, reason });
    setRefreshKey((k) => k + 1);
  }

  function handlePrintInvoice(invoiceId: string) {
    // Per feedback_invoices_no_pdf — only explicit user click triggers print.
    if (typeof window === "undefined") return;
    // Phase 2 stub: open the invoice in a new tab (HTML default per
    // feedback_invoices_no_pdf), where the user can print on demand.
    window.open(`/api/admin/billing/invoices/${invoiceId}`, "_blank");
  }

  return (
    <SuperAdminGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 print:hidden">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            All tenants
          </Link>
        </div>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <ErrorState
            error={error}
            onRetry={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {!loading && !error && detail && (
          <>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-sand-600">
                Tenant
              </p>
              <h1 className="font-display text-2xl text-slate-900">
                {detail.bill.tenantName ?? detail.bill.tenantId.slice(0, 8)}
              </h1>
              <div className="mt-1.5 flex items-center gap-2">
                {detail.bill.designPartner && (
                  <span className="inline-flex items-center rounded-pill bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
                    Design partner
                  </span>
                )}
                <span className="inline-flex items-center rounded-pill bg-sand-100 text-sand-800 text-[11px] font-medium px-2 py-0.5">
                  {detail.bill.yearMonth}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-6">
              <p className="text-[11px] uppercase tracking-widest text-sand-600 mb-1">
                This month
              </p>
              <p className="font-display text-4xl text-slate-900 tabular-nums">
                KD {Number(detail.bill.netKd).toFixed(3)}
                <span className="text-sm font-sans text-sand-600 ms-2">
                  /month
                </span>
              </p>
              <p className="mt-3 text-sm text-sand-700">
                {detail.bill.activeCouriers} active courier
                {detail.bill.activeCouriers === 1 ? "" : "s"} × KD 2 ={" "}
                <span className="font-mono">
                  KD {Number(detail.bill.computedKd).toFixed(3)}
                </span>
                {detail.bill.override != null && (
                  <>
                    {" "}
                    · override{" "}
                    <span className="font-mono">
                      KD {Number(detail.bill.override).toFixed(3)}
                    </span>
                  </>
                )}
                .
              </p>
              <p className="mt-2 text-xs text-sand-500 italic flex items-center gap-1.5">
                <Info size={12} aria-hidden="true" />A courier is "active" if
                they were online ≥ 4 hours in any single day this month.
              </p>
            </div>

            {tenantId && (
              <OverrideToggle
                tenantId={tenantId}
                currentOverride={detail.bill.override}
                onSave={handleSaveOverride}
              />
            )}

            <div className="rounded-2xl border border-sand-200 bg-white p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                Past 6 months
              </p>
              <MonthlyChart
                points={detail.past6Months
                  .slice()
                  .reverse()
                  .map((b) => ({
                    yearMonth: b.yearMonth,
                    netKd: Number(b.netKd),
                  }))}
              />
            </div>

            <div className="rounded-2xl border border-sand-200 bg-white p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                Past invoices
              </p>
              {detail.pastInvoices.length === 0 ? (
                <p className="text-sm text-sand-600 italic">
                  No invoices issued yet for this tenant.
                </p>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: "issuedAt",
                      label: "Issued",
                      render: (v: unknown) =>
                        v ? new Date(String(v)).toISOString().slice(0, 10) : "—",
                    },
                    {
                      key: "amountKd",
                      label: "Amount (KD)",
                      className: "text-right",
                      render: (v: unknown) => (
                        <span className="font-mono tabular-nums">
                          {v != null ? Number(v).toFixed(3) : "—"}
                        </span>
                      ),
                    },
                    {
                      key: "id",
                      label: "Actions",
                      render: (v: unknown) => (
                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/admin/billing/invoices/${v}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <FileText size={12} />
                            HTML
                          </a>
                          <button
                            type="button"
                            onClick={() => handlePrintInvoice(String(v))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-sand-700 hover:text-slate-900"
                          >
                            <Printer size={12} />
                            Make PDF
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  data={detail.pastInvoices}
                  rowKey="id"
                />
              )}
            </div>
          </>
        )}
      </div>
    </SuperAdminGuard>
  );
}
