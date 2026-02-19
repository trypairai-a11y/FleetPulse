"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { Plus, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PlatformBadge } from "@/components/shared/PlatformBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDrivers, useCreateDriver } from "@/hooks/useDrivers";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import {
  DRIVER_STATUSES,
  DRIVER_STATUS_CONFIG,
  PLATFORMS,
  PLATFORM_COLORS,
} from "@/lib/constants";
import { DriverForm } from "@/components/drivers/DriverForm";
import { DriverImportDialog } from "@/components/drivers/DriverImportDialog";
import type { Driver, DriverCreate } from "@/types/driver";

export default function DriversPage() {
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(search, 300);

  // Pagination
  const { page, perPage, goToPage, resetPage } = usePagination({
    initialPage: 1,
    initialPerPage: 20,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, platformFilter, resetPage]);

  // Fetch drivers
  const { data, isLoading } = useDrivers({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
    page,
    per_page: perPage,
  });

  // Create driver mutation
  const createDriver = useCreateDriver();

  const drivers = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const handleCreateDriver = async (values: DriverCreate) => {
    await createDriver.mutateAsync(values);
    setAddDialogOpen(false);
  };

  // Filter options for FilterBar
  const statusOptions = DRIVER_STATUSES.map((s) => ({
    value: s,
    labelEn: DRIVER_STATUS_CONFIG[s]?.labelEn ?? s,
    labelAr: DRIVER_STATUS_CONFIG[s]?.labelAr ?? s,
  }));

  const platformOptions = PLATFORMS.map((p) => ({
    value: p,
    labelEn: p.charAt(0).toUpperCase() + p.slice(1),
    labelAr: p.charAt(0).toUpperCase() + p.slice(1),
  }));

  // Table columns
  const columns = [
    {
      key: "driver",
      headerEn: "Driver",
      headerAr: "السائق",
      render: (d: Driver) => {
        const platformColor =
          PLATFORM_COLORS[d.platform ?? ""]?.color ?? "#6B7A8D";
        const initials = d.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2);
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: platformColor }}
            >
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#0C1825] group-hover:text-[#2563EB] transition-colors">
                {d.name}
              </div>
              {d.name_ar && (
                <div className="text-[11px] text-[#9CA3AF]">{d.name_ar}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "employee_id",
      headerEn: "ID",
      headerAr: "الرقم",
      render: (d: Driver) => (
        <span className="text-[12px] text-[#6B7A8D] font-mono">
          {d.employee_id || "\u2014"}
        </span>
      ),
    },
    {
      key: "platform",
      headerEn: "Platform",
      headerAr: "المنصة",
      render: (d: Driver) => <PlatformBadge platform={d.platform} />,
    },
    {
      key: "phone",
      headerEn: "Phone",
      headerAr: "الهاتف",
      render: (d: Driver) => (
        <span className="text-[12px] text-[#6B7A8D] tabular-nums" dir="ltr">
          {d.phone}
        </span>
      ),
    },
    {
      key: "license_group",
      headerEn: "Group",
      headerAr: "المجموعة",
      render: (d: Driver) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {d.license_group || "\u2014"}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (d: Driver) => (
        <StatusBadge
          status={d.status}
          config={DRIVER_STATUS_CONFIG}
          language={language}
        />
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <PageHeader
        titleEn="Drivers"
        titleAr="السائقين"
        subtitleEn={`${total} registered`}
        subtitleAr={`${total} سائق مسجل`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="h-8 px-3 text-[12px] text-[#6B7A8D] border-[#E6E9EE] gap-1.5"
            >
              <Upload className="w-3 h-3" />
              {isAr ? "استيراد CSV" : "Import CSV"}
            </Button>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "إضافة سائق" : "Add Driver"}
            </Button>
          </>
        }
      />

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholderEn="Search drivers..."
        searchPlaceholderAr="بحث في السائقين..."
        filters={[
          {
            key: "status",
            placeholderEn: "Status",
            placeholderAr: "الحالة",
            options: statusOptions,
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: "platform",
            placeholderEn: "Platform",
            placeholderAr: "المنصة",
            options: platformOptions,
            value: platformFilter,
            onChange: setPlatformFilter,
          },
        ]}
      />

      {/* Table or Empty State */}
      {!isLoading && drivers.length === 0 && !debouncedSearch && statusFilter === "all" && platformFilter === "all" ? (
        <EmptyState
          icon={Users}
          titleEn="No drivers yet"
          titleAr="لا يوجد سائقين بعد"
          descriptionEn="Add your first driver to get started managing your fleet."
          descriptionAr="أضف أول سائق لبدء إدارة أسطولك."
          actionLabelEn="Add Driver"
          actionLabelAr="إضافة سائق"
          onAction={() => setAddDialogOpen(true)}
        />
      ) : (
        <>
          <DataTable<Driver>
            columns={columns}
            data={drivers}
            loading={isLoading}
            emptyMessage={isAr ? "لا توجد نتائج" : "No drivers found"}
            language={language}
            rowKey={(d) => d.id}
            onRowClick={(d) => router.push(`/drivers/${d.id}`)}
          />
          {total > 0 && (
            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPageChange={goToPage}
            />
          )}
        </>
      )}

      {/* Add Driver Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "إضافة سائق جديد" : "Add New Driver"}
            </DialogTitle>
          </DialogHeader>
          <DriverForm
            onSubmit={handleCreateDriver}
            loading={createDriver.isPending}
            onCancel={() => setAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <DriverImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}
