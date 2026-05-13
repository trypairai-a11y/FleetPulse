// Phase 4 Wave 3 — time_series viewBlock (UI-SPEC §3.2.4 variant 3) using Recharts.
"use client";
import type { TimeSeriesSpec } from "@/types/views";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const PALETTE = ["#006838", "#27455C", "#C57B59", "#7C3AED"];

function toRows(spec: TimeSeriesSpec): { rows: Array<Record<string, string | number>>; yKeys: string[]; xKey: string } {
  if (spec.series && spec.series.length) {
    const xKey = "x";
    const yKeys = spec.series.map((s) => s.name);
    const map = new Map<string, Record<string, string | number>>();
    for (const s of spec.series) {
      for (const p of s.points) {
        const k = String(p.x);
        const row = map.get(k) ?? { [xKey]: k };
        row[s.name] = p.y;
        map.set(k, row);
      }
    }
    return { rows: Array.from(map.values()), yKeys, xKey };
  }
  return {
    rows: spec.data ?? [],
    yKeys: spec.yKeys ?? [],
    xKey: spec.xKey ?? "x",
  };
}

export function TimeSeriesView({ spec }: { spec: TimeSeriesSpec }) {
  const { rows, yKeys, xKey } = toRows(spec);
  const isArea = spec.chartType === "area";
  return (
    <div>
      {spec?.title && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isArea ? (
            <AreaChart data={rows} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {yKeys.map((k, i) => (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.18}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={rows} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E2D8" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {yKeys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TimeSeriesView;
