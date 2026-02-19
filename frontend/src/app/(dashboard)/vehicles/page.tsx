"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { Plus, Bike, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useVehicles, useCreateVehicle } from "@/hooks/useVehicles";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { VEHICLE_STATUS_CONFIG } from "@/lib/constants";
import type { Vehicle, VehicleCreate } from "@/types/vehicle";

const INITIAL_FORM: VehicleCreate = {
  plate_number: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  vehicle_type: "car",
  ownership: "company",
  color: "",
};

export default function VehiclesPage() {
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);
  const { page, perPage, goToPage } = usePagination();

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VehicleCreate>({ ...INITIAL_FORM });

  // Queries
  const { data, isLoading } = useVehicles({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    vehicle_type: typeFilter !== "all" ? typeFilter : undefined,
    ownership: ownershipFilter !== "all" ? ownershipFilter : undefined,
    page,
    per_page: perPage,
  });

  const createVehicle = useCreateVehicle();

  const vehicles = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const handleCreate = async () => {
    if (!form.plate_number) return;
    try {
      await createVehicle.mutateAsync(form);
      setDialogOpen(false);
      setForm({ ...INITIAL_FORM });
    } catch {
      // Error handled by React Query
    }
  };

  const columns = [
    {
      key: "vehicle",
      headerEn: "Vehicle",
      headerAr: "المركبة",
      render: (v: Vehicle) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              v.vehicle_type === "motorcycle"
                ? "bg-[#F59E0B0D]"
                : "bg-[#2563EB0D]"
            }`}
          >
            {v.vehicle_type === "motorcycle" ? (
              <Bike className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <Car className="w-4 h-4 text-[#2563EB]" />
            )}
          </div>
          <div>
            <div className="text-[13px] font-medium text-[#0C1825] group-hover:text-[#2563EB] transition-colors">
              {v.make ?? "—"} {v.model ?? ""}
            </div>
            <div className="text-[11px] text-[#9CA3AF]">
              {v.year ?? "—"} &middot; {v.color ?? "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "plate",
      headerEn: "Plate",
      headerAr: "اللوحة",
      render: (v: Vehicle) => (
        <span className="text-[12px] font-mono text-[#0C1825]">
          {v.plate_number}
        </span>
      ),
    },
    {
      key: "type",
      headerEn: "Type",
      headerAr: "النوع",
      render: (v: Vehicle) => (
        <span className="text-[12px] text-[#374151] capitalize">
          {v.vehicle_type}
        </span>
      ),
    },
    {
      key: "ownership",
      headerEn: "Ownership",
      headerAr: "الملكية",
      render: (v: Vehicle) => (
        <span className="text-[12px] text-[#374151] capitalize">
          {v.ownership}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (v: Vehicle) => (
        <StatusBadge
          status={v.status}
          config={VEHICLE_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "mileage",
      headerEn: "Mileage",
      headerAr: "المسافة",
      render: (v: Vehicle) => (
        <span className="text-[12px] text-[#6B7A8D] tabular-nums">
          {v.current_mileage != null
            ? v.current_mileage.toLocaleString(isAr ? "ar-KW" : "en-US")
            : "—"}{" "}
          {v.current_mileage != null && "km"}
        </span>
      ),
    },
    {
      key: "driver",
      headerEn: "Driver",
      headerAr: "السائق",
      render: (v: Vehicle) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {v.assigned_driver_id
            ? v.assigned_driver_id.slice(0, 8) + "..."
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      <PageHeader
        titleEn="Vehicles"
        titleAr="المركبات"
        subtitleEn={`${total} vehicles in fleet`}
        subtitleAr={`${total} مركبة في الأسطول`}
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAr ? "إضافة مركبة" : "Add Vehicle"}
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholderEn="Search vehicles..."
        searchPlaceholderAr="بحث في المركبات..."
        filters={[
          {
            key: "status",
            placeholderEn: "Status",
            placeholderAr: "الحالة",
            options: Object.entries(VEHICLE_STATUS_CONFIG).map(
              ([value, cfg]) => ({
                value,
                labelEn: cfg.labelEn,
                labelAr: cfg.labelAr,
              })
            ),
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              goToPage(1);
            },
          },
          {
            key: "vehicle_type",
            placeholderEn: "Type",
            placeholderAr: "النوع",
            options: [
              { value: "car", labelEn: "Car", labelAr: "سيارة" },
              {
                value: "motorcycle",
                labelEn: "Motorcycle",
                labelAr: "دراجة نارية",
              },
            ],
            value: typeFilter,
            onChange: (v) => {
              setTypeFilter(v);
              goToPage(1);
            },
          },
          {
            key: "ownership",
            placeholderEn: "Ownership",
            placeholderAr: "الملكية",
            options: [
              { value: "company", labelEn: "Company", labelAr: "شركة" },
              { value: "rented", labelEn: "Rented", labelAr: "مستأجرة" },
            ],
            value: ownershipFilter,
            onChange: (v) => {
              setOwnershipFilter(v);
              goToPage(1);
            },
          },
        ]}
      />

      <DataTable<Vehicle>
        columns={columns}
        data={vehicles}
        loading={isLoading}
        emptyMessage={isAr ? "لا توجد مركبات" : "No vehicles found"}
        onRowClick={(v) => router.push(`/vehicles/${v.id}`)}
        language={language}
        rowKey={(v) => v.id}
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

      {/* Add Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "إضافة مركبة" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "رقم اللوحة" : "Plate Number"} *
                </Label>
                <Input
                  value={form.plate_number}
                  onChange={(e) =>
                    setForm({ ...form, plate_number: e.target.value })
                  }
                  placeholder="KW-1234"
                  className="h-8 text-[12px] border-[#E6E9EE] font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "الشركة المصنعة" : "Make"}
                </Label>
                <Input
                  value={form.make ?? ""}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                  placeholder={isAr ? "هوندا" : "Honda"}
                  className="h-8 text-[12px] border-[#E6E9EE]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "الطراز" : "Model"}
                </Label>
                <Input
                  value={form.model ?? ""}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder={isAr ? "PCX 150" : "PCX 150"}
                  className="h-8 text-[12px] border-[#E6E9EE]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "السنة" : "Year"}
                </Label>
                <Input
                  type="number"
                  value={form.year ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, year: parseInt(e.target.value) || undefined })
                  }
                  placeholder="2024"
                  className="h-8 text-[12px] border-[#E6E9EE]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "النوع" : "Vehicle Type"}
                </Label>
                <Select
                  value={form.vehicle_type ?? "car"}
                  onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
                >
                  <SelectTrigger className="h-8 text-[12px] border-[#E6E9EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">
                      {isAr ? "سيارة" : "Car"}
                    </SelectItem>
                    <SelectItem value="motorcycle">
                      {isAr ? "دراجة نارية" : "Motorcycle"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "الملكية" : "Ownership"}
                </Label>
                <Select
                  value={form.ownership ?? "company"}
                  onValueChange={(v) => setForm({ ...form, ownership: v })}
                >
                  <SelectTrigger className="h-8 text-[12px] border-[#E6E9EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">
                      {isAr ? "شركة" : "Company"}
                    </SelectItem>
                    <SelectItem value="rented">
                      {isAr ? "مستأجرة" : "Rented"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#6B7A8D]">
                {isAr ? "اللون" : "Color"}
              </Label>
              <Input
                value={form.color ?? ""}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder={isAr ? "أبيض" : "White"}
                className="h-8 text-[12px] border-[#E6E9EE]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-8 px-3 text-[12px]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.plate_number || createVehicle.isPending}
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {createVehicle.isPending
                ? isAr
                  ? "جاري الإضافة..."
                  : "Adding..."
                : isAr
                  ? "إضافة مركبة"
                  : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
