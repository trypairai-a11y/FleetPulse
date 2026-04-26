"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import api from "@/lib/api";
import DataTable from "@/components/shared/DataTable";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import { Building2, Users, ArrowRightLeft, Check, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const PLATFORMS = [
  { value: "TALABAT", label: "Talabat", color: "bg-talabat", text: "text-talabat" },
  { value: "KEETA", label: "Keeta", color: "bg-keeta", text: "text-keeta" },
  { value: "DELIVEROO", label: "Deliveroo", color: "bg-deliveroo", text: "text-deliveroo" },
  { value: "AMERICANA", label: "Americana", color: "bg-americana", text: "text-americana" },
];

function PlatformBadge({ platform }: { platform: string }) {
  const p = PLATFORMS.find((pl) => pl.value === platform);
  if (!p) return <span className="text-xs text-secondary">{platform}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium", `${p.color}/10 ${p.text}`)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", p.color)} />
      {p.label}
    </span>
  );
}

export default function CompaniesPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [editingDriver, setEditingDriver] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const companyParams = new URLSearchParams({ limit: "200" });
  if (filters.platform) companyParams.set("platform", filters.platform);
  const { data: companiesData, refetch: refetchCompanies } = useApiGet<any>(`/api/companies?${companyParams}`);
  const companies = companiesData?.data || [];

  const driverParams = new URLSearchParams({ limit: "200" });
  if (selectedCompany) driverParams.set("companyId", selectedCompany.id);
  if (filters.search) driverParams.set("search", filters.search);
  if (filters.driverStatus) driverParams.set("status", filters.driverStatus);
  const { data: driversData, refetch: refetchDrivers } = useApiGet<any>(
    selectedCompany ? `/api/drivers?${driverParams}` : null
  );
  const drivers = driversData?.data || [];

  const totalDrivers = companies.reduce((sum: number, c: any) => sum + (c._count?.drivers || 0), 0);
  const activeCompanies = companies.filter((c: any) => c.isActive).length;

  const statusLabel = (status: string): string => {
    switch (status) {
      case "ACTIVE": return t("status.active");
      case "INACTIVE": return t("status.inactive");
      case "SUSPENDED": return t("status.suspended");
      case "TERMINATED":
      case "TERMINATION": return t("status.terminated");
      case "LEAVE": return t("attendancePage.leave");
      default: return status;
    }
  };

  async function handlePlatformChange(driverId: string, platform: string) {
    setSaving(true);
    try {
      await api.put(`/api/drivers/${driverId}`, { platform });
      setEditingDriver(null);
      setNewPlatform("");
      refetchDrivers();
      refetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.error || t("companies.failedToUpdatePlatform"));
    } finally {
      setSaving(false);
    }
  }

  const companyColumns = [
    {
      key: "name",
      label: t("companies.companyName"),
      render: (v: string) => (
        <span className="font-medium text-sm">{v}</span>
      ),
    },
    {
      key: "platform",
      label: t("table.platform"),
      render: (v: string) => <PlatformBadge platform={v} />,
    },
    {
      key: "_count",
      label: t("companies.drivers"),
      render: (v: any) => (
        <span className="font-medium text-sm tabular-nums">{v?.drivers || 0}</span>
      ),
    },
    {
      key: "licenseCount",
      label: t("companies.licenses"),
      render: (v: number) => (
        <span className="text-sm tabular-nums">{v || 0}</span>
      ),
    },
    {
      key: "isActive",
      label: t("table.status"),
      render: (v: boolean) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", v ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500")}>
          {v ? t("status.active") : t("status.inactive")}
        </span>
      ),
    },
  ];

  const driverColumns = [
    {
      key: "name",
      label: t("companies.driverName"),
      render: (v: string, r: any) => {
        const raw = r.talabatDisplayName || r.name || "";
        return <span className="font-medium text-sm">{cleanDriverName(raw)}</span>;
      },
    },
    {
      key: "platformDriverId",
      label: t("companies.platformId"),
      render: (v: string) => (
        <span className="font-mono text-sm text-secondary">{v || "-"}</span>
      ),
    },
    {
      key: "platform",
      label: t("companies.currentPlatform"),
      render: (v: string, r: any) => {
        if (editingDriver === r.id) {
          return (
            <div className="flex items-center gap-2">
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="appearance-none ps-2 pe-6 py-1 rounded-lg border border-primary/30 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={(e) => { e.stopPropagation(); handlePlatformChange(r.id, newPlatform); }}
                disabled={saving || newPlatform === v}
                className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-40 transition-colors"
                aria-label={t("actions.confirm")}
              >
                <Check size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingDriver(null); setNewPlatform(""); }}
                className="p-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                aria-label={t("common.cancel")}
              >
                <X size={14} />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <PlatformBadge platform={v} />
            <button
              onClick={(e) => { e.stopPropagation(); setEditingDriver(r.id); setNewPlatform(v); }}
              className="p-1 rounded-md text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
              title={t("companies.changePlatform")}
              aria-label={t("companies.changePlatform")}
            >
              <ArrowRightLeft size={13} />
            </button>
          </div>
        );
      },
    },
    {
      key: "vehicleType",
      label: t("companies.vehicle"),
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-blue-50 text-blue-600": v === "MOTORCYCLE",
          "bg-purple-50 text-purple-600": v === "CAR",
        })}>
          {v === "MOTORCYCLE" ? t("companies.bike") : v === "CAR" ? t("companies.carVehicle") : v || "-"}
        </span>
      ),
    },
    {
      key: "phone",
      label: t("table.phone"),
      render: (v: string) => (
        <span className="font-mono text-sm text-secondary">{v || "-"}</span>
      ),
    },
    {
      key: "status",
      label: t("table.status"),
      render: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
          "bg-green-50 text-green-600": v === "ACTIVE",
          "bg-gray-100 text-gray-500": v === "INACTIVE",
          "bg-red-50 text-red-600": v === "SUSPENDED" || v === "TERMINATED" || v === "TERMINATION",
          "bg-orange-50 text-orange-600": v === "LEAVE",
        })}>
          {statusLabel(v)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 size={22} className="text-primary" />
        <h1 className="text-xl font-semibold">{t("nav.companies")}</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title={t("companies.totalCompanies")} value={companies.length} icon={Building2} />
        <StatCard title={t("companies.activeCompanies")} value={activeCompanies} icon={Building2} />
        <StatCard title={t("overview.totalDrivers")} value={totalDrivers} icon={Users} />
      </div>

      {/* Company Filter */}
      <FilterBar
        filters={[
          {
            key: "platform", type: "select", label: t("kpi.allPlatforms"),
            options: PLATFORMS.map((p) => ({ value: p.value, label: p.label })),
          },
        ]}
        values={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
      />

      {/* Companies Table */}
      <div>
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">{t("companies.allCompanies")}</h2>
        <DataTable
          columns={companyColumns}
          data={companies}
          onRowClick={(row) => setSelectedCompany(selectedCompany?.id === row.id ? null : row)}
          emptyMessage={t("companies.noCompaniesFound")}
        />
      </div>

      {/* Drivers for Selected Company */}
      {selectedCompany && (
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{selectedCompany.name}</h2>
              <PlatformBadge platform={selectedCompany.platform} />
              <span className="text-sm text-secondary">
                {drivers.length} {drivers.length === 1 ? t("companies.driverSingular") : t("companies.driverPlural")}
              </span>
            </div>
            <button
              onClick={() => setSelectedCompany(null)}
              className="text-sm text-secondary hover:text-foreground transition-colors"
            >
              {t("common.close")}
            </button>
          </div>

          {/* Driver filters */}
          <div className="mb-4">
            <FilterBar
              filters={[
                { key: "search", type: "search", label: t("common.search"), placeholder: t("companies.searchDriverIdPlaceholder") },
                {
                  key: "driverStatus", type: "multi-select", label: t("companies.allStatuses"),
                  options: [
                    { value: "ACTIVE", label: t("status.active") },
                    { value: "SUSPENDED", label: t("status.suspended") },
                    { value: "LEAVE", label: t("attendancePage.leave") },
                    { value: "TERMINATION", label: t("companies.pendingTermination") },
                  ],
                },
              ]}
              values={filters}
              onChange={(k, v) => setFilters({ ...filters, [k]: v })}
            />
          </div>

          <DataTable
            columns={driverColumns}
            data={drivers}
            emptyMessage={t("companies.noDriversInCompany")}
          />
        </div>
      )}
    </div>
  );
}
