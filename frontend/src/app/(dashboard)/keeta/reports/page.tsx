"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import TrendChart from "@/components/keeta/TrendChart";
import TrendPill from "@/components/keeta/TrendPill";
import { Download } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/i18n/format";

type Card = { label: string; value: number; dodPct: number | null; wowPct: number | null };
type Report = { cards: Card[]; trend: { metricA: string; metricB?: string; points: any[] } };

function toCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")).join("\n");
  return header + "\n" + body;
}

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const TABS = [
    { key: "task-volumes", label: t("keetaPage.tabTaskVolumes") },
    { key: "courier-capacity", label: t("keetaPage.tabCourierCapacity") },
    { key: "delivery-experience", label: t("keetaPage.tabDeliveryExperience") },
  ];
  const [tab, setTab] = useState<string>(TABS[0].key);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = fmt(new Date());
  const monthAgo = fmt(new Date(Date.now() - 29 * 86_400_000));
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const { data } = useApiGet<Report>(`/api/keeta/reports/${tab}?from=${from}&to=${to}`);

  function downloadCsv() {
    if (!data?.trend?.points) return;
    const csv = toCsv(data.trend.points);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `keeta-report-${tab}-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{t("keetaPage.dataReports")}</h1>
        <div className="ms-auto flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1" />
          <span className="text-xs text-secondary">{t("keetaPage.toConnector")}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1" />
          <button onClick={downloadCsv} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800">
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
        {TABS.map((tabItem) => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
            className={`px-3 py-1.5 rounded-md ${tab === tabItem.key ? "bg-gray-900 text-white" : "text-gray-600"}`}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.cards.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] text-secondary uppercase tracking-wide mb-1">{c.label}</p>
                <p className="text-xl font-semibold">{typeof c.value === "number" && c.value < 1 && c.value > 0 ? `${(c.value * 100).toFixed(2)}%` : formatNumber(c.value, locale)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <TrendPill pct={c.dodPct} label={t("keetaPage.dod")} />
                  <TrendPill pct={c.wowPct} label={t("keetaPage.wow")} />
                </div>
              </div>
            ))}
          </div>
          <TrendChart
            points={data.trend.points}
            metricA={data.trend.metricA}
            metricB={data.trend.metricB}
            labelA={data.trend.metricA}
            labelB={data.trend.metricB}
          />
        </>
      )}
    </div>
  );
}
