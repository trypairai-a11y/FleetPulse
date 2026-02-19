"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import {
  ArrowLeft,
  Bike,
  Car,
  Pencil,
  XCircle,
  UserPlus,
  Wrench,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useVehicle, useUpdateVehicle } from "@/hooks/useVehicles";
import { VEHICLE_STATUS_CONFIG } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";
  const id = params.id as string;

  const { data: vehicle, isLoading } = useVehicle(id);
  const updateVehicle = useUpdateVehicle();

  const [decommissionOpen, setDecommissionOpen] = useState(false);

  const handleDecommission = async () => {
    try {
      await updateVehicle.mutateAsync({
        id,
        status: "decommissioned",
      });
      setDecommissionOpen(false);
    } catch {
      // Error handled by React Query
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/vehicles")}
          className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isAr ? "العودة للمركبات" : "Back to Vehicles"}
        </Button>
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 text-center">
          <p className="text-[14px] font-semibold text-[#0C1825]">
            {isAr ? "المركبة غير موجودة" : "Vehicle not found"}
          </p>
          <p className="text-[12px] text-[#6B7A8D] mt-1">
            {isAr
              ? "المركبة التي تبحث عنها غير موجودة أو تم حذفها"
              : "The vehicle you are looking for does not exist or has been removed"}
          </p>
        </div>
      </div>
    );
  }

  const infoItems = [
    {
      labelEn: "Plate Number",
      labelAr: "رقم اللوحة",
      value: vehicle.plate_number,
      mono: true,
    },
    {
      labelEn: "Type",
      labelAr: "النوع",
      value: vehicle.vehicle_type,
      capitalize: true,
    },
    {
      labelEn: "Ownership",
      labelAr: "الملكية",
      value: vehicle.ownership,
      capitalize: true,
    },
    {
      labelEn: "Year",
      labelAr: "السنة",
      value: vehicle.year ?? "—",
    },
    {
      labelEn: "Color",
      labelAr: "اللون",
      value: vehicle.color ?? "—",
    },
    {
      labelEn: "VIN",
      labelAr: "رقم الهيكل",
      value: vehicle.vin ?? "—",
      mono: true,
    },
    {
      labelEn: "Current Mileage",
      labelAr: "المسافة الحالية",
      value:
        vehicle.current_mileage != null
          ? `${vehicle.current_mileage.toLocaleString(isAr ? "ar-KW" : "en-US")} km`
          : "—",
    },
    {
      labelEn: "Fuel Type",
      labelAr: "نوع الوقود",
      value: vehicle.fuel_type ?? "—",
      capitalize: true,
    },
    {
      labelEn: "Insurance Expiry",
      labelAr: "انتهاء التأمين",
      value: vehicle.insurance_expiry
        ? formatDate(vehicle.insurance_expiry, language)
        : "—",
    },
    {
      labelEn: "Registration Expiry",
      labelAr: "انتهاء التسجيل",
      value: vehicle.registration_expiry
        ? formatDate(vehicle.registration_expiry, language)
        : "—",
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/vehicles")}
        className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isAr ? "العودة للمركبات" : "Back to Vehicles"}
      </Button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                vehicle.vehicle_type === "motorcycle"
                  ? "bg-[#F59E0B0D]"
                  : "bg-[#2563EB0D]"
              }`}
            >
              {vehicle.vehicle_type === "motorcycle" ? (
                <Bike className="w-5 h-5 text-[#F59E0B]" />
              ) : (
                <Car className="w-5 h-5 text-[#2563EB]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
                  {vehicle.make ?? ""} {vehicle.model ?? ""}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-[#2563EB] bg-[#2563EB0D]">
                  {vehicle.plate_number}
                </span>
                <StatusBadge
                  status={vehicle.status}
                  config={VEHICLE_STATUS_CONFIG}
                  language={language}
                />
              </div>
              <p className="text-[12px] text-[#6B7A8D] mt-0.5">
                {vehicle.year ?? ""} &middot; {vehicle.color ?? ""} &middot;{" "}
                <span className="capitalize">{vehicle.ownership}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 px-3 text-[12px] text-[#6B7A8D] border-[#E6E9EE] gap-1.5"
            >
              <Pencil className="w-3 h-3" />
              {isAr ? "تعديل" : "Edit"}
            </Button>
            {vehicle.status !== "decommissioned" && (
              <Button
                variant="outline"
                onClick={() => setDecommissionOpen(true)}
                className="h-8 px-3 text-[12px] text-[#E5484D] border-[#E6E9EE] hover:bg-[#E5484D0D] gap-1.5"
              >
                <XCircle className="w-3 h-3" />
                {isAr ? "إيقاف" : "Decommission"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <h3 className="text-[13px] font-semibold text-[#0C1825] mb-3">
          {isAr ? "معلومات المركبة" : "Vehicle Information"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {infoItems.map((item) => (
            <div key={item.labelEn}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-1">
                {isAr ? item.labelAr : item.labelEn}
              </div>
              <div
                className={`text-[13px] font-medium text-[#0C1825] ${
                  item.mono ? "font-mono" : ""
                } ${item.capitalize ? "capitalize" : ""}`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Driver */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#0C1825]">
            {isAr ? "السائق المعين" : "Assigned Driver"}
          </h3>
          {!vehicle.assigned_driver_id && (
            <Button className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {isAr ? "تعيين سائق" : "Assign Driver"}
            </Button>
          )}
        </div>
        {vehicle.assigned_driver_id ? (
          <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-[#FAFBFC]">
            <div className="w-8 h-8 rounded-full bg-[#2563EB0D] flex items-center justify-center">
              <span className="text-[11px] font-bold text-[#2563EB]">DR</span>
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#0C1825]">
                {vehicle.assigned_driver_id.slice(0, 8)}...
              </div>
              <div className="text-[11px] text-[#6B7A8D]">
                ID: {vehicle.assigned_driver_id}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-[#6B7A8D]">
            {isAr
              ? "لم يتم تعيين سائق لهذه المركبة بعد"
              : "No driver is currently assigned to this vehicle"}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview" className="text-[12px] gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {isAr ? "نظرة عامة" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="inspections" className="text-[12px] gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5" />
            {isAr ? "الفحوصات" : "Inspections"}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-[12px] gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            {isAr ? "الصيانة" : "Maintenance"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
            <h3 className="text-[13px] font-semibold text-[#0C1825] mb-2">
              {isAr ? "ملاحظات" : "Notes"}
            </h3>
            <p className="text-[12px] text-[#6B7A8D]">
              {vehicle.notes || (isAr ? "لا توجد ملاحظات" : "No notes available")}
            </p>
            <div className="mt-4 pt-4 border-t border-[#F0F2F5] grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-1">
                  {isAr ? "تاريخ الإنشاء" : "Created"}
                </div>
                <div className="text-[12px] text-[#374151]">
                  {formatDate(vehicle.created_at, language)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] mb-1">
                  {isAr ? "آخر تحديث" : "Last Updated"}
                </div>
                <div className="text-[12px] text-[#374151]">
                  {formatDate(vehicle.updated_at, language)}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inspections">
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/5 flex items-center justify-center mb-3">
              <ClipboardCheck className="w-5 h-5 text-[#2563EB]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0C1825]">
              {isAr ? "لا توجد فحوصات" : "No Inspections"}
            </p>
            <p className="text-[12px] text-[#6B7A8D] mt-1 text-center max-w-sm">
              {isAr
                ? "ستظهر سجلات فحص المركبة هنا بعد إجرائها من تطبيق السائق"
                : "Vehicle inspection records will appear here once submitted from the driver app"}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/5 flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0C1825]">
              {isAr ? "لا توجد سجلات صيانة" : "No Maintenance Records"}
            </p>
            <p className="text-[12px] text-[#6B7A8D] mt-1 text-center max-w-sm">
              {isAr
                ? "ستظهر سجلات الصيانة والإصلاحات هنا"
                : "Maintenance and repair records will appear here"}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Decommission Confirm Dialog */}
      <ConfirmDialog
        open={decommissionOpen}
        onOpenChange={setDecommissionOpen}
        titleEn="Decommission Vehicle"
        titleAr="إيقاف المركبة"
        descriptionEn={`Are you sure you want to decommission ${vehicle.make ?? ""} ${vehicle.model ?? ""} (${vehicle.plate_number})? This will mark it as out of service.`}
        descriptionAr={`هل أنت متأكد من إيقاف ${vehicle.make ?? ""} ${vehicle.model ?? ""} (${vehicle.plate_number})؟ سيتم تعليمها كخارج الخدمة.`}
        confirmLabelEn="Decommission"
        confirmLabelAr="إيقاف"
        onConfirm={handleDecommission}
        destructive
        loading={updateVehicle.isPending}
      />
    </div>
  );
}
