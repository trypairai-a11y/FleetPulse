"use client";

import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/uiStore";

interface FormFieldProps {
  labelEn: string;
  labelAr: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ labelEn, labelAr, error, children }: FormFieldProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-[#374151]">
        {isAr ? labelAr : labelEn}
      </Label>
      {children}
      {error && (
        <p className="text-[11px] text-[#E5484D]">{error}</p>
      )}
    </div>
  );
}
