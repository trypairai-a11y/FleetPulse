"use client";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { AlertTriangle } from "lucide-react";

interface ChainPoint {
  chainId: string | null;
  chainName: string;
  revenue: number;
  orders: number;
  share: number;
}

interface Props {
  current: ChainPoint[];
  trend: { month: string; revenue: number }[];
  topChain: ChainPoint | null;
  concentrationAlert: boolean;
}

const PALETTE = [
  "#E11D48", "#F59E0B", "#10B981", "#2563EB", "#8B5CF6", "#EC4899", "#0EA5E9", "#64748B",
];

function Donut({ data }: { data: ChainPoint[] }) {
  const size = 140;
  const r = 56;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, d) => s + d.revenue, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-secondary w-[140px] h-[140px] border border-dashed border-gray-200 rounded-full">
        No revenue
      </div>
    );
  }
  let acc = 0;
  const arcs = data.map((d, i) => {
    const frac = d.revenue / total;
    const start = acc;
    const end = acc + frac;
    acc = end;
    const largeArc = frac > 0.5 ? 1 : 0;
    const toXY = (f: number) => {
      const angle = 2 * Math.PI * f - Math.PI / 2;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };
    const [sx, sy] = toXY(start);
    const [ex, ey] = toXY(end);
    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`}
        fill={PALETTE[i % PALETTE.length]}
      />
    );
  });
  return (
    <svg width={size} height={size}>
      {arcs}
      <circle cx={cx} cy={cy} r={r * 0.6} fill="white" />
    </svg>
  );
}

function TrendLine({ trend }: { trend: { month: string; revenue: number }[] }) {
  if (!trend.length) return null;
  const max = Math.max(...trend.map((t) => t.revenue), 1);
  const w = 220;
  const h = 70;
  const pts = trend
    .map((t, i) => `${(i / Math.max(1, trend.length - 1)) * w},${h - (t.revenue / max) * h}`)
    .join(" ");
  return (
    <div>
      <svg width={w} height={h} className="overflow-visible">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={pts} className="text-americana" />
        {trend.map((t, i) => {
          const x = (i / Math.max(1, trend.length - 1)) * w;
          const y = h - (t.revenue / max) * h;
          return <circle key={t.month} cx={x} cy={y} r={3} className="fill-americana" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-secondary mt-1">
        {trend.map((t) => <span key={t.month}>{t.month.slice(5)}</span>)}
      </div>
    </div>
  );
}

export default function ChainMixPanel({ current, trend, topChain, concentrationAlert }: Props) {
  const total = useMemo(() => current.reduce((s, c) => s + c.revenue, 0), [current]);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Chain mix</h3>
        {topChain && (
          <span className={cn("text-xs font-medium px-2 py-1 rounded-lg", concentrationAlert ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-secondary")}>
            Top: {topChain.chainName} ({Math.round(topChain.share * 100)}%)
          </span>
        )}
      </div>
      <div className="flex items-center gap-5">
        <Donut data={current} />
        <div className="flex-1 space-y-1.5 text-xs">
          {current.map((c, i) => (
            <div key={c.chainId ?? c.chainName} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="flex-1">{c.chainName}</span>
              <span className="font-mono text-secondary">{Math.round(c.share * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {concentrationAlert && (
        <div className="flex items-start gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-3 py-2 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Top chain exceeds 60% of revenue — concentration risk. Diversify if possible.</span>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium text-secondary uppercase tracking-wide mb-2">6-month revenue trend</h4>
        <TrendLine trend={trend} />
        {total > 0 && (
          <p className="text-xs text-secondary mt-1">Total MTD: <span className="font-semibold text-foreground">{total.toFixed(3)} KD</span></p>
        )}
      </div>
    </div>
  );
}
