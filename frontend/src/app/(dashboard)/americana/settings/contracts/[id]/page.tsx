"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Check, X } from "lucide-react";

interface DraftRate {
  chainName: string;
  vehicleType: string;
  ratePerOrder: number;
  chainId?: string;
}

export default function ContractReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: contract, loading, refetch } = useApiGet<any>(`/api/americana/contracts/${id}`);
  const { data: chains } = useApiGet<{ id: string; name: string }[]>("/api/americana/chains");
  const [draft, setDraft] = useState<DraftRate[]>([]);

  useEffect(() => {
    if (!contract?.ocrDraftRates) return;
    const mapped: DraftRate[] = (contract.ocrDraftRates as DraftRate[]).map((r) => {
      const match = (chains ?? []).find((c) => c.name.toLowerCase() === r.chainName.toLowerCase());
      return { ...r, chainId: match?.id };
    });
    setDraft(mapped);
  }, [contract, chains]);

  const saveRates = async () => {
    const rows = draft.filter((r) => r.chainId && r.vehicleType && r.ratePerOrder > 0);
    if (rows.length === 0) {
      alert("Nothing to save — assign a chain to at least one row.");
      return;
    }
    await api.post(`/api/americana/contracts/${id}/save-rates`, {
      rates: rows.map((r) => ({
        chainId: r.chainId, vehicleType: r.vehicleType, ratePerOrder: r.ratePerOrder,
      })),
    });
    refetch();
    router.push("/americana/settings/chain-rates");
  };

  if (loading || !contract) return <div className="text-sm text-secondary p-6">Loading…</div>;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <h1 className="text-xl font-semibold">Contract {contract.contractRef}</h1>
      <p className="text-sm text-secondary">
        Enter the per-order rate for each chain × vehicle type. Rates apply from the contract&apos;s effective date.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PDF */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[700px]">
          {contract.originalFileUrl ? (
            <iframe src={contract.originalFileUrl} className="w-full h-full" title="contract" />
          ) : <div className="p-6 text-secondary">No file.</div>}
        </div>

        {/* Rate table (manual entry) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Rate table</h3>
            <button
              onClick={() => setDraft([...draft, { chainName: "", vehicleType: "CAR", ratePerOrder: 0 }])}
              className="text-xs px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              Add row
            </button>
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {draft.length === 0 ? (
              <p className="text-sm text-secondary">No rates yet. Click &ldquo;Add row&rdquo; and pick a chain, vehicle type, and per-order rate.</p>
            ) : draft.map((r, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center text-sm">
                <select value={r.chainId ?? ""} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, chainId: e.target.value } : x))}
                  className="px-2 py-1 border border-gray-200 rounded-md bg-white">
                  <option value="">Pick chain…</option>
                  {(chains ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={r.vehicleType} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, vehicleType: e.target.value } : x))}
                  className="px-2 py-1 border border-gray-200 rounded-md bg-white">
                  <option value="CAR">Car</option>
                  <option value="BIKE">Bike</option>
                </select>
                <input type="number" step="0.001" value={r.ratePerOrder} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, ratePerOrder: parseFloat(e.target.value) } : x))}
                  className="px-2 py-1 border border-gray-200 rounded-md font-mono" />
                <button onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="p-1 text-red-600 hover:bg-red-50 rounded">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={saveRates}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover">
            <Check size={14} /> Save to chain-rates
          </button>
        </div>
      </div>
    </div>
  );
}
