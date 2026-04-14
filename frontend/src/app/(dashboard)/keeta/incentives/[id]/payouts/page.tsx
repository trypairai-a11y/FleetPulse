"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import KwdAmount from "@/components/keeta/KwdAmount";

type Payout = {
  id: string; experienceRate: number; experienceTier: string | null; experiencePayKwd: number;
  validDaCount: number; validDaTier: string | null; validDaPayKwd: number; totalPayKwd: number;
  driver: { id: string; name: string; vehicleType: string | null; platformDriverId: string | null };
};

export default function PayoutsPage() {
  const params = useParams();
  const id = params.id as string;
  const [search, setSearch] = useState("");
  const qs = new URLSearchParams({ limit: "200" });
  if (search) qs.set("search", search);
  const { data, loading } = useApiGet<{ data: Payout[] }>(`/api/incentives/rounds/${id}/payouts?${qs}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Payouts</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courier"
          className="ms-auto text-sm rounded-lg border border-gray-200 px-3 py-1.5 w-64" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Courier</th>
              <th className="px-4 py-3 text-left">Vehicle</th>
              <th className="px-4 py-3 text-right">Exp. Rate</th>
              <th className="px-4 py-3 text-left">Exp. Tier</th>
              <th className="px-4 py-3 text-right">Exp. Pay</th>
              <th className="px-4 py-3 text-right">Valid DA</th>
              <th className="px-4 py-3 text-left">DA Tier</th>
              <th className="px-4 py-3 text-right">DA Pay</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="p-6 text-center text-secondary">Loading…</td></tr>}
            {data?.data.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{p.driver.name}</td>
                <td className="px-4 py-2 text-secondary">{p.driver.vehicleType}</td>
                <td className="px-4 py-2 text-right">{p.experienceRate.toFixed(1)}%</td>
                <td className="px-4 py-2"><Tier tier={p.experienceTier} /></td>
                <td className="px-4 py-2 text-right font-mono">{p.experiencePayKwd}</td>
                <td className="px-4 py-2 text-right">{p.validDaCount}</td>
                <td className="px-4 py-2"><Tier tier={p.validDaTier} /></td>
                <td className="px-4 py-2 text-right font-mono">{p.validDaPayKwd}</td>
                <td className="px-4 py-2 text-right font-semibold"><KwdAmount value={p.totalPayKwd} /></td>
              </tr>
            ))}
            {data?.data.length === 0 && !loading && (
              <tr><td colSpan={9} className="p-6 text-center text-secondary">No payouts yet. Try recomputing the round.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tier({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-gray-400">—</span>;
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-800",
    B: "bg-blue-100 text-blue-800",
    C: "bg-amber-100 text-amber-800",
    D: "bg-red-100 text-red-800",
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier] || "bg-gray-100 text-gray-600"}`}>{tier}</span>;
}
