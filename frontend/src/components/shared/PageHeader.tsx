"use client";

import { useUIStore } from "@/stores/uiStore";

interface PageHeaderProps {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ titleEn, titleAr, subtitleEn, subtitleAr, actions }: PageHeaderProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
          {isAr ? titleAr : titleEn}
        </h1>
        {(subtitleEn || subtitleAr) && (
          <p className="text-[12px] text-[#6B7A8D] mt-0.5">
            {isAr ? subtitleAr : subtitleEn}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
