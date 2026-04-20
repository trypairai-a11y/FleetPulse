"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Upload, FileText } from "lucide-react";

interface Contract {
  id: string;
  contractRef: string;
  signedDate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  ocrStatus: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  ocrConfidence: number | null;
  rates?: any[];
}

export default function ContractsPage() {
  const { data: contracts, loading, refetch } = useApiGet<Contract[]>("/api/americana/contracts");
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<any>({ contractRef: "", signedDate: "", effectiveFrom: "", effectiveTo: "", notes: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !meta.contractRef || !meta.signedDate || !meta.effectiveFrom) {
      alert("Attach a PDF and fill contract ref, signed date, and effective-from.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      Object.entries(meta).forEach(([k, v]) => v != null && v !== "" && form.append(k, String(v)));
      await api.post("/api/americana/contracts/upload", form);
      setMeta({ contractRef: "", signedDate: "", effectiveFrom: "", effectiveTo: "", notes: "" });
      if (fileRef.current) fileRef.current.value = "";
      refetch();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px]">
      <h1 className="text-xl font-semibold">Americana contracts</h1>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Upload signed contract PDF</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <input placeholder="Contract ref (AMR-2026-01)" value={meta.contractRef} onChange={(e) => setMeta({ ...meta, contractRef: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-md" />
          <input type="date" placeholder="Signed date" value={meta.signedDate} onChange={(e) => setMeta({ ...meta, signedDate: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-md" />
          <input type="date" placeholder="Effective from" value={meta.effectiveFrom} onChange={(e) => setMeta({ ...meta, effectiveFrom: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-md" />
          <input type="date" placeholder="Effective to (optional)" value={meta.effectiveTo} onChange={(e) => setMeta({ ...meta, effectiveTo: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-md" />
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" className="block text-sm" />
        <button onClick={upload} disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50">
          {uploading ? "Uploading…" : <><Upload size={14} /> Upload & trigger OCR</>}
        </button>
        <p className="text-xs text-secondary">Claude vision extracts the rate table; you review it on the contract detail page before saving.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-secondary">
            <tr>
              <th className="text-left p-3">Ref</th>
              <th className="text-left p-3">Signed</th>
              <th className="text-left p-3">Effective</th>
              <th className="text-left p-3">OCR</th>
              <th className="text-right p-3">Rates</th>
              <th className="text-right p-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary">Loading…</td></tr>
            ) : (contracts ?? []).length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary">No contracts uploaded yet.</td></tr>
            ) : (contracts ?? []).map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-3 font-medium">{c.contractRef}</td>
                <td className="p-3 text-secondary">{new Date(c.signedDate).toLocaleDateString()}</td>
                <td className="p-3 text-secondary">
                  {new Date(c.effectiveFrom).toLocaleDateString()} — {c.effectiveTo ? new Date(c.effectiveTo).toLocaleDateString() : "open"}
                </td>
                <td className="p-3">
                  <span className={
                    c.ocrStatus === "DONE" ? "text-green-600" :
                    c.ocrStatus === "FAILED" ? "text-red-600" :
                    c.ocrStatus === "PROCESSING" ? "text-amber-600" : "text-secondary"
                  }>
                    {c.ocrStatus}{c.ocrConfidence != null ? ` (${Math.round((c.ocrConfidence ?? 0) * 100)}%)` : ""}
                  </span>
                </td>
                <td className="p-3 text-right font-mono">{c.rates?.length ?? 0}</td>
                <td className="p-3 text-right">
                  <Link href={`/americana/settings/contracts/${c.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    <FileText size={12} /> Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
