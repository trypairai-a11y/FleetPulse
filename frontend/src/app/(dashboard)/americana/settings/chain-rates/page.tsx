"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";

interface Rate {
  id: string;
  chainId: string;
  vehicleType: "CAR" | "BIKE";
  ratePerOrder: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  chain: { id: string; name: string };
  contract?: { id: string; contractRef: string } | null;
}

export default function ChainRatesPage() {
  const { data: rates, loading, refetch } = useApiGet<Rate[]>("/api/americana/rates");
  const { data: chains } = useApiGet<{ id: string; name: string }[]>("/api/americana/chains");
  const [draft, setDraft] = useState<any>({ vehicleType: "CAR", effectiveFrom: new Date().toISOString().slice(0, 10) });
  const [creating, setCreating] = useState(false);

  const save = async () => {
    await api.post("/api/americana/rates", {
      chainId: draft.chainId,
      vehicleType: draft.vehicleType,
      ratePerOrder: parseFloat(draft.ratePerOrder),
      effectiveFrom: draft.effectiveFrom,
      effectiveTo: draft.effectiveTo || null,
    });
    setDraft({ vehicleType: "CAR", effectiveFrom: new Date().toISOString().slice(0, 10) });
    setCreating(false);
    refetch();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this rate?")) return;
    await api.delete(`/api/americana/rates/${id}`);
    refetch();
  };

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chain rates</h1>
          <p className="text-xs text-secondary">Per-order rate, versioned by effective date. Car and Bike can differ.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover"
        >
          <Plus size={14} /> Add rate
        </button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-5 gap-3 text-sm">
            <select value={draft.chainId ?? ""} onChange={(e) => setDraft({ ...draft, chainId: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md bg-white">
              <option value="">Chain…</option>
              {(chains ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={draft.vehicleType} onChange={(e) => setDraft({ ...draft, vehicleType: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md bg-white">
              <option value="CAR">Car</option>
              <option value="BIKE">Bike</option>
            </select>
            <input placeholder="0.550" type="number" step="0.001" value={draft.ratePerOrder ?? ""} onChange={(e) => setDraft({ ...draft, ratePerOrder: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md" />
            <input type="date" value={draft.effectiveFrom} onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md" />
            <input type="date" placeholder="Effective to (optional)" value={draft.effectiveTo ?? ""} onChange={(e) => setDraft({ ...draft, effectiveTo: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md" />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setCreating(false); setDraft({ vehicleType: "CAR", effectiveFrom: new Date().toISOString().slice(0, 10) }); }} className="px-3 py-1 text-sm text-secondary">Cancel</button>
            <button onClick={save} className="px-3 py-1 bg-primary text-white text-sm rounded-lg">Save</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-secondary">
            <tr>
              <th className="text-left p-3">Chain</th>
              <th className="text-left p-3">Vehicle</th>
              <th className="text-right p-3">Rate / order (KWD)</th>
              <th className="text-left p-3">Effective from</th>
              <th className="text-left p-3">Effective to</th>
              <th className="text-left p-3">Source</th>
              <th className="text-right p-3 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">Loading…</td></tr>
            ) : (rates ?? []).length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">No rates defined yet.</td></tr>
            ) : (rates ?? []).map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="p-3 font-medium">{r.chain?.name}</td>
                <td className="p-3 text-secondary">{r.vehicleType}</td>
                <td className="p-3 text-right font-mono font-semibold">{Number(r.ratePerOrder).toFixed(3)}</td>
                <td className="p-3 text-secondary">{new Date(r.effectiveFrom).toLocaleDateString()}</td>
                <td className="p-3 text-secondary">{r.effectiveTo ? new Date(r.effectiveTo).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-xs">{r.contract ? `Contract ${r.contract.contractRef}` : "Manual"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => del(r.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
