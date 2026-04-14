"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import KwdAmount from "@/components/keeta/KwdAmount";

type Billing = {
  id: string; billingId: string; billType: string; period: string; billingDate: string;
  invoiceAmount: string; payableAmount: string; status: string; groupName: string;
  partner: { name: string } | null;
  taxInvoice: { status: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_INVOICE: "bg-gray-100 text-gray-700",
  AWAITING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
};

export default function BillingsPage() {
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const qs = new URLSearchParams({ limit: "200" });
  if (status) qs.set("status", status);
  if (period) qs.set("period", period);
  const { data, loading } = useApiGet<{ data: Billing[] }>(`/api/financial/billings?${qs}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Billings</h1>
        <div className="ms-auto flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1">
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLOR).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Period e.g. 202604" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="text-sm rounded-lg border border-gray-200 px-2 py-1 w-40" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Billing ID</th>
              <th className="px-4 py-3 text-left">Partner / Group</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Invoice</th>
              <th className="px-4 py-3 text-right">Payable</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-secondary">Loading…</td></tr>}
            {data?.data.map((b) => (
              <tr key={b.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{b.billingId}</td>
                <td className="px-4 py-2">{b.partner?.name ?? b.groupName}</td>
                <td className="px-4 py-2">{b.period}</td>
                <td className="px-4 py-2 text-secondary">{b.billType}</td>
                <td className="px-4 py-2 text-right"><KwdAmount value={b.invoiceAmount} /></td>
                <td className="px-4 py-2 text-right font-semibold"><KwdAmount value={b.payableAmount} /></td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] || "bg-gray-100"}`}>{b.status}</span>
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">No billings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
