"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  confirmLabelEn?: string;
  confirmLabelAr?: string;
  onConfirm: () => void;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  confirmLabelEn = "Confirm",
  confirmLabelAr = "تأكيد",
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[16px]">{isAr ? titleAr : titleEn}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {isAr ? descriptionAr : descriptionEn}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-[12px]"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
            className="h-8 px-3 text-[12px]"
          >
            {loading ? (isAr ? "جاري..." : "Loading...") : (isAr ? confirmLabelAr : confirmLabelEn)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
