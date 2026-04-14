"use client";
import { useParams } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import KwdAmount from "@/components/keeta/KwdAmount";

type Row = {
  id: string; computedAt: string;
  experienceRate: number; experienceTier: string | null; experiencePayKwd: number;
  validDaCount: number; validDaTier: string | null; validDaPayKwd: number; totalPayKwd: number;
  round: { period: string; vehicleType: string; partner: { name: string } | null };
};

export default function DriverPerformancePage() {
  const params = useParams();
  const driverId = params.id as string;
  const { data, loading } = useApiGet<{ driverId: string; payouts: Row[] }>(`/api/incentives/drivers/${driverId}/performance`);
  const payouts = data?.payouts ?? [];
  const total = payouts.reduce((s, p) => s + p.totalPayKwd, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Performance Timeline</h1>
        <div className="ms-auto text-sm">
          Lifetime earnings: <span className="font-semibold"><KwdAmount value={total} /></span>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Partner</th>
              <th className="px-4 py-3 text-left">Vehicle</th>
              <th className="px-4 py-3 text-right">Exp. Rate</th>
              <th className="px-4 py-3 text-left">Exp. Tier</th>
              <th className="px-4 py-3 text-right">Valid DA</th>
              <th className="px-4 py-3 text-right">Total Pay</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-secondary">Loading…</td></tr>}
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{p.round.period}</td>
                <td className="px-4 py-2">{p.round.partner?.name ?? "—"}</td>
                <td className="px-4 py-2 text-secondary">{p.round.vehicleType}</td>
                <td className="px-4 py-2 text-right">{p.experienceRate.toFixed(1)}%</td>
                <td className="px-4 py-2">{p.experienceTier ?? "—"}</td>
                <td className="px-4 py-2 text-right">{p.validDaCount}</td>
                <td className="px-4 py-2 text-right font-semibold"><KwdAmount value={p.totalPayKwd} /></td>
              </tr>
            ))}
            {payouts.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">No performance data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
