"use client";
// Phase 2 Wave 5 — Standalone report page at /admin/onboarding/[tenantId]/report.
//
// Use case: founder shares a printable PDF in a sales conversation. The
// page is a thin wrapper around DarbsReadReport — no wizard chrome,
// just the report. Print-stylesheet hides the back link.
//
// Super-admin gated client-side via SuperAdminGuard; backend enforces.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getReport } from "@/lib/adminApi";
import type { ReportData } from "@/types/admin";
import { DarbsReadReport } from "@/components/admin/DarbsReadReport";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/shared/Skeleton";
import SuperAdminGuard from "@/components/admin/SuperAdminGuard";

export default function AdminReportPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getReport(tenantId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <SuperAdminGuard>
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/admin/onboarding"
            className="inline-flex items-center gap-1.5 text-sm text-sand-600 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            Back to onboarding
          </Link>
        </div>

        {loading && (
          <div className="space-y-4 max-w-3xl">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {error && (
          <ErrorState
            error={error}
            onRetry={() => {
              if (!tenantId) return;
              setLoading(true);
              setError(null);
              getReport(tenantId)
                .then(setReport)
                .catch((err) =>
                  setError(err instanceof Error ? err.message : String(err)),
                )
                .finally(() => setLoading(false));
            }}
          />
        )}

        {!loading && !error && report && <DarbsReadReport data={report} />}
      </div>
    </SuperAdminGuard>
  );
}
