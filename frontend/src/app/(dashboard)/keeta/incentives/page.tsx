"use client";
import Link from "next/link";
import { useApiGet } from "@/hooks/useApi";
import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/i18n/format";

type Round = {
  id: string; period: string; vehicleType: string; issuedAt: string;
  initialTarget: number; adjustedTarget: number | null; status: string; operator: string;
  partner: { name: string } | null;
};

export default function IncentivesPage() {
  const { t, locale } = useI18n();
  const { data, loading } = useApiGet<{ data: Round[] }>("/api/incentives/rounds");
  const rounds = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("keetaPage.incentivesTitle")}</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 text-start">{t("keetaPage.period")}</th>
              <th className="px-4 py-3 text-start">{t("keetaPage.partner")}</th>
              <th className="px-4 py-3 text-start">{t("companies.vehicle")}</th>
              <th className="px-4 py-3 text-end">{t("keetaPage.initialTarget")}</th>
              <th className="px-4 py-3 text-end">{t("keetaPage.adjustedTarget")}</th>
              <th className="px-4 py-3 text-start">{t("table.status")}</th>
              <th className="px-4 py-3 text-start">{t("keetaPage.operator")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-secondary">{t("common.loading")}</td></tr>}
            {rounds.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/keeta/incentives/${r.id}`} className="hover:underline">{r.period}</Link>
                </td>
                <td className="px-4 py-2">{r.partner?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.vehicleType}</td>
                <td className="px-4 py-2 text-end">{formatNumber(r.initialTarget, locale)}</td>
                <td className="px-4 py-2 text-end">{r.adjustedTarget != null ? formatNumber(r.adjustedTarget, locale) : "—"}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {r.status === "ACTIVE" ? t("status.active") : r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-secondary">{r.operator}</td>
              </tr>
            ))}
            {rounds.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-6 text-center text-secondary">{t("keetaPage.noRoundsYet")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
