"use client";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

type Point = { date: string; [k: string]: any };

export default function TrendChart({
  points, metricA, metricB, labelA, labelB,
}: { points: Point[]; metricA: string; metricB?: string; labelA: string; labelB?: string; }) {
  const [mode, setMode] = useState<"discrete" | "accumulative">("discrete");

  const data = useMemo(() => {
    if (mode === "discrete") return points;
    let runA = 0, runB = 0;
    return points.map((p) => {
      runA += Number(p[metricA] ?? 0);
      if (metricB) runB += Number(p[metricB] ?? 0);
      return { ...p, [metricA]: runA, ...(metricB ? { [metricB]: runB } : {}) };
    });
  }, [mode, points, metricA, metricB]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Trend</h3>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
          {(["discrete", "accumulative"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md capitalize ${mode === m ? "bg-gray-900 text-white" : "text-gray-600"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: 260 }} dir="ltr">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey={metricA} name={labelA} stroke="#f59e0b" strokeWidth={2} dot={false} />
            {metricB && <Line type="monotone" dataKey={metricB} name={labelB} stroke="#3b82f6" strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
