"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useApiQuery } from "@/hooks/useApi";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";

type CodRow = {
  id: string;
  date: string;
  driver: { id: string; name: string; platform: string; zone: string | null };
  expected: number;
  collected: number;
  pendingDues: number;
  variance: number;
  status: "PENDING" | "PARTIALLY_PAID" | "SETTLED";
};

type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function TalabatCodLedger() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"" | "PENDING" | "SETTLED" | "PARTIALLY_PAID">("");
  const [zone, setZone] = useState("");

  const query = new URLSearchParams({
    platform: "TALABAT",
    from,
    to,
    limit: "50",
  });
  if (status) query.set("status", status);
  if (zone) query.set("zone", zone);

  const { data, refetch, isLoading } = useApiQuery<Paginated<CodRow>>(
    ["cash-cod", query.toString()],
    `/api/cash/cod?${query}`
  );

  const rows = data?.data ?? [];

  const settle = async (row: CodRow) => {
    const input = window.prompt(
      `Settle COD for ${row.driver.name} on ${new Date(row.date).toLocaleDateString()}.\nExpected ${row.expected.toFixed(3)} KD. Enter collected amount:`,
      row.collected.toFixed(3)
    );
    if (!input) return;
    const amount = Number(input);
    if (Number.isNaN(amount)) return;
    const note = window.prompt("Optional note") || undefined;
    try {
      await api.post(`/api/cash/cod/${row.id}/settle`, { amount, note });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Settle failed");
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Driver", "Zone", "Expected", "Collected", "Variance", "Status"];
    const body = rows.map((r) => [
      new Date(r.date).toISOString().slice(0, 10),
      r.driver.name,
      r.driver.zone ?? "",
      r.expected.toFixed(3),
      r.collected.toFixed(3),
      r.variance.toFixed(3),
      r.status,
    ]);
    const csv = [header, ...body].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talabat-cod-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1 text-xs text-gray-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ml-2 rounded-lg border border-gray-200 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ml-2 rounded-lg border border-gray-200 px-2 py-1"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-lg border border-gray-200 px-2 py-1"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partial</option>
            <option value="SETTLED">Settled</option>
          </select>
          <input
            placeholder="Zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 w-28"
          />
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <Download size={14} /> CSV
        </button>
      </header>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Driver</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2 text-right">Expected</th>
              <th className="px-3 py-2 text-right">Collected</th>
              <th className="px-3 py-2 text-right">Variance</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-xs text-gray-400">
                  No COD records for this filter.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const over = Math.abs(r.variance) > 1;
              return (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() =>
                        router.push(
                          `/talabat/drivers/${r.driver.id}?tab=cash-violations`
                        )
                      }
                    >
                      {r.driver.name}
                    </button>
                  </td>
                  <td className="px-3 py-2">{r.driver.zone ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.expected.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.collected.toFixed(3)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${over ? "font-semibold text-red-600" : "text-gray-700"}`}
                  >
                    {over && (
                      <AlertTriangle className="mr-1 inline" size={12} />
                    )}
                    {r.variance.toFixed(3)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        r.status === "SETTLED"
                          ? "bg-green-50 text-green-700"
                          : r.status === "PARTIALLY_PAID"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.status !== "SETTLED" && (
                      <button
                        onClick={() => settle(r)}
                        className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                      >
                        <CheckCircle2 size={12} /> Settle
                      </button>
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
