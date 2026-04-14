"use client";
import React, { useState, useRef, useMemo } from "react";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { PageSkeleton } from "@/components/shared/Skeleton";
import OrdersListTab from "@/components/platform/talabat/OrdersListTab";
import OrderPerformanceTab from "@/components/platform/talabat/OrderPerformanceTab";
import { UploadCloud, Sparkles, Download } from "lucide-react";
import api from "@/lib/api";

type PageTab = "orders" | "performance";

export default function TalabatOrdersPage() {
  const [pageTab, setPageTab] = useState<PageTab>("orders");
  const [filters, setFilters] = useState<Record<string, string>>({
    dateFrom: new Date().toISOString().split("T")[0],
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Company name from settings
  const { data: companiesData, loading } = useApiGet<any>("/api/companies?platform=TALABAT");
  const companyName = companiesData?.data?.[0]?.name || companiesData?.[0]?.name || "Wahoo International";
  const companyOptions = useMemo(() => {
    const list = companiesData?.data || companiesData || [];
    return (Array.isArray(list) ? list : []).map((c: any) => ({ value: c.id, label: c.name }));
  }, [companiesData]);

  async function handleScreenshotUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("screenshot", file);
      form.append("platform", "TALABAT");
      if (filters.dateFrom) form.append("date", filters.dateFrom);
      await api.post("/api/orders/ocr-import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  function handleExportCsv() {
    const params = new URLSearchParams({ platform: "TALABAT" });
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.zone) params.set("zone", filters.zone);
    if (filters.search) params.set("search", filters.search);
    else if (filters.driverId) params.set("search", filters.driverId);
    if (filters.companyId) params.set("companyId", filters.companyId);
    window.open(`${api.defaults.baseURL || ""}/api/orders/export-csv?${params}`, "_blank");
  }

  if (loading && !companiesData) {
    return (
      <div className="space-y-6 w-full">
        <PageSkeleton statCards={3} tableRows={10} tableCols={9} />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-talabat" />
          <h1 className="text-xl font-semibold">Talabat - Orders</h1>
          <span className="text-sm text-secondary">{companyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleScreenshotUpload(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={15} className="text-secondary" />
            Export CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
            ) : (
              <UploadCloud size={15} className="text-secondary" />
            )}
            Upload Screenshot
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white">
              <Sparkles size={9} /> AI OCR
            </span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["orders", "performance"] as PageTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setPageTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              pageTab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}
          >
            {t === "orders" ? "Orders List" : "Performance"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {pageTab === "orders" && (
        <OrdersListTab
          filters={filters}
          setFilters={setFilters}
          uploading={uploading}
          setUploading={setUploading}
          fileRef={fileRef}
          companyOptions={companyOptions}
        />
      )}

      {pageTab === "performance" && (
        <OrderPerformanceTab
          filters={filters}
          setFilters={setFilters}
        />
      )}
    </div>
  );
}
