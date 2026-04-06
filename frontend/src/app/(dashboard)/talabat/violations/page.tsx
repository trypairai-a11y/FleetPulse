"use client";
import { useState, useRef } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  ShieldAlert, AlertTriangle, Camera, MapPin,
  CheckCircle2, ChevronRight, Loader2,
  Banknote, Wallet, ArrowDownToLine, TrendingUp,
  Download, Upload, Search, Eye,
} from "lucide-react";

/* ─── Section toggle ─── */
type Section = "VIOLATIONS" | "CASH_COLLECTION";

/* ─── Violation tabs ─── */
type ViolationTab = "ALL" | "SELFIE_FAIL" | "GPS_OFF" | "EQUIPMENT_MISSING" | "SHIFT_NOT_BOOKED" | "OUT_OF_ZONE" | "CASH_THRESHOLD_EXCEEDED";

const VIOLATION_TABS: { key: ViolationTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SELFIE_FAIL", label: "Selfie Failures" },
  { key: "GPS_OFF", label: "GPS Issues" },
  { key: "EQUIPMENT_MISSING", label: "Equipment" },
  { key: "SHIFT_NOT_BOOKED", label: "Shift Booking" },
  { key: "OUT_OF_ZONE", label: "Out of Zone" },
  { key: "CASH_THRESHOLD_EXCEEDED", label: "Cash Exceeded" },
];

/* ─── Cash collection sub-tabs ─── */
type CashTab = "LEDGER" | "RECORDS" | "DEPOSITS";

const CASH_TABS: { key: CashTab; label: string }[] = [
  { key: "LEDGER", label: "Pending Dues Ledger" },
  { key: "RECORDS", label: "Cash Records" },
  { key: "DEPOSITS", label: "Record Deposit" },
];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-500",
  MEDIUM: "bg-yellow-50 text-yellow-600",
  HIGH: "bg-orange-50 text-orange-600",
  CRITICAL: "bg-red-50 text-red-600",
};

const TYPE_COLORS: Record<string, string> = {
  SELFIE_FAIL: "bg-red-50 text-red-600",
  GPS_OFF: "bg-amber-50 text-amber-600",
  EQUIPMENT_MISSING: "bg-blue-50 text-blue-600",
  SHIFT_NOT_BOOKED: "bg-purple-50 text-purple-600",
  ZONE_MISMATCH: "bg-orange-50 text-orange-600",
  OUT_OF_ZONE: "bg-rose-50 text-rose-600",
  CASH_THRESHOLD_EXCEEDED: "bg-emerald-50 text-emerald-700",
  LATE_CLOCK_IN: "bg-yellow-50 text-yellow-600",
  EARLY_CLOCK_OUT: "bg-yellow-50 text-yellow-600",
  ORDER_CLICK_THROUGH: "bg-gray-100 text-gray-600",
};

const CASH_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  PARTIALLY_PAID: "bg-blue-50 text-blue-600",
  SETTLED: "bg-green-50 text-green-600",
  OPEN: "bg-amber-50 text-amber-600",
  CLOSED: "bg-green-50 text-green-600",
};

const DEPOSIT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  AL_MUZAINI: "Al Muzaini",
};

export default function TalabatCompliancePage() {
  const [section, setSection] = useState<Section>("VIOLATIONS");
  const [tab, setTab] = useState<ViolationTab>("ALL");
  const [cashTab, setCashTab] = useState<CashTab>("LEDGER");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [cashFilters, setCashFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [selectedCash, setSelectedCash] = useState<any>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // ─── Deposit form state ───
  const [depositForm, setDepositForm] = useState({ riderId: "", amount: "", method: "CASH", note: "" });
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositResult, setDepositResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // ─── Import state ───
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported?: number; errors?: string[] } | null>(null);

  /* ═══════════════════════════
     VIOLATIONS DATA
     ═══════════════════════════ */
  const violationParams = new URLSearchParams({ limit: "100" });
  if (tab !== "ALL") violationParams.set("type", tab);
  if (filters.dateFrom) violationParams.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) violationParams.set("dateTo", filters.dateTo);
  if (filters.search) violationParams.set("search", filters.search);
  if (filters.severity) violationParams.set("severity", filters.severity);

  const { data: summaryRaw } = useApiGet<any>("/api/talabat/compliance/summary");
  const { data, refetch } = useApiGet<any>(`/api/talabat/compliance?${violationParams}`);
  const events = data?.data || [];

  const byType = summaryRaw?.byType || [];
  const totalEvents = byType.reduce((s: number, t: any) => s + t.count, 0);
  const selfieFailures = byType.find((t: any) => t.type === "SELFIE_FAIL")?.count || 0;
  const gpsViolations = byType.find((t: any) => t.type === "GPS_OFF")?.count || 0;
  const unresolvedCount = summaryRaw?.unresolvedCount || 0;

  /* ═══════════════════════════
     CASH COLLECTION DATA
     ═══════════════════════════ */
  const cashParams = new URLSearchParams({ limit: "100" });
  if (cashFilters.status) cashParams.set("status", cashFilters.status);
  if (cashFilters.dateFrom) cashParams.set("dateFrom", cashFilters.dateFrom);
  if (cashFilters.dateTo) cashParams.set("dateTo", cashFilters.dateTo);
  if (cashFilters.driverId) cashParams.set("driverId", cashFilters.driverId);

  const ledgerParams = new URLSearchParams({ limit: "100" });
  if (cashFilters.month) ledgerParams.set("month", cashFilters.month);
  if (cashFilters.ledgerStatus) ledgerParams.set("status", cashFilters.ledgerStatus);

  const { data: cashData, refetch: refetchCash } = useApiGet<any>(`/api/cash?${cashParams}`);
  const { data: ledgerData, refetch: refetchLedger } = useApiGet<any>(`/api/cash/ledger?${ledgerParams}`);
  const cashRecords = cashData?.data || [];
  const ledgerRecords = ledgerData?.data || [];

  // Cash summary stats
  const totalPending = cashRecords
    .filter((r: any) => r.status === "PENDING")
    .reduce((sum: number, r: any) => sum + Number(r.pendingDues || 0), 0);
  const totalCollected = cashRecords
    .reduce((sum: number, r: any) => sum + Number(r.collectionAmount || 0), 0);
  const totalSales = cashRecords
    .reduce((sum: number, r: any) => sum + Number(r.salesAmount || 0), 0);
  const pendingCount = cashRecords.filter((r: any) => r.status === "PENDING").length;

  /* ═══════════════════════════
     HANDLERS
     ═══════════════════════════ */
  async function handleResolve(eventId: string) {
    setResolving(eventId);
    try {
      await api.put(`/api/talabat/compliance/${eventId}/resolve`);
      refetch();
      if (selected?.id === eventId) {
        setSelected((prev: any) => prev ? { ...prev, status: "RESOLVED" } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(null);
    }
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    setDepositSubmitting(true);
    setDepositResult(null);
    try {
      await api.post("/api/cash/deposit", {
        riderId: depositForm.riderId,
        amount: depositForm.amount,
        method: depositForm.method,
        note: depositForm.note,
        platform: "TALABAT",
      });
      setDepositResult({ success: true, message: "Deposit recorded successfully" });
      setDepositForm({ riderId: "", amount: "", method: "CASH", note: "" });
      refetchCash();
    } catch (err: any) {
      setDepositResult({ success: false, message: err?.response?.data?.error || "Failed to record deposit" });
    } finally {
      setDepositSubmitting(false);
    }
  }

  async function handleImportLedger(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (cashFilters.month) formData.append("month", cashFilters.month);
      const res = await api.post("/api/cash/import-ledger", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      refetchLedger();
    } catch (err: any) {
      setImportResult({ imported: 0, errors: [err?.response?.data?.error || "Import failed"] });
    } finally {
      setImporting(false);
    }
  }

  async function handleExportLedger() {
    try {
      const params = new URLSearchParams();
      if (cashFilters.month) params.set("month", cashFilters.month);
      const res = await api.get(`/api/cash/ledger/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "pending-dues-ledger.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  }

  function fmtKWD(val: any) {
    return `${Number(val || 0).toFixed(3)} KWD`;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <h1 className="text-xl font-semibold">Talabat — Violations</h1>
        <span className="text-sm text-secondary">Wahoo International</span>
      </div>

      {/* ─── Section Toggle: Violations | Cash Collection ─── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setSection("VIOLATIONS")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all",
            section === "VIOLATIONS"
              ? "bg-white text-foreground shadow-sm"
              : "text-secondary hover:text-foreground"
          )}
        >
          <ShieldAlert size={16} />
          Violations
        </button>
        <button
          onClick={() => setSection("CASH_COLLECTION")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all",
            section === "CASH_COLLECTION"
              ? "bg-white text-foreground shadow-sm"
              : "text-secondary hover:text-foreground"
          )}
        >
          <Banknote size={16} />
          Cash Collection
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          VIOLATIONS SECTION
          ═══════════════════════════════════════════ */}
      {section === "VIOLATIONS" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Total Events (This Week)" value={totalEvents} icon={ShieldAlert} />
            <StatCard title="Unresolved" value={unresolvedCount} icon={AlertTriangle} highlight={unresolvedCount > 0} />
            <StatCard title="Selfie Failures" value={selfieFailures} icon={Camera} highlight={selfieFailures > 0} />
            <StatCard title="GPS Violations" value={gpsViolations} icon={MapPin} highlight={gpsViolations > 0} />
          </div>

          {/* Violation Type Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {VIOLATION_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  tab === t.key ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <FilterBar
            filters={[
              { key: "search", type: "search", label: "Search", placeholder: "Search driver name..." },
              { key: "dateFrom", type: "date", label: "From" },
              { key: "dateTo", type: "date", label: "To" },
              {
                key: "severity", type: "select", label: "All Severities", options: [
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" },
                  { value: "CRITICAL", label: "Critical" },
                ],
              },
            ]}
            values={filters}
            onChange={(k, v) => setFilters({ ...filters, [k]: v })}
          />

          {/* Events Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date / Time</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Severity</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-secondary px-5 py-3">Action</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                        No violations found
                      </td>
                    </tr>
                  ) : (
                    events.map((evt: any) => (
                      <tr
                        key={evt.id}
                        onClick={() => setSelected(evt)}
                        className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-5 py-3 text-sm text-secondary font-mono">
                          {evt.createdAt
                            ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                          <br />
                          <span className="text-xs">
                            {evt.createdAt
                              ? new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium">
                          {evt.driver?.name || evt.driverName || "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[evt.type] || "bg-gray-100 text-gray-500")}>
                            {(evt.type || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", SEVERITY_COLORS[evt.severity] || "bg-gray-100 text-gray-500")}>
                            {evt.severity}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary max-w-xs truncate">
                          {evt.description || "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                            "bg-green-50 text-green-600": evt.status === "RESOLVED",
                            "bg-red-50 text-red-600": evt.status === "OPEN",
                          })}>
                            {evt.status}
                          </span>
                        </td>
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          {evt.status === "OPEN" && (
                            <button
                              onClick={() => handleResolve(evt.id)}
                              disabled={resolving === evt.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              {resolving === evt.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              Resolve
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <ChevronRight size={15} className="text-gray-300" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          CASH COLLECTION SECTION
          ═══════════════════════════════════════════ */}
      {section === "CASH_COLLECTION" && (
        <>
          {/* Cash Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Total Sales" value={fmtKWD(totalSales)} icon={TrendingUp} />
            <StatCard title="Total Collected" value={fmtKWD(totalCollected)} icon={ArrowDownToLine} />
            <StatCard title="Pending Dues" value={fmtKWD(totalPending)} icon={Wallet} highlight={totalPending > 0} />
            <StatCard title="Pending Records" value={pendingCount} icon={Banknote} highlight={pendingCount > 0} />
          </div>

          {/* Cash Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {CASH_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setCashTab(t.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  cashTab === t.key ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── LEDGER TAB ─── */}
          {cashTab === "LEDGER" && (
            <>
              <div className="flex items-center gap-3">
                <FilterBar
                  filters={[
                    { key: "month", type: "date", label: "Month" },
                    {
                      key: "ledgerStatus", type: "select", label: "All Statuses", options: [
                        { value: "OPEN", label: "Open" },
                        { value: "CLOSED", label: "Closed" },
                      ],
                    },
                  ]}
                  values={cashFilters}
                  onChange={(k, v) => setCashFilters({ ...cashFilters, [k]: v })}
                />
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleExportLedger}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    Export XLSX
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-talabat text-white rounded-xl hover:opacity-90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Import XLSX
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportLedger(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {importResult && (
                <div className={cn("p-4 rounded-xl text-sm", importResult.errors?.length ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700")}>
                  {importResult.imported !== undefined && <p className="font-medium">Imported {importResult.imported} records</p>}
                  {importResult.errors?.map((err, i) => <p key={i} className="mt-1">{err}</p>)}
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Rider</th>
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Rider ID</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Opening</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Sales</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Collected</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Cash/Muzaini</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Bank</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Closing</th>
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRecords.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-5 py-12 text-center text-sm text-secondary">
                            No ledger records found
                          </td>
                        </tr>
                      ) : (
                        ledgerRecords.map((rec: any) => (
                          <tr
                            key={rec.id}
                            onClick={() => setSelectedCash(rec)}
                            className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-5 py-3 text-sm font-medium">{rec.driver?.name || "—"}</td>
                            <td className="px-5 py-3 text-sm text-secondary font-mono">{rec.driver?.platformDriverId || "—"}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.openingBalance).toFixed(3)}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.totalSales).toFixed(3)}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.totalCollection).toFixed(3)}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.cashDeposits).toFixed(3)}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.bankTransfers).toFixed(3)}</td>
                            <td className={cn("px-5 py-3 text-sm text-right font-mono font-semibold", Number(rec.closingBalance) > 0 ? "text-red-600" : "text-green-600")}>
                              {Number(rec.closingBalance).toFixed(3)}
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", CASH_STATUS_COLORS[rec.status] || "bg-gray-100 text-gray-500")}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <Eye size={15} className="text-gray-300" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── CASH RECORDS TAB ─── */}
          {cashTab === "RECORDS" && (
            <>
              <FilterBar
                filters={[
                  { key: "dateFrom", type: "date", label: "From" },
                  { key: "dateTo", type: "date", label: "To" },
                  {
                    key: "status", type: "select", label: "All Statuses", options: [
                      { value: "PENDING", label: "Pending" },
                      { value: "PARTIALLY_PAID", label: "Partially Paid" },
                      { value: "SETTLED", label: "Settled" },
                    ],
                  },
                ]}
                values={cashFilters}
                onChange={(k, v) => setCashFilters({ ...cashFilters, [k]: v })}
              />

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Date</th>
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Driver</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Sales</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Collected</th>
                        <th className="text-right text-xs font-medium text-secondary px-5 py-3">Pending</th>
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Method</th>
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                        <th className="text-left text-xs font-medium text-secondary px-5 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                            No cash records found
                          </td>
                        </tr>
                      ) : (
                        cashRecords.map((rec: any) => (
                          <tr key={rec.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 text-sm text-secondary font-mono">
                              {new Date(rec.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </td>
                            <td className="px-5 py-3 text-sm font-medium">{rec.driver?.name || "—"}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.salesAmount).toFixed(3)}</td>
                            <td className="px-5 py-3 text-sm text-right font-mono">{Number(rec.collectionAmount).toFixed(3)}</td>
                            <td className={cn("px-5 py-3 text-sm text-right font-mono font-semibold", Number(rec.pendingDues) > 0 ? "text-red-600" : "text-green-600")}>
                              {Number(rec.pendingDues).toFixed(3)}
                            </td>
                            <td className="px-5 py-3 text-sm">
                              {rec.depositMethod ? (
                                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                  {DEPOSIT_METHOD_LABELS[rec.depositMethod] || rec.depositMethod}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", CASH_STATUS_COLORS[rec.status] || "bg-gray-100 text-gray-500")}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm text-secondary max-w-xs truncate">{rec.notes || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─── RECORD DEPOSIT TAB ─── */}
          {cashTab === "DEPOSITS" && (
            <div className="max-w-xl">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-1">Record Cash Deposit</h2>
                <p className="text-sm text-secondary mb-6">Submit a cash deposit for a driver. Enter their platform Rider ID.</p>

                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary uppercase mb-1.5">Rider ID</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={depositForm.riderId}
                        onChange={(e) => setDepositForm({ ...depositForm, riderId: e.target.value })}
                        placeholder="e.g. TAL-001"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-talabat/30 focus:border-talabat transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary uppercase mb-1.5">Amount (KWD)</label>
                    <input
                      type="number"
                      required
                      step="0.001"
                      min="0"
                      value={depositForm.amount}
                      onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                      placeholder="0.000"
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-talabat/30 focus:border-talabat transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary uppercase mb-1.5">Deposit Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["CASH", "BANK_TRANSFER", "AL_MUZAINI"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setDepositForm({ ...depositForm, method })}
                          className={cn(
                            "px-3 py-2.5 text-sm font-medium rounded-xl border transition-all",
                            depositForm.method === method
                              ? "bg-talabat/10 border-talabat text-talabat"
                              : "bg-white border-gray-200 text-secondary hover:border-gray-300"
                          )}
                        >
                          {DEPOSIT_METHOD_LABELS[method]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary uppercase mb-1.5">Note (Optional)</label>
                    <textarea
                      value={depositForm.note}
                      onChange={(e) => setDepositForm({ ...depositForm, note: e.target.value })}
                      placeholder="Add a note about this deposit..."
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-talabat/30 focus:border-talabat transition-colors resize-none"
                    />
                  </div>

                  {depositResult && (
                    <div className={cn("p-3 rounded-xl text-sm font-medium", depositResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                      {depositResult.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={depositSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-talabat text-white rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    {depositSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowDownToLine size={16} />
                    )}
                    Record Deposit
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Violation Detail Panel ─── */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driver?.name || selected?.driverName || "Event Detail"}
        subtitle={`Violation — ${(selected?.type || "").replace(/_/g, " ")}`}
      >
        {selected && (
          <div className="space-y-5">
            <div className={cn("p-4 rounded-xl border", {
              "bg-red-50 border-red-100": selected.severity === "CRITICAL" || selected.severity === "HIGH",
              "bg-yellow-50 border-yellow-100": selected.severity === "MEDIUM",
              "bg-gray-50 border-gray-100": selected.severity === "LOW",
            })}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", TYPE_COLORS[selected.type] || "bg-gray-100 text-gray-500")}>
                  {(selected.type || "").replace(/_/g, " ")}
                </span>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", SEVERITY_COLORS[selected.severity] || "bg-gray-100 text-gray-500")}>
                  {selected.severity}
                </span>
              </div>
              <p className="text-sm mt-2">{selected.description || "No description"}</p>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-[10px] text-secondary uppercase font-medium">Status</p>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium mt-1 inline-block", {
                  "bg-green-50 text-green-600": selected.status === "RESOLVED",
                  "bg-red-50 text-red-600": selected.status === "OPEN",
                })}>
                  {selected.status}
                </span>
              </div>
              {selected.status === "OPEN" && (
                <button
                  onClick={() => handleResolve(selected.id)}
                  disabled={resolving === selected.id}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {resolving === selected.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Mark Resolved
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Date", selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "—"],
                ["Time", selected.createdAt ? new Date(selected.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"],
                ["Driver", selected.driver?.name || selected.driverName || "—"],
                ["Driver ID", selected.driver?.platformDriverId || "—"],
                ["Zone", selected.zone || selected.driver?.zone || "—"],
                ["Session", selected.sessionCode || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "—"}</p>
                </div>
              ))}
            </div>

            {selected.metadata && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Event Metadata</h3>
                <div className="space-y-2">
                  {Object.entries(selected.metadata).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-sm text-secondary font-mono">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === "RESOLVED" && selected.resolvedAt && (
              <div>
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Resolution</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Resolved At", new Date(selected.resolvedAt).toLocaleString()],
                    ["Resolved By", selected.resolvedBy || "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                {selected.resolutionNote && (
                  <div className="bg-gray-50 rounded-xl p-3 mt-2">
                    <p className="text-[10px] text-secondary uppercase font-medium">Note</p>
                    <p className="text-sm mt-0.5">{selected.resolutionNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* ─── Cash Ledger Detail Panel ─── */}
      <SlidePanel
        open={!!selectedCash}
        onClose={() => setSelectedCash(null)}
        title={selectedCash?.driver?.name || "Ledger Detail"}
        subtitle={selectedCash?.month ? `Ledger — ${new Date(selectedCash.month).toLocaleDateString([], { month: "long", year: "numeric" })}` : "Pending Dues"}
      >
        {selectedCash && (
          <div className="space-y-5">
            {/* Driver Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Driver", selectedCash.driver?.name || "—"],
                ["Rider ID", selectedCash.driver?.platformDriverId || "—"],
                ["Platform", selectedCash.driver?.platform || "—"],
                ["Status", selectedCash.driver?.status || "—"],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Financial Breakdown</h3>
              <div className="space-y-2">
                {[
                  ["Opening Balance", fmtKWD(selectedCash.openingBalance)],
                  ["Total Sales", fmtKWD(selectedCash.totalSales)],
                  ["Total Collection", fmtKWD(selectedCash.totalCollection)],
                  ["Cash / Al Muzaini", fmtKWD(selectedCash.cashDeposits)],
                  ["Bank Transfers", fmtKWD(selectedCash.bankTransfers)],
                  ["Incentives", fmtKWD(selectedCash.incentives)],
                  ["Adjustments", fmtKWD(selectedCash.adjustments)],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-sm font-mono">{val}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-900 text-white rounded-xl">
                  <p className="text-sm font-semibold">Closing Balance</p>
                  <p className="text-sm font-mono font-bold">{fmtKWD(selectedCash.closingBalance)}</p>
                </div>
              </div>
            </div>

            {/* Ledger Status */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-[10px] text-secondary uppercase font-medium">Ledger Status</p>
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium mt-1 inline-block", CASH_STATUS_COLORS[selectedCash.status] || "bg-gray-100 text-gray-500")}>
                  {selectedCash.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-secondary uppercase font-medium">Last Updated</p>
                <p className="text-sm font-medium mt-0.5">
                  {selectedCash.updatedAt ? new Date(selectedCash.updatedAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
