"use client";
import { useMemo, useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import StatCard from "@/components/shared/StatCard";
import SlidePanel from "@/components/shared/SlidePanel";
import { CalendarDays, MapPin, Users, Plus, Trash2, Pencil, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

const AREAS = ["Hawally", "Salmiya", "Ardiya", "Jahra", "Khiran", "Mishref", "Sabah Al Salem", "Abu Halifa", "Fahaheel", "Mangaf", "Sidra", "Avenues", "Jabriya"];
const VEHICLE_TYPES = ["BIKE", "CAR"];

type Slot = {
  id: string;
  date: string;
  area: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  claimed: number;
  vehicleType: string | null;
  branchName: string | null;
  source: string;
  notes: string | null;
};

type SlotResponse = { slots: Slot[]; totals: { capacity: number; claimed: number; open: number } };

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function KeetaAvailableShiftsPage() {
  const [date, setDate] = useState<string>(todayStr());
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [editing, setEditing] = useState<Slot | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const qs = new URLSearchParams({ date });
  if (areaFilter) qs.set("area", areaFilter);
  if (vehicleFilter) qs.set("vehicleType", vehicleFilter);

  const { data, loading, error, refetch } = useApiGet<SlotResponse>(`/api/keeta/available-shifts?${qs.toString()}`);

  const byArea = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of data?.slots ?? []) {
      const arr = m.get(s.area) ?? [];
      arr.push(s);
      m.set(s.area, arr);
    }
    return Array.from(m.entries()).map(([area, slots]) => ({
      area,
      slots: slots.sort((a, b) => a.slotStart.localeCompare(b.slotStart)),
      capacity: slots.reduce((sum, s) => sum + s.capacity, 0),
      claimed: slots.reduce((sum, s) => sum + s.claimed, 0),
    }));
  }, [data]);

  const totals = data?.totals ?? { capacity: 0, claimed: 0, open: 0 };

  async function handleDelete(id: string) {
    if (!confirm("Delete this slot?")) return;
    await api.delete(`/api/keeta/available-shifts/${id}`);
    refetch();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Available Shifts</h1>
          <p className="text-sm text-secondary mt-1">Open shift slots from the Keeta driver app — capacity vs claimed, by area.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-keeta text-white text-sm hover:opacity-90">
            <Plus size={14} /> New slot
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total capacity" value={totals.capacity} icon={Users} />
        <StatCard title="Claimed" value={totals.claimed} icon={CheckCircle2} />
        <StatCard title="Open" value={totals.open} icon={CalendarDays} />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3">
        <label className="text-sm text-gray-600">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
        />
        <label className="text-sm text-gray-600">Area</label>
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
          <option value="">All areas</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="text-sm text-gray-600">Vehicle</label>
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
          <option value="">All</option>
          {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
      {loading && !data && <div className="p-8 text-center text-sm text-secondary">Loading…</div>}

      {!loading && byArea.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <MapPin className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-sm text-gray-600">No available shift slots published for {date}.</p>
          <button onClick={() => setCreating(true)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-keeta text-white text-sm">
            <Plus size={14} /> Add the first slot
          </button>
        </div>
      )}

      <div className="space-y-4">
        {byArea.map((group) => (
          <div key={group.area} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-keeta" />
                <h3 className="font-medium text-gray-800">{group.area}</h3>
                <span className="text-xs text-secondary">{group.slots.length} slot{group.slots.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="text-xs text-secondary">
                <span className="font-medium text-gray-700">{group.claimed}</span> / {group.capacity} claimed
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-secondary uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-5 py-2">Time</th>
                  <th className="text-left font-medium px-5 py-2">Vehicle</th>
                  <th className="text-left font-medium px-5 py-2">Branch</th>
                  <th className="text-left font-medium px-5 py-2">Capacity</th>
                  <th className="text-left font-medium px-5 py-2">Claimed</th>
                  <th className="text-left font-medium px-5 py-2">Open</th>
                  <th className="text-left font-medium px-5 py-2">Source</th>
                  <th className="text-right font-medium px-5 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.slots.map((s) => {
                  const open = Math.max(0, s.capacity - s.claimed);
                  const pct = s.capacity ? Math.min(100, Math.round((s.claimed / s.capacity) * 100)) : 0;
                  return (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 font-medium text-gray-800">{s.slotStart} – {s.slotEnd}</td>
                      <td className="px-5 py-2.5 text-gray-600">{s.vehicleType || "—"}</td>
                      <td className="px-5 py-2.5 text-gray-600">{s.branchName || "—"}</td>
                      <td className="px-5 py-2.5 text-gray-800">{s.capacity}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800 font-medium">{s.claimed}</span>
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={cn("h-full", pct >= 100 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-green-400")} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          open === 0 ? "bg-red-50 text-red-600" : open <= 2 ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700")}>
                          {open}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-secondary">{s.source}</td>
                      <td className="px-5 py-2.5 text-right">
                        <button onClick={() => setEditing(s)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500 ms-1"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <SlidePanel open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit slot" : "New available slot"}>
        <SlotForm
          initial={editing || { date, area: AREAS[0], slotStart: "08:00", slotEnd: "12:00", capacity: 10, claimed: 0, vehicleType: "", branchName: "", notes: "" }}
          onSaved={() => { setCreating(false); setEditing(null); refetch(); }}
        />
      </SlidePanel>
    </div>
  );
}

function SlotForm({ initial, onSaved }: { initial: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    id: initial.id as string | undefined,
    date: (initial.date || "").slice(0, 10) || todayStr(),
    area: initial.area || AREAS[0],
    slotStart: initial.slotStart || "08:00",
    slotEnd: initial.slotEnd || "12:00",
    capacity: initial.capacity ?? 10,
    claimed: initial.claimed ?? 0,
    vehicleType: initial.vehicleType || "",
    branchName: initial.branchName || "",
    notes: initial.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        date: form.date,
        area: form.area,
        slotStart: form.slotStart,
        slotEnd: form.slotEnd,
        capacity: Number(form.capacity),
        claimed: Number(form.claimed),
        vehicleType: form.vehicleType || null,
        branchName: form.branchName || null,
        notes: form.notes || null,
      };
      if (form.id) await api.put(`/api/keeta/available-shifts/${form.id}`, payload);
      else await api.post(`/api/keeta/available-shifts`, payload);
      onSaved();
    } catch (e: any) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  const F = (label: string, child: React.ReactNode) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>
      {child}
    </div>
  );
  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm";

  return (
    <div className="space-y-4 p-5">
      {err && <div className="p-2 rounded-lg bg-red-50 text-red-600 text-sm">{err}</div>}
      {F("Date", <input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />)}
      {F("Area", (
        <select className={input} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {F("Start", <input type="time" className={input} value={form.slotStart} onChange={(e) => setForm({ ...form, slotStart: e.target.value })} />)}
        {F("End", <input type="time" className={input} value={form.slotEnd} onChange={(e) => setForm({ ...form, slotEnd: e.target.value })} />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {F("Capacity", <input type="number" min={0} className={input} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value as any })} />)}
        {F("Claimed", <input type="number" min={0} className={input} value={form.claimed} onChange={(e) => setForm({ ...form, claimed: e.target.value as any })} />)}
      </div>
      {F("Vehicle type", (
        <select className={input} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
          <option value="">Any</option>
          {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ))}
      {F("Branch (optional)", <input className={input} value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} placeholder="e.g. Sidra" />)}
      {F("Notes", <textarea className={input} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />)}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-keeta text-white text-sm disabled:opacity-50">
          {saving ? "Saving…" : form.id ? "Save changes" : "Create slot"}
        </button>
      </div>
    </div>
  );
}
