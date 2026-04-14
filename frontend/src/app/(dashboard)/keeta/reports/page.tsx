"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import TrendChart from "@/components/keeta/TrendChart";
import TrendPill from "@/components/keeta/TrendPill";
import { Download } from "lucide-react";

type Card = { label: string; value: number; dodPct: number | null; wowPct: number | null };
type Report = { cards: Card[]; trend: { metricA: string; metricB?: string; points: any[] } };

const TABS = [
  { key: "task-volumes", label: "Task Volumes" },
  { key: "courier-capacity", label: "Courier Capacity" },
  { key: "delivery-experience", label: "Delivery Experience" },
];

function toCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(",")).join("\n");
  return header + "\n" + body;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<string>(TABS[0].key);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
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
        <h1 className="text-xl font-semibold">Data Reports</h1>
        <div className="ms-auto flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1" />
          <span className="text-xs text-secondary">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1" />
          <button onClick={downloadCsv} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800">
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md ${tab === t.key ? "bg-gray-900 text-white" : "text-gray-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.cards.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] text-secondary uppercase tracking-wide mb-1">{c.label}</p>
                <p className="text-xl font-semibold">{typeof c.value === "number" && c.value < 1 && c.value > 0 ? `${(c.value * 100).toFixed(2)}%` : c.value.toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <TrendPill pct={c.dodPct} label="DoD" />
                  <TrendPill pct={c.wowPct} label="WoW" />
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
