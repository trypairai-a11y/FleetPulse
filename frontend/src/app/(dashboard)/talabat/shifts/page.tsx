"use client";
import { useState, useMemo } from "react";
import { useApiGet } from "@/hooks/useApi";
import FilterBar from "@/components/shared/FilterBar";
import SlidePanel from "@/components/shared/SlidePanel";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import {
  CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck, ChevronUp, ChevronDown,
  Phone, UserCheck, UserX, Users, Flag,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { DirectionalIcon } from "@/i18n/directionalIcon";
import { formatTime } from "@/i18n/format";

type SortKey = "driverName" | "phone" | "batchNumber" | "company" | "zone" | "booking" | "weeklyBookings" | "bookedHours" | "actualHours" | "actualStart" | "actualEnd";

type SortDir = "asc" | "desc";

const TALABAT_ZONES = [
  "Ardiya", "Hawally", "Mahboula", "Khairan", "Jahra", "Mutla", "Sabha Al Saleem",
];

function VerifiedBadge({ value, label }: { value: boolean | "mismatch"; label?: string }) {
  const { t } = useI18n();
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
      <CheckCircle2 size={11} /> {label || t("talabat.verifiedLabel")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
      <XCircle size={11} /> {label ? `${label} ${t("talabat.verifFailed")}` : t("talabat.notVerified")}
    </span>
  );
}

export default function TalabatShiftsPage() {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: companiesData } = useApiGet<any>("/api/companies?platform=TALABAT");
  const companies = companiesData?.data || [];

  const params = new URLSearchParams({ platform: "TALABAT", date });
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.batch) params.set("batchNumber", filters.batch);
  if (filters.bookingFilter) params.set("bookingFilter", filters.bookingFilter);
  if (filters.search) params.set("search", filters.search);
  if (filters.company) params.set("companyId", filters.company);

  const { data: bookingData } = useApiGet<any>(`/api/shifts/booking-status?${params}`);
  const { data: summary } = useApiGet<any>("/api/shifts/summary?platform=TALABAT");
  const driverList = bookingData?.drivers || [];

  const bookedCount = bookingData?.bookedCount || 0;
  const notBookedCount = bookingData?.notBookedCount || 0;
  const flaggedCount = bookingData?.flaggedCount || 0;
  const totalDrivers = bookingData?.totalDrivers || 0;
  const bookingRate = totalDrivers > 0 ? Math.round((bookedCount / totalDrivers) * 100) : 0;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedDrivers = useMemo(() => {
    if (!sortKey) return driverList;
    return [...driverList].sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case "driverName": aVal = a.driverName || ""; bVal = b.driverName || ""; break;
        case "phone": aVal = a.phone || ""; bVal = b.phone || ""; break;
        case "batchNumber": aVal = Number(a.batchNumber) || 0; bVal = Number(b.batchNumber) || 0; break;
        case "company": aVal = a.companyName || ""; bVal = b.companyName || ""; break;
        case "zone": aVal = a.zone || ""; bVal = b.zone || ""; break;
        case "booking": aVal = a.hasBooked ? 1 : 0; bVal = b.hasBooked ? 1 : 0; break;
        case "weeklyBookings": aVal = a.weeklyBookings || 0; bVal = b.weeklyBookings || 0; break;
        case "bookedHours": aVal = a.bookedHours || 0; bVal = b.bookedHours || 0; break;
        case "actualHours": aVal = a.actualHours || 0; bVal = b.actualHours || 0; break;
        case "actualStart": aVal = a.actualStart || ""; bVal = b.actualStart || ""; break;
        case "actualEnd": aVal = a.actualEnd || ""; bVal = b.actualEnd || ""; break;
        default: return 0;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [driverList, sortKey, sortDir]);

  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => (
    <th
      className="text-start text-xs font-medium text-secondary px-5 py-3 cursor-pointer select-none hover:text-primary transition-colors"
      onClick={() => toggleSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === colKey ? (
          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronDown size={12} className="opacity-0 group-hover:opacity-30" />
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-talabat" />
        <h1 className="text-xl font-semibold">{t("talabat.shiftsTitle")}</h1>
        <span className="text-sm text-secondary">{t("talabat.wahooIntl")}</span>
        <span className="ms-2 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          {t("talabat.releasedTueRibbon")}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title={t("overview.totalDrivers")} value={totalDrivers} icon={Users} />
        <StatCard
          title={t("talabat.booked")}
          value={`${bookedCount} / ${totalDrivers}`}
          icon={UserCheck}
          trend={`${bookingRate}% ${t("talabat.bookingRate")}`}
        />
        <StatCard
          title={t("talabat.notBooked")}
          value={notBookedCount}
          icon={UserX}
          highlight={notBookedCount > 0}
        />
        <StatCard
          title={t("talabat.flaggedThisWeek")}
          value={flaggedCount}
          icon={Flag}
          highlight={flaggedCount > 0}
        />
        <StatCard
          title={t("talabat.faceFailPreShift")}
          value={summary?.faceFailCount || 0}
          icon={ShieldCheck}
          highlight={(summary?.faceFailCount || 0) > 0}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <FilterBar
          filters={[
            { key: "company", type: "select", label: t("talabat.allCompanies"), options: companies.map((c: any) => ({ value: c.id, label: c.name })) },
            { key: "search", type: "search", label: t("common.search"), placeholder: t("talabatAttendance.searchDriver") },
            {
              key: "zone", type: "select", label: t("talabat.allZones"),
              options: TALABAT_ZONES.map(z => ({ value: z, label: z })),
            },
            {
              key: "batch", type: "select", label: t("talabat.allBatches"),
              options: ["1", "2", "3", "4", "5", "6", "7"].map(b => ({ value: b, label: `${t("talabat.batchShort")} ${b}` })),
            },
            {
              key: "bookingFilter", type: "select", label: t("talabat.allDrivers"), options: [
                { value: "BOOKED", label: t("talabat.booked") },
                { value: "NOT_BOOKED", label: t("talabat.notBooked") },
                { value: "FLAGGED", label: t("talabat.flagged") },
              ],
            },
          ]}
          values={filters}
          onChange={(k, v) => setFilters({ ...filters, [k]: v })}
        />
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <SortHeader label={t("table.driver")} colKey="driverName" />
                <SortHeader label={t("table.phone")} colKey="phone" />
                <SortHeader label={t("platform.batch")} colKey="batchNumber" />
                <SortHeader label={t("talabat.companyHeader")} colKey="company" />
                <SortHeader label={t("table.zone")} colKey="zone" />
                <SortHeader label={t("talabat.bookingCol")} colKey="booking" />
                <SortHeader label={t("talabat.weekCol")} colKey="weeklyBookings" />
                <th className="text-start text-xs font-medium text-secondary px-5 py-3">{t("talabat.flagReason")}</th>
                <SortHeader label={t("talabat.bookedHoursCol")} colKey="bookedHours" />
                <SortHeader label={t("talabat.actualHoursCol")} colKey="actualHours" />
                <SortHeader label={t("talabat.inCol")} colKey="actualStart" />
                <SortHeader label={t("talabat.outCol")} colKey="actualEnd" />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {driverList.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-5 py-12 text-center text-sm text-secondary">
                    {t("talabat.noDriversFoundShifts")}
                  </td>
                </tr>
              ) : (
                sortedDrivers.map((d: any) => {
                  const hoursMatch = !d.bookedHours || !d.actualHours || Math.abs(d.bookedHours - d.actualHours) < 0.5;
                  return (
                    <tr
                      key={d.driverId}
                      onClick={() => setSelected(d)}
                      className={cn(
                        "border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors",
                        !d.hasBooked && "bg-red-50/30"
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cleanDriverName(d.driverName)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={`tel:${d.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono"
                        >
                          <Phone size={11} />
                          {d.phone}
                        </a>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                          {d.batchNumber || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">{d.companyName || "-"}</td>
                      <td className="px-5 py-3 text-sm text-secondary">{d.zone || "-"}</td>
                      <td className="px-5 py-3">
                        {d.hasBooked ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 whitespace-nowrap">
                            {t("talabat.booked")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 whitespace-nowrap">
                            {t("talabat.notBooked")}
                          </span>
                        )}
                      </td>
                      {/* Weekly bookings badge */}
                      <td className="px-5 py-3">
                        {d.weeklyBookings !== undefined && d.weeklyBookings !== null ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold font-mono",
                            d.weeklyFlag
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-green-700"
                          )}>
                            {d.weeklyBookings}/{d.weeklyExpected ?? 7}
                            {d.weeklyFlag && <AlertTriangle size={10} className="shrink-0" />}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* Flag reason */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {d.weeklyFlagReason ? (
                          <span className="text-xs text-red-600 font-medium">{d.weeklyFlagReason}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-secondary whitespace-nowrap">
                        {d.scheduledStart && d.scheduledEnd
                          ? <div className="flex flex-col leading-tight gap-1">
                              <span>{formatTime(d.scheduledStart, locale)}</span>
                              <span className="text-gray-300">↓</span>
                              <span>{formatTime(d.scheduledEnd, locale)}</span>
                            </div>
                          : d.bookedHours ? `${d.bookedHours.toFixed(1)}h` : "–"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "text-sm font-mono",
                          !hoursMatch ? "text-amber-600 font-medium" : "text-secondary"
                        )}>
                          {d.actualHours ? `${d.actualHours.toFixed(1)}h` : "-"}
                          {!hoursMatch && <AlertTriangle size={11} className="inline ms-1" />}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-secondary whitespace-nowrap">
                        {d.actualStart ? formatTime(d.actualStart, locale) : "–"}
                      </td>
                      <td className="px-5 py-3 text-sm font-mono text-secondary whitespace-nowrap">
                        {d.actualEnd ? formatTime(d.actualEnd, locale) : "–"}
                      </td>
                      <td className="px-5 py-3">
                        <DirectionalIcon kind="chevron-forward" size={15} className="text-gray-300" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.driverName || t("talabat.driverDetail")}
        subtitle={`Talabat - ${selected?.batchNumber || ""} · ${selected?.zone || ""}`}
      >
        {selected && (
          <div className="space-y-5">
            {/* Booking Status */}
            <div className={cn(
              "p-4 rounded-xl border",
              selected.hasBooked ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
            )}>
              <div className="flex items-center gap-2">
                {selected.hasBooked ? (
                  <>
                    <CheckCircle2 size={18} className="text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">{t("talabat.shiftBooked")}</p>
                      <p className="text-xs text-green-600 font-mono mt-0.5">
                        {selected.scheduledStart ? formatTime(selected.scheduledStart, locale) : ""}
                        {selected.scheduledEnd ? ` – ${formatTime(selected.scheduledEnd, locale)}` : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-red-600" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">{t("talabat.noShiftBookedDetail")}</p>
                      <p className="text-xs text-red-600 mt-0.5">{t("talabat.driverNotBookedHint")}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Weekly Booking Status */}
            <div className={cn(
              "p-4 rounded-xl border",
              selected.weeklyFlag ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
            )}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">{t("talabat.thisWeek")}</p>
                <span className={cn(
                  "text-lg font-bold font-mono",
                  selected.weeklyFlag ? "text-red-600" : "text-green-700"
                )}>
                  {selected.weeklyBookings ?? "—"}/{selected.weeklyExpected ?? 7}
                </span>
              </div>
              {selected.weeklyFlag && selected.weeklyFlagReason ? (
                <div className="flex items-start gap-1.5 mt-1">
                  <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{selected.weeklyFlagReason}</p>
                </div>
              ) : (
                <p className="text-xs text-green-600">{t("talabat.allDaysBooked")}</p>
              )}
              {selected.weeklyApprovedOffs > 0 && (
                <p className="text-xs text-secondary mt-1">{selected.weeklyApprovedOffs} {t("talabat.approvedDayOff")}</p>
              )}
            </div>

            {/* Contact Info */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-2">{t("talabat.contact")}</p>
              <a
                href={`tel:${selected.phone}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Phone size={14} />
                {t("talabat.callPrefix")} {selected.phone}
              </a>
            </div>

            {/* Hours Comparison (only if booked) */}
            {selected.hasBooked && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{t("talabat.bookedHoursLabel")}</p>
                  <p className="text-xl font-semibold mt-0.5 font-mono">{selected.bookedHours ? `${selected.bookedHours.toFixed(1)}h` : "-"}</p>
                </div>
                <div className={cn("rounded-xl p-3", Math.abs((selected.bookedHours || 0) - (selected.actualHours || 0)) > 0.5 ? "bg-amber-50" : "bg-gray-50")}>
                  <p className="text-[10px] text-secondary uppercase font-medium">{t("talabat.actualHoursLabel")}</p>
                  <p className="text-xl font-semibold mt-0.5 font-mono">{selected.actualHours ? `${selected.actualHours.toFixed(1)}h` : "-"}</p>
                </div>
              </div>
            )}

            {/* Face Verification (only if booked) */}
            {selected.hasBooked && selected.faceVerified !== null && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide">{t("talabat.preShiftVerification")}</h3>
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck size={15} className="text-secondary" /> {t("talabat.faceVerification")}
                  </div>
                  <VerifiedBadge value={selected.faceVerified} />
                </div>
              </div>
            )}

            {/* Driver Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                [t("platform.batch"), selected.batchNumber],
                [t("table.zone"), selected.zone],
                [t("talabat.vehicleTypeCol"), selected.vehicleType],
                [t("table.status"), selected.status === "NOT_BOOKED" ? t("talabat.notBooked") : selected.status],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-secondary uppercase font-medium">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val || "-"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
