"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";

type Goal = { id: string; name: string; weight: number; targetValue: number; minThreshold: number };
type Tier = { id: string; kind: string; level: string; minRate: number; maxRate: number; payment: number };
type Round = {
  id: string; period: string; vehicleType: string; initialTarget: number; adjustedTarget: number | null;
  partner: { name: string } | null;
  goals: Goal[]; tiers: Tier[];
};

export default function RoundDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [vehicleTab, setVehicleTab] = useState<"CAR" | "MOTORCYCLE">("MOTORCYCLE");
  const { data: round, refetch } = useApiGet<Round>(`/api/incentives/rounds/${id}`);

  async function recompute() {
    const res = await fetch(`/api/incentives/rounds/${id}/recompute`, { method: "POST", credentials: "include" });
    if (res.ok) {
      const r = await res.json();
      alert(`Recomputed ${r.computed} payouts`);
      refetch();
    } else alert("Recompute failed");
  }

  if (!round) return <div className="p-6 text-secondary text-sm">Loading…</div>;
  const experience = round.tiers.filter((t) => t.kind === "EXPERIENCE");
  const validDa = round.tiers.filter((t) => t.kind === "VALID_DA");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Round {round.period} · {round.partner?.name ?? "—"}</h1>
        <div className="ms-auto flex items-center gap-2">
          <Link href={`/keeta/incentives/${id}/payouts`} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">Payouts</Link>
          <button onClick={recompute} className="px-3 py-1.5 text-xs rounded-lg bg-gray-900 text-white hover:bg-gray-800">Recompute</button>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-3">Experience Target Calculation</h2>
        <p className="text-xs text-secondary mb-4">
          Σ over goals: min((actual/target) × 100 × weight, weight × 100 × 2). Sub-threshold goals score 0.
        </p>
        <table className="w-full text-sm mb-6">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Goal</th>
              <th className="px-3 py-2 text-right">Weight</th>
              <th className="px-3 py-2 text-right">Target</th>
              <th className="px-3 py-2 text-right">Min Threshold</th>
            </tr>
          </thead>
          <tbody>
            {round.goals.map((g) => (
              <tr key={g.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{g.name}</td>
                <td className="px-3 py-2 text-right">{(g.weight * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right">{g.targetValue}</td>
                <td className="px-3 py-2 text-right">{g.minThreshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">Experience Tiers</h3>
        <TierTable tiers={experience} />
      </section>

      <section className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold">Valid DA Assessment</h2>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs ms-auto">
            {(["MOTORCYCLE", "CAR"] as const).map((v) => (
              <button key={v} onClick={() => setVehicleTab(v)}
                className={`px-3 py-1 rounded-md ${vehicleTab === v ? "bg-gray-900 text-white" : "text-gray-600"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-secondary mb-4">Counts days where KeetaDailyMetrics.validDay == true in the period.</p>
        <TierTable tiers={validDa} />
      </section>
    </div>
  );
}

function TierTable({ tiers }: { tiers: { level: string; minRate: number; maxRate: number; payment: number }[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-secondary">
        <tr>
          <th className="px-3 py-2 text-left">Tier</th>
          <th className="px-3 py-2 text-right">Min</th>
          <th className="px-3 py-2 text-right">Max</th>
          <th className="px-3 py-2 text-right">Payment (KWD)</th>
        </tr>
      </thead>
      <tbody>
        {tiers.sort((a, b) => a.level.localeCompare(b.level)).map((t) => (
          <tr key={t.level} className="border-t border-gray-100">
            <td className="px-3 py-2 font-medium">{t.level}</td>
            <td className="px-3 py-2 text-right">{t.minRate}</td>
            <td className="px-3 py-2 text-right">{t.maxRate}</td>
            <td className="px-3 py-2 text-right font-mono">{t.payment}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
