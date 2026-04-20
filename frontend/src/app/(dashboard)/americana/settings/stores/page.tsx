"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Plus, Edit2, Check, X } from "lucide-react";

interface Store {
  id: string;
  chainId: string;
  name: string;
  area: string | null;
  costCenter: string | null;
  managerName: string | null;
  managerPhone: string | null;
  managerWhatsapp: string | null;
  backupContactName: string | null;
  backupContactPhone: string | null;
  notes: string | null;
  active: boolean;
  chain?: { name: string; id: string };
}

export default function AmericanaStoresPage() {
  const { data: stores, loading, refetch } = useApiGet<Store[]>("/api/americana/stores");
  const { data: chains } = useApiGet<{ id: string; name: string }[]>("/api/americana/chains");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Store>>({});
  const [creating, setCreating] = useState(false);

  const save = async (id: string | null) => {
    if (id) await api.put(`/api/americana/stores/${id}`, draft);
    else await api.post("/api/americana/stores", draft);
    setEditing(null); setCreating(false); setDraft({});
    refetch();
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Americana stores</h1>
        <button
          onClick={() => { setCreating(true); setDraft({ active: true }); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover"
        >
          <Plus size={14} /> Add store
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-xs uppercase text-secondary">
            <tr>
              <th className="text-left p-3">Store</th>
              <th className="text-left p-3">Chain</th>
              <th className="text-left p-3">Area</th>
              <th className="text-left p-3">Manager</th>
              <th className="text-left p-3">Manager phone</th>
              <th className="text-left p-3">CC</th>
              <th className="text-left p-3">Active</th>
              <th className="text-right p-3 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <tr className="bg-blue-50/40 border-b border-gray-50">
                <td className="p-3">
                  <input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" placeholder="KFC Hawally" />
                </td>
                <td className="p-3">
                  <select value={draft.chainId ?? ""} onChange={(e) => setDraft({ ...draft, chainId: e.target.value })}
                    className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white">
                    <option value="">—</option>
                    {(chains ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input value={draft.area ?? ""} onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" placeholder="Hawally" />
                </td>
                <td className="p-3">
                  <input value={draft.managerName ?? ""} onChange={(e) => setDraft({ ...draft, managerName: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                </td>
                <td className="p-3">
                  <input value={draft.managerPhone ?? ""} onChange={(e) => setDraft({ ...draft, managerPhone: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                </td>
                <td className="p-3">
                  <input value={draft.costCenter ?? ""} onChange={(e) => setDraft({ ...draft, costCenter: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => save(null)} className="p-1 rounded hover:bg-gray-50"><Check size={14} /></button>
                  <button onClick={() => { setCreating(false); setDraft({}); }} className="p-1 rounded hover:bg-gray-50"><X size={14} /></button>
                </td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-secondary">Loading…</td></tr>
            ) : (stores ?? []).length === 0 && !creating ? (
              <tr><td colSpan={8} className="p-6 text-center text-secondary">No stores yet.</td></tr>
            ) : (stores ?? []).map((s) => {
              const isEditing = editing === s.id;
              return (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium">
                    {isEditing ? (
                      <input value={draft.name ?? s.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                    ) : s.name}
                  </td>
                  <td className="p-3 text-secondary">{s.chain?.name ?? "—"}</td>
                  <td className="p-3">
                    {isEditing ? (
                      <input value={draft.area ?? s.area ?? ""} onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                    ) : s.area ?? "—"}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input value={draft.managerName ?? s.managerName ?? ""} onChange={(e) => setDraft({ ...draft, managerName: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                    ) : s.managerName ?? "—"}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input value={draft.managerPhone ?? s.managerPhone ?? ""} onChange={(e) => setDraft({ ...draft, managerPhone: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                    ) : s.managerPhone ?? "—"}
                  </td>
                  <td className="p-3 text-secondary font-mono">{s.costCenter ?? "—"}</td>
                  <td className="p-3">
                    <span className={s.active ? "text-green-600" : "text-gray-400"}>{s.active ? "Yes" : "No"}</span>
                  </td>
                  <td className="p-3 text-right">
                    {isEditing ? (
                      <>
                        <button onClick={() => save(s.id)} className="p-1 rounded hover:bg-gray-50"><Check size={14} /></button>
                        <button onClick={() => { setEditing(null); setDraft({}); }} className="p-1 rounded hover:bg-gray-50"><X size={14} /></button>
                      </>
                    ) : (
                      <button onClick={() => { setEditing(s.id); setDraft(s); }} className="p-1 rounded hover:bg-gray-50"><Edit2 size={14} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
