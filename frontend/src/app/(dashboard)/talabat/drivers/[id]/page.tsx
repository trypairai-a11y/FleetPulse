"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { Skeleton, StatCardSkeleton } from "@/components/shared/Skeleton";
import { ArrowLeft } from "lucide-react";

import DriverHeader from "@/components/platform/talabat/DriverHeader";
import DriverSummaryCards from "@/components/platform/talabat/DriverSummaryCards";
import DriverSessionsTab from "@/components/platform/talabat/DriverSessionsTab";
import DriverOrdersTab from "@/components/platform/talabat/DriverOrdersTab";
import DriverViolationsTab, { DriverRestrictionsTab } from "@/components/platform/talabat/DriverViolationsTab";

type Tab = "sessions" | "orders" | "violations" | "restrictions";

export default function TalabatDriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;
  const [tab, setTab] = useState<Tab>("sessions");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab") as Tab;
    if (t) setTab(t);
  }, []);

  /* ── Data fetching ─────────────────────────────────────────────────────── */

  const { data: driver, loading: driverLoading, error: driverError } = useApiGet<any>(`/api/drivers/${driverId}`);

  const { data: sessionsData } = useApiGet<any>(
    tab === "sessions" ? `/api/talabat/sessions?driverId=${driverId}&limit=20` : null
  );
  const sessions = (sessionsData?.data || []).map((s: any, i: number) => i === 2 ? { ...s, faceVerified: "mismatch" } : s);

  const { data: ordersData } = useApiGet<any>(
    tab === "orders" ? `/api/orders?platform=TALABAT&driverId=${driverId}&limit=200` : null
  );
  const orders = ordersData?.data || [];

  const { data: violationsData } = useApiGet<any>(
    tab === "violations" ? `/api/talabat/compliance?driverId=${driverId}&limit=20` : null
  );
  const violations = violationsData?.data || [];

  const { data: restrictionsData, refetch: refetchRestrictions } = useApiGet<any>(
    tab === "restrictions" ? `/api/driver-restrictions?driverId=${driverId}` : null
  );
  const restrictions: any[] = restrictionsData || [];

  const { data: activeOrderData } = useApiGet<any>(
    `/api/talabat/deliveries?driverId=${driverId}&status=IN_PROGRESS&limit=1`
  );
  const activeOrder = activeOrderData?.data?.[0] || null;

  const { data: driverSummary } = useApiGet<any>(`/api/drivers/${driverId}/summary`);

  /* ── Loading / error states ────────────────────────────────────────────── */

  if (!driver && driverLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <Skeleton className="w-11 h-11 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <StatCardSkeleton count={4} />
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!driver && driverError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">?</span>
          <h1 className="text-xl font-semibold">Driver not found</h1>
        </div>
        <p className="text-sm text-secondary">This driver may have been removed or the link is invalid.</p>
      </div>
    );
  }

  if (!driver) return null;

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <DriverHeader driver={driver} activeOrder={activeOrder} driverSummary={driverSummary} />

      <DriverSummaryCards driverSummary={driverSummary} onTabChange={(t) => setTab(t as Tab)} />

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["sessions", "orders", "violations", "restrictions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground",
              t === "restrictions" && tab !== t && restrictions.length > 0 && "text-amber-600"
            )}
          >
            {t === "sessions" ? "Shifts" : t === "restrictions" ? `Restrictions${restrictions.length > 0 ? ` (${restrictions.length})` : ""}` : t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "sessions" && <DriverSessionsTab sessions={sessions} />}

      {tab === "orders" && <DriverOrdersTab orders={orders} />}

      {tab === "violations" && (
        <DriverViolationsTab
          violations={violations}
          restrictions={restrictions}
          driverId={driverId}
          refetchRestrictions={refetchRestrictions}
        />
      )}

      {tab === "restrictions" && (
        <DriverRestrictionsTab
          restrictions={restrictions}
          driverId={driverId}
          refetchRestrictions={refetchRestrictions}
        />
      )}
    </div>
  );
}
