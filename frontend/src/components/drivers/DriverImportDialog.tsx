"use client";

import { useState, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useImportDrivers } from "@/hooks/useDrivers";

interface DriverImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DriverImportDialog({
  open,
  onOpenChange,
}: DriverImportDialogProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const importDrivers = useImportDrivers();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    importDrivers.reset();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await importDrivers.mutateAsync(selectedFile);
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setSelectedFile(null);
      importDrivers.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    onOpenChange(value);
  };

  const result = importDrivers.data;
  const hasResult = !!result;
  const hasErrors = result && result.errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[16px]">
            {isAr ? "استيراد سائقين من CSV" : "Import Drivers from CSV"}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {isAr
              ? "قم بتحميل ملف CSV يحتوي على بيانات السائقين. الأعمدة المطلوبة: name, phone"
              : "Upload a CSV file with driver data. Required columns: name, phone"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input area */}
          {!hasResult && (
            <div
              className="border-2 border-dashed border-[#E6E9EE] rounded-lg p-6 text-center cursor-pointer hover:border-[#2563EB]/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#2563EB]/5 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5 text-[#2563EB]" />
              </div>
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-[#6B7A8D]" />
                  <span className="text-[13px] font-medium text-[#0C1825]">
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-[#0C1825]">
                    {isAr ? "اضغط لاختيار ملف" : "Click to select a file"}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">
                    {isAr ? "CSV فقط" : "CSV files only"}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Result */}
          {hasResult && (
            <div className="space-y-3">
              {/* Success count */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#12B981]/5">
                <CheckCircle2 className="w-4 h-4 text-[#12B981] shrink-0" />
                <span className="text-[13px] text-[#0C1825]">
                  {isAr
                    ? `تم إنشاء ${result.created} سائق بنجاح`
                    : `${result.created} driver(s) created successfully`}
                </span>
              </div>

              {/* Errors */}
              {hasErrors && (
                <div className="p-3 rounded-lg bg-[#E5484D]/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#E5484D] shrink-0" />
                    <span className="text-[12px] font-medium text-[#E5484D]">
                      {isAr
                        ? `${result.errors.length} خطأ`
                        : `${result.errors.length} error(s)`}
                    </span>
                  </div>
                  <ul className="space-y-1 max-h-[120px] overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-[#6B7A8D] leading-relaxed"
                      >
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E9EE]">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="h-8 px-3 text-[12px]"
            >
              {hasResult
                ? isAr
                  ? "إغلاق"
                  : "Close"
                : isAr
                  ? "إلغاء"
                  : "Cancel"}
            </Button>
            {!hasResult && (
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || importDrivers.isPending}
                className="h-8 px-4 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
              >
                <Upload className="w-3 h-3" />
                {importDrivers.isPending
                  ? isAr
                    ? "جاري الرفع..."
                    : "Uploading..."
                  : isAr
                    ? "رفع ومعالجة"
                    : "Upload & Process"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
