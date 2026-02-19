"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUIStore } from "@/stores/uiStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/FormField";
import { PLATFORMS } from "@/lib/constants";
import {
  driverCreateSchema,
  type DriverCreateForm,
} from "@/lib/validations/driver";
import type { DriverCreate } from "@/types/driver";

interface DriverFormProps {
  onSubmit: (values: DriverCreate) => void | Promise<void>;
  loading?: boolean;
  onCancel?: () => void;
  defaultValues?: Partial<DriverCreateForm>;
}

export function DriverForm({
  onSubmit,
  loading = false,
  onCancel,
  defaultValues,
}: DriverFormProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DriverCreateForm>({
    resolver: zodResolver(driverCreateSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      phone: "",
      email: "",
      employee_id: "",
      platform: "",
      nationality: "",
      hire_date: "",
      license_number: "",
      license_expiry: "",
      license_group: "",
      notes: "",
      ...defaultValues,
    },
  });

  const platformValue = watch("platform");

  const handleFormSubmit = (data: DriverCreateForm) => {
    // Clean empty strings to undefined for optional fields
    const cleaned: DriverCreate = {
      name: data.name,
      phone: data.phone,
      ...(data.name_ar ? { name_ar: data.name_ar } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.employee_id ? { employee_id: data.employee_id } : {}),
      ...(data.platform ? { platform: data.platform } : {}),
      ...(data.nationality ? { nationality: data.nationality } : {}),
      ...(data.hire_date ? { hire_date: data.hire_date } : {}),
      ...(data.license_number ? { license_number: data.license_number } : {}),
      ...(data.license_expiry ? { license_expiry: data.license_expiry } : {}),
      ...(data.license_group ? { license_group: data.license_group } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    };
    onSubmit(cleaned);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-4 max-h-[60vh] overflow-y-auto px-0.5"
    >
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          labelEn="Name (English)"
          labelAr="الاسم (إنجليزي)"
          error={errors.name?.message}
        >
          <Input
            {...register("name")}
            placeholder={isAr ? "أدخل الاسم" : "Enter name"}
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </FormField>
        <FormField
          labelEn="Name (Arabic)"
          labelAr="الاسم (عربي)"
          error={errors.name_ar?.message}
        >
          <Input
            {...register("name_ar")}
            placeholder={isAr ? "أدخل الاسم بالعربي" : "Enter Arabic name"}
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
            dir="rtl"
          />
        </FormField>
      </div>

      {/* Phone & Email */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          labelEn="Phone"
          labelAr="الهاتف"
          error={errors.phone?.message}
        >
          <Input
            {...register("phone")}
            placeholder="+965 XXXX XXXX"
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
            dir="ltr"
          />
        </FormField>
        <FormField
          labelEn="Email"
          labelAr="البريد الإلكتروني"
          error={errors.email?.message}
        >
          <Input
            {...register("email")}
            type="email"
            placeholder="driver@example.com"
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
            dir="ltr"
          />
        </FormField>
      </div>

      {/* Employee ID & Platform */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          labelEn="Employee ID"
          labelAr="الرقم الوظيفي"
          error={errors.employee_id?.message}
        >
          <Input
            {...register("employee_id")}
            placeholder={isAr ? "مثال: DRV-001" : "e.g. DRV-001"}
            className="h-8 text-[12px] bg-white border-[#E6E9EE] font-mono"
          />
        </FormField>
        <FormField
          labelEn="Platform"
          labelAr="المنصة"
          error={errors.platform?.message}
        >
          <Select
            value={platformValue || ""}
            onValueChange={(val) =>
              setValue("platform", val === "none" ? "" : val, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="h-8 text-[12px] bg-white border-[#E6E9EE]">
              <SelectValue
                placeholder={isAr ? "اختر المنصة" : "Select platform"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {isAr ? "بدون" : "None"}
              </SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Nationality & Hire Date */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          labelEn="Nationality"
          labelAr="الجنسية"
          error={errors.nationality?.message}
        >
          <Input
            {...register("nationality")}
            placeholder={isAr ? "مثال: كويتي" : "e.g. Kuwaiti"}
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </FormField>
        <FormField
          labelEn="Hire Date"
          labelAr="تاريخ التوظيف"
          error={errors.hire_date?.message}
        >
          <Input
            {...register("hire_date")}
            type="date"
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </FormField>
      </div>

      {/* License fields */}
      <div className="grid grid-cols-3 gap-3">
        <FormField
          labelEn="License Number"
          labelAr="رقم الرخصة"
          error={errors.license_number?.message}
        >
          <Input
            {...register("license_number")}
            placeholder={isAr ? "رقم الرخصة" : "License #"}
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </FormField>
        <FormField
          labelEn="License Expiry"
          labelAr="انتهاء الرخصة"
          error={errors.license_expiry?.message}
        >
          <Input
            {...register("license_expiry")}
            type="date"
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </FormField>
        <FormField
          labelEn="License Group"
          labelAr="مجموعة الرخصة"
          error={errors.license_group?.message}
        >
          <Input
            {...register("license_group")}
            placeholder={isAr ? "مثال: A" : "e.g. A"}
            className="h-8 text-[12px] bg-white border-[#E6E9EE]"
          />
        </FormField>
      </div>

      {/* Notes */}
      <FormField
        labelEn="Notes"
        labelAr="ملاحظات"
        error={errors.notes?.message}
      >
        <Textarea
          {...register("notes")}
          placeholder={isAr ? "ملاحظات اختيارية..." : "Optional notes..."}
          className="text-[12px] bg-white border-[#E6E9EE] min-h-[60px]"
          rows={2}
        />
      </FormField>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E9EE]">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-8 px-3 text-[12px]"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="h-8 px-4 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
        >
          {loading
            ? isAr
              ? "جاري الحفظ..."
              : "Saving..."
            : isAr
              ? "حفظ السائق"
              : "Save Driver"}
        </Button>
      </div>
    </form>
  );
}
