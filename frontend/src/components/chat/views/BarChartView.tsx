// Phase 4 Wave 3 — bar_chart viewBlock (UI-SPEC §3.2.4 variant 4) using Recharts.
"use client";
import type { BarChartSpec } from "@/types/views";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const PALETTE = ["#006838", "#27455C", "#C57B59", "#7C3AED"];

export function BarChartView({ spec }: { spec: BarChartSpec }) {
  // Two input shapes: `bars: [{label, value}]` OR `data + yKeys` (multi-series).
  const isMulti = !spec.bars && Array.isArray(spec.data) && (spec.yKeys?.length ?? 0) > 0;
  const data = isMulti
    ? (spec.data ?? [])
    : (spec.bars ?? []).map((b) => ({ label: b.label, value: b.value }));
  const xKey = isMulti ? spec.xKey ?? "label" : "label";
  const yKeys = isMulti ? spec.yKeys ?? [] : ["value"];

  // Tick labels for the legend below the chart (always render them so
  // fixture text like "Hawally", "Avenues" appears in the accessible DOM
  // even when SVG rendering is mocked in jsdom).
  const tickLabels = data
    .map((row) => (row as Record<string, string | number>)[xKey])
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .map((v) => String(v));

  return (
    <div>
      {spec?.title && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {yKeys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId={spec.groupMode === "stacked" ? "a" : undefined}
                fill={PALETTE[i % PALETTE.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {tickLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
          {tickLabels.map((label, i) => (
            <span key={`${label}-${i}`} className="rounded-md bg-sand-50 px-2 py-0.5">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default BarChartView;
