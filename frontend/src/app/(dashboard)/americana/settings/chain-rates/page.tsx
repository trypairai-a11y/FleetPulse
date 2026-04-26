"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/i18n/format";

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
  const { t, locale } = useI18n();
  const { data: rates, loading, refetch } = useApiGet<Rate[]>("/api/americana/rates");
  const { data: chains } = useApiGet<{ id: string; name: string }[]>("/api/americana/chains");
  const [draft, setDraft] = useState<any>({ vehicleType: "CAR", effectiveFrom: new Date().toLocaleDateString("en-CA") });
  const [creating, setCreating] = useState(false);

  const save = async () => {
    await api.post("/api/americana/rates", {
      chainId: draft.chainId,
      vehicleType: draft.vehicleType,
      ratePerOrder: parseFloat(draft.ratePerOrder),
      effectiveFrom: draft.effectiveFrom,
      effectiveTo: draft.effectiveTo || null,
    });
    setDraft({ vehicleType: "CAR", effectiveFrom: new Date().toLocaleDateString("en-CA") });
    setCreating(false);
    refetch();
  };

  const del = async (id: string) => {
    if (!confirm(t("americana.deleteRateConfirm"))) return;
    await api.delete(`/api/americana/rates/${id}`);
    refetch();
  };

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("americana.chainRatesTitle")}</h1>
          <p className="text-xs text-secondary">{t("americana.chainRatesHint")}</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover"
        >
          <Plus size={14} /> {t("americana.addRate")}
        </button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-5 gap-3 text-sm">
            <select value={draft.chainId ?? ""} onChange={(e) => setDraft({ ...draft, chainId: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md bg-white">
              <option value="">{t("americana.chainPlaceholder")}</option>
              {(chains ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={draft.vehicleType} onChange={(e) => setDraft({ ...draft, vehicleType: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md bg-white">
              <option value="CAR">{t("americana.car")}</option>
              <option value="BIKE">{t("americana.bike")}</option>
            </select>
            <input placeholder="0.550" type="number" step="0.001" value={draft.ratePerOrder ?? ""} onChange={(e) => setDraft({ ...draft, ratePerOrder: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md" />
            <input type="date" value={draft.effectiveFrom} onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md" />
            <input type="date" placeholder={t("americana.effectiveToOptional")} value={draft.effectiveTo ?? ""} onChange={(e) => setDraft({ ...draft, effectiveTo: e.target.value })}
              className="px-2 py-1.5 border border-gray-200 rounded-md" />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setCreating(false); setDraft({ vehicleType: "CAR", effectiveFrom: new Date().toLocaleDateString("en-CA") }); }} className="px-3 py-1 text-sm text-secondary">{t("common.cancel")}</button>
            <button onClick={save} className="px-3 py-1 bg-primary text-white text-sm rounded-lg">{t("common.save")}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-secondary">
            <tr>
              <th className="text-start p-3">{t("americana.chainRates")}</th>
              <th className="text-start p-3">{t("companies.vehicle")}</th>
              <th className="text-end p-3">{t("americana.ratePerOrderKwd")}</th>
              <th className="text-start p-3">{t("americana.effectiveFrom")}</th>
              <th className="text-start p-3">{t("americana.effectiveTo")}</th>
              <th className="text-start p-3">{t("americana.source")}</th>
              <th className="text-end p-3 w-20">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">{t("common.loading")}</td></tr>
            ) : (rates ?? []).length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">{t("americana.noRatesDefined")}</td></tr>
            ) : (rates ?? []).map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="p-3 font-medium">{r.chain?.name}</td>
                <td className="p-3 text-secondary">{r.vehicleType === "CAR" ? t("americana.car") : r.vehicleType === "BIKE" ? t("americana.bike") : r.vehicleType}</td>
                <td className="p-3 text-end font-mono font-semibold">{Number(r.ratePerOrder).toFixed(3)}</td>
                <td className="p-3 text-secondary">{formatDate(r.effectiveFrom, locale)}</td>
                <td className="p-3 text-secondary">{r.effectiveTo ? formatDate(r.effectiveTo, locale) : "—"}</td>
                <td className="p-3 text-xs">{r.contract ? `${t("americana.contractPrefix")} ${r.contract.contractRef}` : t("americana.manual")}</td>
                <td className="p-3 text-end">
                  <button onClick={() => del(r.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" aria-label={t("common.delete")}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
