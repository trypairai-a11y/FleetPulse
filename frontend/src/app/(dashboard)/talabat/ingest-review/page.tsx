"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useApiGet } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type PendingRow = {
  id: string;
  shiftDate: string;
  utr: number | null;
  ordersCompleted: number | null;
  onlineHours: number | null;
  earnings: number | null;
  rawImageUrl: string | null;
  ocrConfidence: number | null;
  createdAt: string;
  driver: { id: string; name: string; phone: string; zone: string | null };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function TalabatIngestReviewPage() {
  const { data, loading, refetch } = useApiGet<{ data: PendingRow[]; total: number }>(
    "/api/talabat/metrics/pending-review?limit=50"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PendingRow>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const openRow = (row: PendingRow) => {
    setSelectedId(row.id);
    setForm({
      utr: row.utr,
      ordersCompleted: row.ordersCompleted,
      onlineHours: row.onlineHours,
      earnings: row.earnings,
    });
    setMsg(null);
  };

  const submit = async (action: "approve" | "reject") => {
    if (!selected) return;
    setBusy(true);
    try {
      if (action === "approve") {
        await api.post(`/api/talabat/metrics/${selected.id}/approve`, {
          utr: form.utr,
          ordersCompleted: form.ordersCompleted,
          onlineHours: form.onlineHours,
          earnings: form.earnings,
        });
      } else {
        await api.post(`/api/talabat/metrics/${selected.id}/reject`, { note: "Rejected by Ops" });
      }
      setMsg(action === "approve" ? "Approved" : "Rejected");
      setSelectedId(null);
      refetch();
    } catch (err: any) {
      setMsg(err.response?.data?.error ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 p-4">
      <div className="w-1/2 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold">Talabat screenshots awaiting review</h1>
            <p className="text-xs text-gray-500">{rows.length} pending</p>
          </div>
          <Clock className="h-4 w-4 text-gray-400" />
        </header>
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {rows.length === 0 && (
            <li className="p-8 text-center text-sm text-gray-400">
              No screenshots need review.
            </li>
          )}
          {rows.map((row) => {
            const active = row.id === selectedId;
            const conf = row.ocrConfidence ?? 0;
            return (
              <li
                key={row.id}
                onClick={() => openRow(row)}
                className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${active ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{row.driver.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(row.shiftDate).toLocaleDateString()} · {row.driver.zone ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${conf < 0.5 ? "bg-red-100 text-red-700" : conf < 0.85 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                      {(conf * 100).toFixed(0)}% conf
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="w-1/2 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-400">
            <div>
              <AlertCircle className="mx-auto mb-2 h-6 w-6" />
              Select a row to review the extracted metrics.
            </div>
          </div>
        ) : (
          <>
            <header className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold">{selected.driver.name}</h2>
              <p className="text-xs text-gray-500">
                Shift {new Date(selected.shiftDate).toLocaleDateString()}
              </p>
            </header>
            <div className="grid flex-1 grid-cols-2 overflow-y-auto">
              <div className="border-r border-gray-100 bg-gray-50 p-4">
                {selected.rawImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    alt="shift screenshot"
                    src={`${API_BASE}${selected.rawImageUrl}`}
                    className="w-full rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="text-xs text-gray-400">No image on file.</div>
                )}
              </div>
              <div className="p-4 space-y-3">
                {(["utr", "ordersCompleted", "onlineHours", "earnings"] as const).map((field) => (
                  <label key={field} className="block">
                    <span className="text-xs uppercase tracking-wide text-gray-500">
                      {field}
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      value={(form[field] as number | null | undefined) ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [field]: e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
                {msg && <div className="text-xs text-gray-500">{msg}</div>}
              </div>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
              <button
                disabled={busy}
                onClick={() => submit("reject")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
              <button
                disabled={busy}
                onClick={() => submit("approve")}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
