"use client";
import { useRef, useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Upload, Check, X } from "lucide-react";

interface Row {
  id: string;
  source: "EMAIL" | "MANUAL_UPLOAD";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FAILED";
  ingestDate: string;
  capturedAt: string;
  rowCount: number;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedReason: string | null;
  errorLog: string | null;
  rawFileUrl: string;
}

export default function IngestPage() {
  const { data, loading, refetch } = useApiGet<Row[]>("/api/americana/ingest");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/api/americana/ingest/manual-upload", form);
      if (fileRef.current) fileRef.current.value = "";
      refetch();
    } finally { setBusy(false); }
  };

  const approve = async (id: string) => {
    setBusy(true);
    try { await api.post(`/api/americana/ingest/${id}/approve`); refetch(); }
    finally { setBusy(false); }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason?");
    if (reason == null) return;
    setBusy(true);
    try { await api.post(`/api/americana/ingest/${id}/reject`, { reason }); refetch(); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-xl font-semibold">Americana daily ingest</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Manual upload fallback</h2>
        <p className="text-xs text-secondary">
          Use this when Americana HQ's daily email is missing. The IMAP watcher also stages feeds automatically
          every 10 minutes — configure credentials under <span className="font-medium">tenant.settings.americana.ingest</span>.
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={upload} className="block text-sm" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50"
        >
          <Upload size={14} /> {busy ? "Uploading…" : "Upload XLSX"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-secondary">
            <tr>
              <th className="text-left p-3">Ingest date</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Rows</th>
              <th className="text-left p-3">Captured</th>
              <th className="text-left p-3">Approved</th>
              <th className="text-right p-3 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">Loading…</td></tr>
            ) : (data ?? []).length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">No ingestions yet.</td></tr>
            ) : (data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="p-3 font-medium">{new Date(r.ingestDate).toLocaleDateString()}</td>
                <td className="p-3 text-xs">{r.source}</td>
                <td className="p-3">
                  <span className={
                    r.status === "APPROVED" ? "text-green-600" :
                    r.status === "REJECTED" ? "text-red-600" :
                    r.status === "FAILED" ? "text-red-700" : "text-amber-600"
                  }>{r.status}</span>
                </td>
                <td className="p-3 text-right font-mono">{r.rowCount}</td>
                <td className="p-3 text-xs text-secondary">{new Date(r.capturedAt).toLocaleString()}</td>
                <td className="p-3 text-xs text-secondary">{r.approvedAt ? new Date(r.approvedAt).toLocaleString() : "—"}</td>
                <td className="p-3 text-right">
                  {r.status === "PENDING_REVIEW" && (
                    <>
                      <button onClick={() => approve(r.id)} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 text-green-700 text-xs hover:bg-green-50 rounded">
                        <Check size={12} /> Approve
                      </button>
                      <button onClick={() => reject(r.id)} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 text-red-700 text-xs hover:bg-red-50 rounded">
                        <X size={12} /> Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
