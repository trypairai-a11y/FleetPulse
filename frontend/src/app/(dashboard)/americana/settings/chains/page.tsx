"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import { Plus, Edit2, Check, X } from "lucide-react";

interface Chain {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  active: boolean;
  _count?: { stores: number; rates: number };
}

export default function AmericanaChainsPage() {
  const { data, loading, refetch } = useApiGet<Chain[]>("/api/americana/chains");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Chain>>({});
  const [creating, setCreating] = useState(false);

  const save = async (id: string | null) => {
    if (id) await api.put(`/api/americana/chains/${id}`, draft);
    else await api.post("/api/americana/chains", draft);
    setEditing(null);
    setCreating(false);
    setDraft({});
    refetch();
  };

  const del = async (id: string) => {
    if (!confirm("Soft-delete this chain?")) return;
    await api.delete(`/api/americana/chains/${id}`);
    refetch();
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Americana chains</h1>
        <button
          onClick={() => { setCreating(true); setDraft({ active: true }); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover"
        >
          <Plus size={14} /> Add chain
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-secondary">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-right p-3">Stores</th>
              <th className="text-right p-3">Rates</th>
              <th className="text-left p-3">Active</th>
              <th className="text-right p-3 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creating && (
              <tr className="border-b border-gray-50 bg-blue-50/40">
                <td className="p-3">
                  <input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" placeholder="KFC" />
                </td>
                <td className="p-3 text-secondary">auto</td>
                <td className="p-3" />
                <td className="p-3" />
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
              <tr><td colSpan={6} className="p-6 text-center text-secondary">Loading…</td></tr>
            ) : (data ?? []).length === 0 && !creating ? (
              <tr><td colSpan={6} className="p-6 text-center text-secondary">No chains yet.</td></tr>
            ) : (data ?? []).map((c) => {
              const isEditing = editing === c.id;
              return (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium">
                    {isEditing ? (
                      <input value={draft.name ?? c.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-200 rounded-md text-sm" />
                    ) : c.name}
                  </td>
                  <td className="p-3 text-xs text-secondary font-mono">{c.slug}</td>
                  <td className="p-3 text-right font-mono">{c._count?.stores ?? 0}</td>
                  <td className="p-3 text-right font-mono">{c._count?.rates ?? 0}</td>
                  <td className="p-3">
                    {isEditing ? (
                      <input type="checkbox" checked={draft.active ?? c.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                    ) : (
                      <span className={c.active ? "text-green-600" : "text-gray-400"}>{c.active ? "Yes" : "No"}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {isEditing ? (
                      <>
                        <button onClick={() => save(c.id)} className="p-1 rounded hover:bg-gray-50"><Check size={14} /></button>
                        <button onClick={() => { setEditing(null); setDraft({}); }} className="p-1 rounded hover:bg-gray-50"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditing(c.id); setDraft(c); }} className="p-1 rounded hover:bg-gray-50"><Edit2 size={14} /></button>
                        <button onClick={() => del(c.id)} className="p-1 text-red-600 rounded hover:bg-red-50"><X size={14} /></button>
                      </>
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
