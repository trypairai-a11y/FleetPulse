"use client";
import { useState, useEffect } from "react";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  Save,
  Plus,
  X,
  Loader2,
  Target,
  Package,
  BarChart3,
  MapPin,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Timer,
  Hash,
  TrendingUp,
} from "lucide-react";

type Tab = "targets" | "inventory" | "kpis" | "zones";

interface Props {
  platform: string;
  platformLabel: string;
  platformColor: string;
}

const INVENTORY_ITEMS = [
  "HELMET", "TSHIRT", "PANTS", "COOLING_VEST", "SAFETY_VEST", "WATER_BOTTLE",
  "GLOVES", "SAFETY_KIT", "BIG_BAG", "SMALL_BAG", "CAP", "MOBILE_PHONE", "SIM_CARD", "PETROL_CARD",
];

const ITEM_LABELS: Record<string, string> = {
  HELMET: "Helmet", TSHIRT: "T-Shirt", PANTS: "Pants", COOLING_VEST: "Cooling Vest",
  SAFETY_VEST: "Safety Vest", WATER_BOTTLE: "Water Bottle", GLOVES: "Gloves",
  SAFETY_KIT: "Safety Kit", BIG_BAG: "Big Bag", SMALL_BAG: "Small Bag", CAP: "Cap",
  MOBILE_PHONE: "Mobile Phone", SIM_CARD: "SIM Card", PETROL_CARD: "Petrol Card",
};

export default function PlatformSettingsPage({ platform, platformLabel, platformColor }: Props) {
  const [tab, setTab] = useState<Tab>("targets");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: settings, loading: settingsLoading, refetch } = useApiGet<any>(`/api/platform-settings/${platform}`);
  const { data: inventoryData, loading: inventoryLoading, refetch: refetchInventory } = useApiGet<any>(`/api/platform-settings/${platform}/inventory`);

  const [targets, setTargets] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [shiftRules, setShiftRules] = useState<any>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [newZone, setNewZone] = useState("");

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [addItem, setAddItem] = useState({ companyId: "", itemType: "HELMET", total: 0, minStock: 0 });

  useEffect(() => {
    if (settings) {
      setTargets(settings.targets);
      setKpis(settings.kpis);
      setShiftRules(settings.shiftRules);
      setZones(settings.zones || []);
    }
  }, [settings]);

  useEffect(() => {
    if (inventoryData?.data) {
      setInventoryItems(inventoryData.data);
    }
  }, [inventoryData]);

  const companies = inventoryData?.companies || [];

  function showSaveStatus(status: "success" | "error", msg?: string) {
    setSaveStatus(status);
    if (msg) setErrorMsg(msg);
    setTimeout(() => { setSaveStatus("idle"); setErrorMsg(""); }, 3000);
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      await api.put(`/api/platform-settings/${platform}`, { targets, kpis, shiftRules, zones });
      showSaveStatus("success");
      refetch();
    } catch (err: any) {
      showSaveStatus("error", err?.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveInventory() {
    setSaving(true);
    try {
      const items = inventoryItems.map((item: any) => ({
        companyId: item.companyId,
        itemType: item.itemType,
        total: item.total,
        issued: item.issued,
        minStock: item.minStock,
      }));
      await api.put(`/api/platform-settings/${platform}/inventory`, { items });
      showSaveStatus("success");
      refetchInventory();
    } catch (err: any) {
      showSaveStatus("error", err?.response?.data?.error || "Failed to save inventory");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddInventoryItem() {
    if (!addItem.companyId) return;
    setSaving(true);
    try {
      await api.put(`/api/platform-settings/${platform}/inventory`, {
        items: [{ companyId: addItem.companyId, itemType: addItem.itemType, total: addItem.total, issued: 0, minStock: addItem.minStock }],
      });
      setShowAddInventory(false);
      setAddItem({ companyId: "", itemType: "HELMET", total: 0, minStock: 0 });
      showSaveStatus("success");
      refetchInventory();
    } catch (err: any) {
      showSaveStatus("error", err?.response?.data?.error || "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "targets", label: "Targets", icon: Target },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "kpis", label: "KPIs & Grading", icon: BarChart3 },
    { key: "zones", label: "Zones", icon: MapPin },
  ];

  const isLoading = tab === "inventory" ? inventoryLoading : settingsLoading;

  function SaveButton({ onClick }: { onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
          saveStatus === "success"
            ? "bg-green-500 text-white"
            : saveStatus === "error"
            ? "bg-red-500 text-white"
            : "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow"
        )}
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saveStatus === "success" ? (
          <CheckCircle2 size={16} />
        ) : saveStatus === "error" ? (
          <AlertCircle size={16} />
        ) : (
          <Save size={16} />
        )}
        {saving ? "Saving..." : saveStatus === "success" ? "Saved!" : saveStatus === "error" ? "Error" : "Save Changes"}
      </button>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{platformLabel} Settings</h1>
          <p className="text-sm text-secondary mt-1">Configure targets, inventory, and KPIs</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === "inventory" && (
            <button onClick={() => setShowAddInventory(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              <Plus size={16} /> Add Item
            </button>
          )}
          {(tab === "targets" || tab === "kpis" || tab === "zones") && (
            <SaveButton onClick={handleSaveSettings} />
          )}
          {tab === "inventory" && (
            <SaveButton onClick={handleSaveInventory} />
          )}
        </div>
      </div>

      {/* Error banner */}
      {saveStatus === "error" && errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              tab === t.key ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-40 mb-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Targets Tab ── */}
      {tab === "targets" && targets && !isLoading && (
        <div className="space-y-6">
          {/* Main Target */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={cn("p-2 rounded-xl bg-orange-50", platformColor)}>
                <Target size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Main Target</h2>
                <p className="text-xs text-secondary">Primary performance metric for this platform</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">{targets.mainTarget.name}</label>
                <input
                  type="number"
                  min={0}
                  value={targets.mainTarget.value}
                  onChange={(e) => setTargets({ ...targets, mainTarget: { ...targets.mainTarget, value: Number(e.target.value) } })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Unit</label>
                <input value={targets.mainTarget.unit} disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-gray-50 text-secondary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Description</label>
                <input value={targets.mainTarget.description || ""} disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-gray-50 text-secondary" />
              </div>
            </div>
          </div>

          {/* Sub Targets */}
          {targets.subTargets?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Sub Targets</h2>
                  <p className="text-xs text-secondary">Secondary metrics tracked alongside the main target</p>
                </div>
              </div>
              <div className="space-y-0 divide-y divide-gray-100">
                {targets.subTargets.map((sub: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-4 gap-4 py-4 first:pt-0 last:pb-0">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Name</label>
                      <input value={sub.name} disabled
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-gray-50 text-secondary font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Target Value</label>
                      <input
                        type="number"
                        min={0}
                        value={sub.value}
                        onChange={(e) => {
                          const updated = [...targets.subTargets];
                          updated[idx] = { ...sub, value: Number(e.target.value) };
                          setTargets({ ...targets, subTargets: updated });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Unit</label>
                      <input value={sub.unit} disabled
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-gray-50 text-secondary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Description</label>
                      <input value={sub.description || ""} disabled
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-gray-50 text-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shift Rules */}
          {shiftRules && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Shift Rules</h2>
                  <p className="text-xs text-secondary">Configure shift duration, attendance, and cash handling rules</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-1.5">
                    <Timer size={12} />
                    Default Hours per Shift
                  </label>
                  <div className="relative">
                    <input type="number" min={1} max={24} value={shiftRules.defaultHoursPerShift}
                      onChange={(e) => setShiftRules({ ...shiftRules, defaultHoursPerShift: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">hours</span>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-1.5">
                    <AlertCircle size={12} />
                    Max Late Minutes (grace period)
                  </label>
                  <div className="relative">
                    <input type="number" min={0} max={60} value={shiftRules.maxLateMinutes}
                      onChange={(e) => setShiftRules({ ...shiftRules, maxLateMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">min</span>
                  </div>
                  <p className="text-[11px] text-secondary mt-1">After this, driver is marked LATE</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-1.5">
                    <Clock size={12} />
                    Early Clock-Out Threshold
                  </label>
                  <div className="relative">
                    <input type="number" min={0} max={120} value={shiftRules.earlyClockOutMinutes}
                      onChange={(e) => setShiftRules({ ...shiftRules, earlyClockOutMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">min</span>
                  </div>
                  <p className="text-[11px] text-secondary mt-1">Clock-out this early flags as early departure</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-1.5">
                    <DollarSign size={12} />
                    Max Cash Hold
                  </label>
                  <div className="relative">
                    <input type="number" min={0} value={shiftRules.maxCashHoldKD ?? ""}
                      onChange={(e) => setShiftRules({ ...shiftRules, maxCashHoldKD: e.target.value === "" ? 0 : Number(e.target.value) })}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">KD</span>
                  </div>
                  <p className="text-[11px] text-secondary mt-1">Maximum cash a driver can hold before deposit</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Inventory Tab ── */}
      {tab === "inventory" && !isLoading && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {inventoryItems.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Item</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Company</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Total</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Issued</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Available</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Min Stock</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((item: any) => {
                  const available = item.total - item.issued;
                  const isLow = available <= item.minStock;
                  return (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium">{ITEM_LABELS[item.itemType] || item.itemType}</td>
                      <td className="px-5 py-3.5 text-sm text-secondary">{item.company?.name || "—"}</td>
                      <td className="px-5 py-3.5">
                        <input type="number" min={0} value={item.total}
                          onChange={(e) => {
                            const updated = inventoryItems.map((i: any) =>
                              i.id === item.id ? { ...i, total: Number(e.target.value), available: Number(e.target.value) - i.issued } : i
                            );
                            setInventoryItems(updated);
                          }}
                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-secondary">{item.issued}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn("text-sm font-medium", isLow ? "text-red-600" : "text-foreground")}>
                          {available}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <input type="number" min={0} value={item.minStock}
                          onChange={(e) => {
                            const updated = inventoryItems.map((i: any) =>
                              i.id === item.id ? { ...i, minStock: Number(e.target.value) } : i
                            );
                            setInventoryItems(updated);
                          }}
                          className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-medium",
                          isLow ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                        )}>
                          {isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-16 text-center">
              <Package size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-secondary">No inventory items configured</p>
              <p className="text-xs text-secondary mt-1">Click &quot;Add Item&quot; to get started</p>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs Tab ── */}
      {tab === "kpis" && kpis && !isLoading && (
        <div className="space-y-6">
          {/* Grading Scale */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Grading Scale</h2>
                <p className="text-xs text-secondary">Define grade labels, percentage ranges, and colors</p>
              </div>
            </div>
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-1 mb-1">
                <div className="w-3" />
                <div className="text-xs font-medium text-secondary">Label</div>
                <div className="text-xs font-medium text-secondary w-[140px] text-center">Range (%)</div>
                <div className="text-xs font-medium text-secondary w-8 text-center">Color</div>
              </div>
              {kpis.gradingScale?.map((grade: any, idx: number) => (
                <div key={idx} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center bg-gray-50/50 rounded-xl px-3 py-2.5">
                  <div className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: grade.color }} />
                  <input value={grade.label}
                    onChange={(e) => {
                      const updated = [...kpis.gradingScale];
                      updated[idx] = { ...grade, label: e.target.value };
                      setKpis({ ...kpis, gradingScale: updated });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                  <div className="flex items-center gap-2 w-[140px]">
                    <input type="number" min={0} max={100} value={grade.minPercent}
                      onChange={(e) => {
                        const updated = [...kpis.gradingScale];
                        updated[idx] = { ...grade, minPercent: Number(e.target.value) };
                        setKpis({ ...kpis, gradingScale: updated });
                      }}
                      className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                    <span className="text-secondary text-sm">–</span>
                    <input type="number" min={0} max={100} value={grade.maxPercent}
                      onChange={(e) => {
                        const updated = [...kpis.gradingScale];
                        updated[idx] = { ...grade, maxPercent: Number(e.target.value) };
                        setKpis({ ...kpis, gradingScale: updated });
                      }}
                      className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                  </div>
                  <input type="color" value={grade.color}
                    onChange={(e) => {
                      const updated = [...kpis.gradingScale];
                      updated[idx] = { ...grade, color: e.target.value };
                      setKpis({ ...kpis, gradingScale: updated });
                    }}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer bg-white" />
                </div>
              ))}
            </div>
          </div>

          {/* KPI Weights */}
          {kpis.weights && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Hash size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold">KPI Weights</h2>
                  <p className="text-xs text-secondary">How much each factor contributes to the Darb grade</p>
                </div>
              </div>
              {(() => {
                const total = Object.values(kpis.weights).reduce((a: number, b: any) => a + Number(b), 0);
                const isValid = total === 100;
                return (
                  <>
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-4 mt-3",
                      isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    )}>
                      {isValid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      Total: {total}% {!isValid && "— Must equal 100%"}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(kpis.weights).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3">
                          <label className="text-sm font-medium min-w-[140px] capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </label>
                          <div className="relative flex-1 max-w-[100px]">
                            <input type="number" min={0} max={100} value={value as number}
                              onChange={(e) => setKpis({ ...kpis, weights: { ...kpis.weights, [key]: Number(e.target.value) } })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-secondary">%</span>
                          </div>
                          {/* Visual bar */}
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(Number(value), 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Thresholds */}
          {kpis.thresholds && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Target size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Performance Thresholds</h2>
                  <p className="text-xs text-secondary">Boundary values for performance grading calculations</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {Object.entries(kpis.thresholds).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-secondary mb-1.5 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <input type="number" value={value as number}
                      onChange={(e) => setKpis({ ...kpis, thresholds: { ...kpis.thresholds, [key]: Number(e.target.value) } })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Zones Tab ── */}
      {tab === "zones" && !isLoading && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Zones</h2>
              <p className="text-xs text-secondary">Define delivery zones for this platform ({zones.length} zones)</p>
            </div>
          </div>
          {zones.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-5">
              {zones.map((zone, idx) => (
                <div key={idx} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm group hover:border-gray-200 transition-colors">
                  <span>{zone}</span>
                  <button
                    onClick={() => setZones(zones.filter((_, i) => i !== idx))}
                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-5">
              <MapPin size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-secondary">No zones configured yet</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newZone.trim()) {
                  setZones([...zones, newZone.trim()]);
                  setNewZone("");
                }
              }}
              placeholder="Add zone name..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-shadow"
            />
            <button
              onClick={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }}
              disabled={!newZone.trim()}
              className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {showAddInventory && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddInventory(false)}>
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Inventory Item</h2>
              <button onClick={() => setShowAddInventory(false)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Company</label>
                <select value={addItem.companyId} onChange={(e) => setAddItem({ ...addItem, companyId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow">
                  <option value="">Select company...</option>
                  {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Item Type</label>
                <select value={addItem.itemType} onChange={(e) => setAddItem({ ...addItem, itemType: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow">
                  {INVENTORY_ITEMS.map((item) => <option key={item} value={item}>{ITEM_LABELS[item]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Total Quantity</label>
                  <input type="number" min={0} value={addItem.total}
                    onChange={(e) => setAddItem({ ...addItem, total: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Min Stock Alert</label>
                  <input type="number" min={0} value={addItem.minStock}
                    onChange={(e) => setAddItem({ ...addItem, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                </div>
              </div>
              <button onClick={handleAddInventoryItem} disabled={saving || !addItem.companyId}
                className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-40">
                {saving ? "Adding..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
