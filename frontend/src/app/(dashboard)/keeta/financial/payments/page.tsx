"use client";
import { useApiGet } from "@/hooks/useApi";
import KwdAmount from "@/components/keeta/KwdAmount";
import { CheckCircle2 } from "lucide-react";

type Withdrawal = {
  id: string; groupId: string; groupName: string; withdrawTime: string;
  tailNumber: string; amountKwd: string; status: string; operationStatus: string; note: string;
  billing: { billingId: string };
};
type Summary = {
  withdrawableBalance: string | number;
  bank: { bankName: string; accountName: string; tailNumber: string; verified: boolean } | null;
};

export default function PaymentsPage() {
  const { data: summary } = useApiGet<Summary>("/api/financial/summary");
  const { data, loading } = useApiGet<{ data: Withdrawal[] }>("/api/financial/withdrawals?limit=200");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payments</h1>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-[11px] text-secondary uppercase tracking-wide">Withdrawable Balance</p>
          <p className="text-xl font-semibold"><KwdAmount value={summary?.withdrawableBalance ?? 0} /></p>
        </div>
        {summary?.bank && (
          <>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wide">Bank Account</p>
              <p className="text-sm font-medium">{summary.bank.bankName} · ****{summary.bank.tailNumber}</p>
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wide">Account Name</p>
              <p className="text-sm">{summary.bank.accountName}</p>
            </div>
            <div>
              <p className="text-[11px] text-secondary uppercase tracking-wide">Verification</p>
              <p className="text-sm inline-flex items-center gap-1 text-green-700">
                {summary.bank.verified && <CheckCircle2 size={14} />}
                {summary.bank.verified ? "Verification Passed" : "Pending"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Group ID</th>
              <th className="px-4 py-3 text-left">Group Name</th>
              <th className="px-4 py-3 text-left">Withdraw Time</th>
              <th className="px-4 py-3 text-left">Tail Number</th>
              <th className="px-4 py-3 text-right">Amount (KWD)</th>
              <th className="px-4 py-3 text-left">Operation Status</th>
              <th className="px-4 py-3 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-6 text-center text-secondary">Loading…</td></tr>}
            {data?.data.map((w) => (
              <tr key={w.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{w.billing.billingId}</td>
                <td className="px-4 py-2 font-mono text-xs">{w.groupId}</td>
                <td className="px-4 py-2">{w.groupName}</td>
                <td className="px-4 py-2 text-secondary">{new Date(w.withdrawTime).toLocaleString()}</td>
                <td className="px-4 py-2">****{w.tailNumber}</td>
                <td className="px-4 py-2 text-right font-semibold"><KwdAmount value={w.amountKwd} /></td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${w.status === "WITHDRAWN" ? "bg-green-100 text-green-700" : w.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {w.operationStatus}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-secondary">{w.note}</td>
              </tr>
            ))}
            {data?.data.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-secondary">No withdrawals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
