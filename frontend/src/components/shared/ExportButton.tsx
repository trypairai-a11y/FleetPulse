"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import api from "@/lib/api";

interface ExportButtonProps {
  url: string;
  filename: string;
}

export function ExportButton({ url, filename }: ExportButtonProps) {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const handleExport = async () => {
    const response = await api.get(url, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      className="h-8 px-3 text-[12px] text-[#6B7A8D] border-[#E6E9EE] gap-1.5"
    >
      <Download className="w-3 h-3" />
      {isAr ? "تصدير" : "Export"}
    </Button>
  );
}
