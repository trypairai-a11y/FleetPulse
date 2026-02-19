import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";

interface EmptyStateProps {
  icon: React.ElementType;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  actionLabelEn?: string;
  actionLabelAr?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  actionLabelEn,
  actionLabelAr,
  onAction,
}: EmptyStateProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  return (
    <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-xl bg-[#2563EB]/5 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[#2563EB]" />
      </div>
      <p className="text-[14px] font-semibold text-[#0C1825]">
        {isAr ? titleAr : titleEn}
      </p>
      {(descriptionEn || descriptionAr) && (
        <p className="text-[12px] text-[#6B7A8D] mt-1 text-center max-w-sm">
          {isAr ? descriptionAr : descriptionEn}
        </p>
      )}
      {actionLabelEn && onAction && (
        <Button
          onClick={onAction}
          className="mt-4 h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
        >
          {isAr ? actionLabelAr : actionLabelEn}
        </Button>
      )}
    </div>
  );
}
