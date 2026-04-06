"use client";
import { useState, useMemo } from "react";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  Wallet, AlertTriangle, TrendingUp, Download, Upload,
  ChevronDown, ChevronRight, Plus, X, Check, Loader2,
} from "lucide-react";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

type LedgerRow = {
  id: string;
  riderId: string;
  riderName: string;
  companyCode: string;
  status: string;
  openingBalance: number;
  totalSales: number;
  totalCollection: number;
  cashAlMuzaini: number;
  bankTransfer: number;
  incentivesTips: number;
  adjustments: number;
  pendingDues: number;
  dailySales: Record<string, number>;
  dailyCollections: Record<string, number>;
};

function kd(v: any) {
  if (v == null) return "—";
  return Number(v).toFixed(3);
}

function DepositModal({ rider, onClose, onSuccess }: { rider: LedgerRow; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) { setError("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await api.post("/api/cash/deposit", {
        riderId: rider.riderId,
        amount: Number(amount),
        method,
        note,
        platform: "TALABAT",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to record deposit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Record Deposit</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-secondary mb-5">
          Driver: <span className="font-medium text-foreground">{rider.riderName}</span>
          {" · "}Pending: <span className="font-medium text-orange-600">{kd(rider.pendingDues)} KD</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Amount (KWD)</label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="CASH">Cash</option>
              <option value="AL_MUZAINI">Al-Muzaini</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reference number, remarks..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Confirm Deposit
          </button>
        </form>
      </div>
    </div>
  );
}

function DailyBreakdown({ row }: { row: LedgerRow }) {
  return (
    <tr className="bg-orange-50/50">
      <td colSpan={8} className="px-3 py-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-secondary py-1 pr-3 min-w-[80px]">Type</th>
                {DAYS.map((d) => (
                  <th key={d} className="text-center font-medium text-secondary py-1 px-1 min-w-[36px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sales Row */}
              <tr>
                <td className="font-medium text-orange-700 pr-3 py-1">Sales</td>
                {DAYS.map((d) => {
                  const sale = row.dailySales?.[d];
                  const collection = row.dailyCollections?.[d];
                  const hasSaleNoCollection = sale != null && sale > 0 && (!collection || collection === 0);
                  return (
                    <td
                      key={d}
                      className={cn(
                        "text-center py-1 px-1 rounded font-mono",
                        hasSaleNoCollection ? "bg-orange-200 text-orange-800 font-medium" : "text-foreground"
                      )}
                    >
                      {sale != null && sale > 0 ? Number(sale).toFixed(2) : ""}
                    </td>
                  );
                })}
              </tr>
              {/* Collections Row */}
              <tr>
                <td className="font-medium text-green-700 pr-3 py-1">Collected</td>
                {DAYS.map((d) => {
                  const coll = row.dailyCollections?.[d];
                  return (
                    <td key={d} className="text-center py-1 px-1 font-mono text-green-700">
                      {coll != null && coll > 0 ? Number(coll).toFixed(2) : ""}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

export default function TalabatCashPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [depositRider, setDepositRider] = useState<LedgerRow | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const { data, refetch } = useApiGet<any>(`/api/cash/ledger?month=${month}&limit=100`);
  // Map Prisma fields to LedgerRow shape
  const ledger: LedgerRow[] = (data?.data || []).map((r: any) => ({
    id: r.id,
    riderId: r.driver?.platformDriverId || r.driverId,
    riderName: r.driver?.name || "—",
    companyCode: "WAHI",
    status: r.driver?.status || "ACTIVE",
    openingBalance: Number(r.openingBalance || 0),
    totalSales: Number(r.totalSales || 0),
    totalCollection: Number(r.totalCollection || 0),
    cashAlMuzaini: Number(r.cashDeposits || 0),
    bankTransfer: Number(r.bankTransfers || 0),
    incentivesTips: Number(r.incentives || 0),
    adjustments: Number(r.adjustments || 0),
    pendingDues: Number(r.closingBalance || 0),
    dailySales: r.dailySales || {},
    dailyCollections: r.dailyCollections || {},
  }));

  const filtered = useMemo(() => {
    if (!search) return ledger;
    const q = search.toLowerCase();
    return ledger.filter(
      (r) =>
        r.riderName?.toLowerCase().includes(q) ||
        r.riderId?.toLowerCase().includes(q) ||
        r.companyCode?.toLowerCase().includes(q)
    );
  }, [ledger, search]);

  // Summary calculations
  const totalPending = ledger.reduce((s, r) => s + r.pendingDues, 0);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    try {
      const res = await api.get(`/api/cash/ledger/export?platform=TALABAT&month=${month}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `talabat-cash-ledger-${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleImport(file: File) {
    setImportLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("platform", "TALABAT");
      form.append("month", month);
      await api.post("/api/cash/ledger/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Talabat — Pending Dues Ledger</h1>
          <span className="text-sm text-secondary">Wahoo International</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <label className={cn(
            "flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer",
            importLoading && "opacity-50 pointer-events-none"
          )}>
            {importLoading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} className="text-secondary" />}
            Import XLSX
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={15} className="text-secondary" /> Export XLSX
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Collected"
          value={`${ledger.reduce((s, r) => s + r.totalCollection, 0).toFixed(3)} KWD`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Deposits"
          value={`${ledger.reduce((s, r) => s + r.cashAlMuzaini + r.bankTransfer, 0).toFixed(3)} KWD`}
          icon={Wallet}
        />
        <StatCard
          title="Total Remaining Balance"
          value={`${totalPending.toFixed(3)} KWD`}
          icon={AlertTriangle}
          highlight={totalPending > 100}
          className={totalPending > 100 ? "ring-orange-200" : ""}
        />
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by rider name, ID or company code..."
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 min-w-[280px]"
        />
        <span className="text-sm text-secondary">{filtered.length} riders</span>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-8 px-3 py-3" />
                <th className="text-left text-xs font-medium text-secondary px-4 py-3 whitespace-nowrap">Rider ID</th>
                <th className="text-left text-xs font-medium text-secondary px-4 py-3 whitespace-nowrap">Rider Name</th>
                <th className="text-left text-xs font-medium text-secondary px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-secondary px-4 py-3 whitespace-nowrap">Collected</th>
                <th className="text-right text-xs font-medium text-secondary px-4 py-3 whitespace-nowrap">Deposit</th>
                <th className="text-right text-xs font-medium text-secondary px-4 py-3 whitespace-nowrap">Remaining Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                    No ledger data for {month}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
                  const highDue = row.pendingDues > 50;
                  const totalDeposit = row.cashAlMuzaini + row.bankTransfer;
                  return (
                    <>
                      <tr
                        key={row.id}
                        onClick={() => toggleRow(row.id)}
                        className={cn(
                          "border-b border-gray-50 cursor-pointer transition-colors",
                          isExpanded ? "bg-orange-50/30 border-orange-100" : "hover:bg-gray-50/50",
                          highDue && !isExpanded && "bg-red-50/20"
                        )}
                      >
                        <td className="px-3 py-3 text-gray-300">
                          {isExpanded
                            ? <ChevronDown size={15} className="text-orange-500" />
                            : <ChevronRight size={15} />
                          }
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-secondary">{row.riderId}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.riderName}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                            "bg-green-50 text-green-600": row.status === "ACTIVE",
                            "bg-gray-100 text-gray-500": row.status === "INACTIVE",
                            "bg-red-50 text-red-600": row.status === "SUSPENDED",
                          })}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-green-600 font-medium">
                          {kd(row.totalCollection)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-blue-600 font-medium">
                          {kd(totalDeposit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "text-sm font-mono font-semibold",
                            row.pendingDues > 50 ? "text-red-600" :
                            row.pendingDues > 0 ? "text-orange-600" : "text-green-600"
                          )}>
                            {kd(row.pendingDues)}
                          </span>
                          {highDue && (
                            <AlertTriangle size={12} className="inline ml-1 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDepositRider(row); }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors whitespace-nowrap"
                          >
                            <Plus size={11} /> Deposit
                          </button>
                        </td>
                      </tr>

                      {isExpanded && <DailyBreakdown key={`${row.id}-breakdown`} row={row} />}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <span className="text-xs text-secondary">Daily breakdown legend:</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-orange-700">
              <span className="w-4 h-4 rounded bg-orange-200 inline-block" />
              Sales with no collection
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
              <span className="w-4 h-4 rounded bg-green-100 inline-block" />
              Collections
            </span>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {depositRider && (
        <DepositModal
          rider={depositRider}
          onClose={() => setDepositRider(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
