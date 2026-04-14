"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import KwdAmount from "@/components/keeta/KwdAmount";

type Invoice = {
  id: string; invoiceNo: string; issueDate: string; sellerName: string;
  totalAmount: string; status: string; rejectReason: string | null;
  billing: { billingId: string; partner: { name: string } | null };
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
};

export default function TaxInvoicesPage() {
  const [status, setStatus] = useState("");
  const qs = new URLSearchParams({ limit: "200" });
  if (status) qs.set("status", status);
  const { data, loading, refetch } = useApiGet<{ data: Invoice[] }>(`/api/financial/tax-invoices?${qs}`);

  async function act(id: string, action: "submit" | "accept" | "reject") {
    const body = action === "reject" ? { reason: prompt("Reject reason?") ?? "" } : {};
    const res = await fetch(`/api/financial/tax-invoices/${id}/${action}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) refetch();
    else alert(`Action ${action} failed`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Tax Invoices</h1>
        <div className="ms-auto flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-2 py-1">
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLOR).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-left">Invoice No</th>
              <th className="px-4 py-3 text-left">Billing</th>
              <th className="px-4 py-3 text-left">Seller</th>
              <th className="px-4 py-3 text-left">Issue Date</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-secondary">Loading…</td></tr>}
            {data?.data.map((i) => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{i.invoiceNo}</td>
                <td className="px-4 py-2">{i.billing.billingId} <span className="text-xs text-secondary">· {i.billing.partner?.name ?? ""}</span></td>
                <td className="px-4 py-2">{i.sellerName}</td>
                <td className="px-4 py-2 text-secondary">{new Date(i.issueDate).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right"><KwdAmount value={i.totalAmount} /></td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[i.status] || "bg-gray-100"}`}>{i.status}</span>
                  {i.rejectReason && <p className="text-[11px] text-red-500 mt-0.5">{i.rejectReason}</p>}
                </td>
                <td className="px-4 py-2 space-x-2">
                  {i.status === "DRAFT" && (
                    <button onClick={() => act(i.id, "submit")} className="text-xs text-blue-600 hover:underline">Submit</button>
                  )}
                  {i.status === "SUBMITTED" && (
                    <>
                      <button onClick={() => act(i.id, "accept")} className="text-xs text-green-600 hover:underline">Accept</button>
                      <button onClick={() => act(i.id, "reject")} className="text-xs text-red-600 hover:underline">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
