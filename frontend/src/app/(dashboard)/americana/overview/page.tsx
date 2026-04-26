"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import { DollarSign, ShoppingBag, Users, AlertTriangle } from "lucide-react";
import RevenueByStoreTable from "@/components/americana/RevenueByStoreTable";
import ChainMixPanel from "@/components/americana/ChainMixPanel";
import HeadcountGapTable from "@/components/americana/HeadcountGapTable";
import { useI18n } from "@/i18n/I18nProvider";
import { formatCurrency, formatNumber } from "@/i18n/format";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AmericanaOverviewPage() {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(currentMonth());
  const { data, loading } = useApiGet<any>(`/api/americana/overview?month=${month}`);

  const revenueByStore: any[] = data?.revenueByStore ?? [];
  const chainMix = data?.chainMix;
  const headcountGap: any[] = data?.headcountGap ?? [];
  const missingRate = data?.missingRate;

  const totalRevenue = revenueByStore.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalOrders = revenueByStore.reduce((s, r) => s + r.orders, 0);
  const totalDrivers = revenueByStore.reduce((s, r) => s + (r.drivers ?? 0), 0);
  const criticalGap = headcountGap.filter((r: any) => r.gap >= 2).length;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-americana" />
          <h1 className="text-xl font-semibold">{t("americana.overviewTitle")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white"
          />
          <a
            href={`/api/americana/export?month=${month}`}
            className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            target="_blank" rel="noreferrer"
          >
            {t("americana.exportForAccounting")}
          </a>
        </div>
      </div>

      {missingRate && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {t("americana.missingRateWarning")}{" "}
            <a className="underline font-medium" href="/americana/settings/chain-rates">
              {t("americana.settingsLink")} → {t("americana.chainRates")}
            </a>
          </span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title={t("americana.revenueMtd")} value={totalRevenue > 0 ? formatCurrency(totalRevenue, locale) : "—"} icon={DollarSign} />
        <StatCard title={t("americana.ordersMtd")} value={formatNumber(totalOrders, locale)} icon={ShoppingBag} />
        <StatCard title={t("americana.activeDrivers")} value={totalDrivers} icon={Users} />
        <StatCard title={t("americana.storesNeedingDrivers")} value={criticalGap} icon={AlertTriangle} />
      </div>

      {/* Main grid: Revenue (60%) + Chain mix (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RevenueByStoreTable rows={revenueByStore} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          {chainMix && (
            <ChainMixPanel
              current={chainMix.current}
              trend={chainMix.trend}
              topChain={chainMix.topChain}
              concentrationAlert={chainMix.concentrationAlert}
            />
          )}
        </div>
      </div>

      {/* Headcount gap */}
      <HeadcountGapTable rows={headcountGap} />
    </div>
  );
}
