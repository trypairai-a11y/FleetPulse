"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useApiGet } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type PendingRow = {
  id: string;
  shiftDate: string;
  codCollectedKwd: string;
  tipsKwd: string;
  deliveriesCount: number;
  unassignedCount: number;
  hourlyBuckets: number[] | null;
  rawImageUrl: string | null;
  ocrConfidence: number | null;
  createdAt: string;
  driver: { id: string; name: string; phone: string; zone: string | null };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function DeliverooIngestReviewPage() {
  const { data, loading, refetch } = useApiGet<{ data: PendingRow[]; total: number }>(
    "/api/deliveroo/metrics/pending-review?limit=50"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    codCollectedKwd: number | null;
    tipsKwd: number | null;
    deliveriesCount: number | null;
    unassignedCount: number | null;
    hourlyBuckets: number[] | null;
  }>({ codCollectedKwd: null, tipsKwd: null, deliveriesCount: null, unassignedCount: null, hourlyBuckets: null });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = data?.data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const openRow = (row: PendingRow) => {
    setSelectedId(row.id);
    setForm({
      codCollectedKwd: row.codCollectedKwd != null ? Number(row.codCollectedKwd) : null,
      tipsKwd: row.tipsKwd != null ? Number(row.tipsKwd) : null,
      deliveriesCount: row.deliveriesCount ?? null,
      unassignedCount: row.unassignedCount ?? null,
      hourlyBuckets: Array.isArray(row.hourlyBuckets) ? row.hourlyBuckets : null,
    });
    setMsg(null);
  };

  const bucketSum = (form.hourlyBuckets ?? []).reduce((s, n) => s + (Number(n) || 0), 0);
  const bucketsValid =
    Array.isArray(form.hourlyBuckets) &&
    form.hourlyBuckets.length === 9 &&
    form.deliveriesCount != null &&
    bucketSum === form.deliveriesCount;

  const submit = async (action: "approve" | "reject") => {
    if (!selected) return;
    setBusy(true);
    try {
      if (action === "approve") {
        if (!bucketsValid) {
          setMsg("Hourly buckets must sum to deliveries.");
          setBusy(false);
          return;
        }
        await api.post(`/api/deliveroo/metrics/${selected.id}/approve`, {
          codCollectedKwd: form.codCollectedKwd,
          tipsKwd: form.tipsKwd,
          deliveriesCount: form.deliveriesCount,
          unassignedCount: form.unassignedCount,
          hourlyBuckets: form.hourlyBuckets,
        });
      } else {
        await api.post(`/api/deliveroo/metrics/${selected.id}/reject`, { note: "Rejected by Ops" });
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
      <div className="flex w-1/2 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold">Deliveroo screenshots awaiting review</h1>
            <p className="text-xs text-gray-500">{rows.length} pending</p>
          </div>
          <Clock className="h-4 w-4 text-gray-400" />
        </header>
        <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
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
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        conf < 0.5
                          ? "bg-red-100 text-red-700"
                          : conf < 0.85
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {(conf * 100).toFixed(0)}% conf
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex w-1/2 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
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
              <div className="space-y-3 p-4">
                <NumField
                  label="Cash (KD)"
                  value={form.codCollectedKwd}
                  onChange={(v) => setForm((f) => ({ ...f, codCollectedKwd: v }))}
                />
                <NumField
                  label="Tips (KD)"
                  value={form.tipsKwd}
                  onChange={(v) => setForm((f) => ({ ...f, tipsKwd: v }))}
                />
                <NumField
                  label="Deliveries"
                  value={form.deliveriesCount}
                  onChange={(v) => setForm((f) => ({ ...f, deliveriesCount: v }))}
                  integer
                />
                <NumField
                  label="Unassigned"
                  value={form.unassignedCount}
                  onChange={(v) => setForm((f) => ({ ...f, unassignedCount: v }))}
                  integer
                />

                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    Hourly buckets (08, 10, 12, 14, 16, 18, 20, 22, 24)
                  </span>
                  <div className="mt-1 grid grid-cols-9 gap-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <input
                        key={i}
                        type="number"
                        min={0}
                        className="w-full rounded-md border border-gray-200 px-1 py-1 text-center text-xs"
                        value={form.hourlyBuckets?.[i] ?? 0}
                        onChange={(e) => {
                          const next = [...(form.hourlyBuckets ?? Array(9).fill(0))];
                          next[i] = Number(e.target.value || 0);
                          setForm((f) => ({ ...f, hourlyBuckets: next }));
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className={`mt-1 text-xs ${bucketsValid ? "text-green-600" : "text-red-500"}`}
                  >
                    Sum {bucketSum} {bucketsValid ? "= " : "≠ "}
                    deliveries {form.deliveriesCount ?? "—"}
                  </p>
                </div>

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
                disabled={busy || !bucketsValid}
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

function NumField({
  label,
  value,
  onChange,
  integer,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  integer?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
      <input
        type="number"
        step={integer ? 1 : "any"}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value === "" ? null : integer ? parseInt(e.target.value, 10) : Number(e.target.value)
          )
        }
      />
    </label>
  );
}
