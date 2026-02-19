"use client";

import { useState, useEffect, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  ClipboardList,
  ShoppingBag,
  TrendingUp,
  Wrench,
  Banknote,
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  History,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";
import api from "@/lib/api";

type ReportType =
  | "attendance"
  | "orders"
  | "performance"
  | "maintenance"
  | "cash"
  | "fleet_overview";

type ReportFormat = "pdf" | "excel" | "csv";

interface ReportTypeConfig {
  id: ReportType;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: React.ElementType;
  color: string;
}

interface GeneratedReport {
  id: string;
  report_type: string;
  format: string;
  filename: string;
  file_size: number;
  date_from: string | null;
  date_to: string | null;
  filters: Record<string, unknown>;
  download_url: string;
  created_at: string;
}

interface ReportListResponse {
  items: GeneratedReport[];
  total: number;
  page: number;
  per_page: number;
}

const PLATFORMS = ["talabat", "keeta", "deliveroo", "jahez"] as const;

const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: "attendance",
    labelEn: "Attendance",
    labelAr: "الحضور والانصراف",
    descEn: "Driver clock-in/out records and shift summaries",
    descAr: "سجلات حضور السائقين وملخصات الشفتات",
    icon: ClipboardList,
    color: "#2563EB",
  },
  {
    id: "orders",
    labelEn: "Orders",
    labelAr: "الطلبات",
    descEn: "Captured orders by platform, driver, and status",
    descAr: "الطلبات المستلمة حسب المنصة والسائق والحالة",
    icon: ShoppingBag,
    color: "#12B981",
  },
  {
    id: "performance",
    labelEn: "Driver Performance",
    labelAr: "أداء السائقين",
    descEn: "AI scores, delivery rates, and productivity metrics",
    descAr: "تقييمات الذكاء الاصطناعي ومعدلات التوصيل والإنتاجية",
    icon: TrendingUp,
    color: "#F59E0B",
  },
  {
    id: "maintenance",
    labelEn: "Maintenance",
    labelAr: "الصيانة",
    descEn: "Vehicle inspections, repairs, and maintenance history",
    descAr: "فحوصات المركبات والإصلاحات وسجل الصيانة",
    icon: Wrench,
    color: "#8B5CF6",
  },
  {
    id: "cash",
    labelEn: "Cash Records",
    labelAr: "السجلات النقدية",
    descEn: "Collections, deposits, and outstanding balances",
    descAr: "التحصيلات والإيداعات والأرصدة المعلقة",
    icon: Banknote,
    color: "#E5484D",
  },
  {
    id: "fleet_overview",
    labelEn: "Fleet Overview",
    labelAr: "نظرة عامة على الأسطول",
    descEn: "Full operational summary across all fleet entities",
    descAr: "ملخص تشغيلي شامل لجميع عناصر الأسطول",
    icon: LayoutDashboard,
    color: "#0F2B46",
  },
];

const FORMAT_CONFIGS: {
  id: ReportFormat;
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
  ext: string;
}[] = [
  { id: "pdf", labelEn: "PDF", labelAr: "PDF", icon: FileText, ext: ".pdf" },
  {
    id: "excel",
    labelEn: "Excel",
    labelAr: "Excel",
    icon: FileSpreadsheet,
    ext: ".xlsx",
  },
  { id: "csv", labelEn: "CSV", labelAr: "CSV", icon: FileText, ext: ".csv" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string, isAr: boolean): string {
  const d = new Date(iso);
  return d.toLocaleDateString(isAr ? "ar-KW" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Reports that support the platform filter
const PLATFORM_FILTERABLE: ReportType[] = ["orders", "performance"];

export default function ReportsPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const [selectedType, setSelectedType] = useState<ReportType>("attendance");
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>("pdf");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [platform, setPlatform] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // History state
  const [history, setHistory] = useState<GeneratedReport[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const PER_PAGE = 10;

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get<ReportListResponse>("/api/reports", {
        params: { page, per_page: PER_PAGE },
      });
      setHistory(data.items);
      setHistoryTotal(data.total);
      setHistoryPage(data.page);
    } catch {
      // silently fail — history is supplementary
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        report_type: selectedType,
        format: selectedFormat,
      };
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;

      const filters: Record<string, string> = {};
      if (platform && PLATFORM_FILTERABLE.includes(selectedType)) {
        filters.platform = platform;
      }
      if (Object.keys(filters).length > 0) body.filters = filters;

      const { data } = await api.post<GeneratedReport>(
        "/api/reports/generate",
        body
      );

      // Download the file immediately
      await downloadFile(data.id, data.filename, data.format);

      const typeConfig = REPORT_TYPES.find((r) => r.id === selectedType)!;
      toast.success(
        isAr
          ? `تم تحميل تقرير ${typeConfig.labelAr} بنجاح`
          : `${typeConfig.labelEn} report downloaded successfully`
      );

      // Refresh history
      fetchHistory(1);
    } catch {
      toast.error(
        isAr
          ? "فشل إنشاء التقرير. يرجى المحاولة مرة أخرى."
          : "Failed to generate report. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadFile = async (
    reportId: string,
    filename: string,
    format: string
  ) => {
    const response = await api.get(`/api/reports/${reportId}/download`, {
      responseType: "blob",
    });

    const contentTypes: Record<string, string> = {
      pdf: "application/pdf",
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
    };
    const blob = new Blob([response.data], {
      type: contentTypes[format] || "application/octet-stream",
    });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  const handleRedownload = async (report: GeneratedReport) => {
    setDownloadingId(report.id);
    try {
      await downloadFile(report.id, report.filename, report.format);
      toast.success(
        isAr ? "تم تحميل التقرير بنجاح" : "Report downloaded successfully"
      );
    } catch {
      toast.error(
        isAr ? "فشل تحميل التقرير" : "Failed to download report"
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const selectedTypeConfig = REPORT_TYPES.find((r) => r.id === selectedType)!;
  const showPlatformFilter = PLATFORM_FILTERABLE.includes(selectedType);
  const totalPages = Math.ceil(historyTotal / PER_PAGE);

  return (
    <div className="max-w-[1400px] space-y-4">
      <PageHeader
        titleEn="Reports"
        titleAr="التقارير"
        subtitleEn="Generate and export operational reports"
        subtitleAr="إنشاء وتصدير التقارير التشغيلية"
      />

      {/* Main Report Builder Card */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5 space-y-5">
        {/* Report Type Section */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide">
            {isAr ? "نوع التقرير" : "Report Type"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedType === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedType(report.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-start transition-all ${
                    isSelected
                      ? "border-[#2563EB] bg-[#2563EB08]"
                      : "border-[#E6E9EE] hover:border-[#D0D5DD] hover:bg-[#F7F8FA]"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: isSelected
                        ? `${report.color}18`
                        : `${report.color}0D`,
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: report.color }}
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[13px] font-semibold transition-colors ${
                        isSelected ? "text-[#2563EB]" : "text-[#0C1825]"
                      }`}
                    >
                      {isAr ? report.labelAr : report.labelEn}
                    </div>
                    <div className="text-[11px] text-[#6B7A8D] mt-0.5 leading-snug">
                      {isAr ? report.descAr : report.descEn}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E6E9EE]" />

        {/* Format + Date Range + Platform Filter + Generate Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 flex-wrap">
          {/* Format Toggle */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide">
              {isAr ? "صيغة الملف" : "Format"}
            </p>
            <div className="flex items-center gap-1 bg-[#F7F8FA] border border-[#E6E9EE] rounded-lg p-1">
              {FORMAT_CONFIGS.map((fmt) => {
                const FmtIcon = fmt.icon;
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-medium transition-all ${
                      isSelected
                        ? "bg-white text-[#0C1825] shadow-sm border border-[#E6E9EE]"
                        : "text-[#6B7A8D] hover:text-[#0C1825]"
                    }`}
                  >
                    <FmtIcon className="w-3 h-3" strokeWidth={1.75} />
                    {isAr ? fmt.labelAr : fmt.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide">
              {isAr ? "النطاق الزمني" : "Date Range"}
              <span className="text-[10px] font-normal normal-case ms-1 text-[#9CA3AF]">
                ({isAr ? "اختياري" : "optional"})
              </span>
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] text-[#6B7A8D] whitespace-nowrap">
                  {isAr ? "من" : "From"}
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-[12px] w-[145px] bg-white border-[#E6E9EE]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] text-[#6B7A8D] whitespace-nowrap">
                  {isAr ? "إلى" : "To"}
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="h-8 text-[12px] w-[145px] bg-white border-[#E6E9EE]"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="h-8 px-2 text-[11px] text-[#6B7A8D]"
                >
                  {isAr ? "مسح" : "Clear"}
                </Button>
              )}
            </div>
          </div>

          {/* Platform Filter — only for orders/performance reports */}
          {showPlatformFilter && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide">
                {isAr ? "المنصة" : "Platform"}
                <span className="text-[10px] font-normal normal-case ms-1 text-[#9CA3AF]">
                  ({isAr ? "اختياري" : "optional"})
                </span>
              </p>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="h-8 text-[12px] px-2.5 bg-white border border-[#E6E9EE] rounded-md text-[#0C1825] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
              >
                <option value="">{isAr ? "جميع المنصات" : "All Platforms"}</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Generate Button — pushes to end */}
          <div className="sm:ms-auto">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-9 px-5 text-[13px] font-semibold bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2 disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isAr ? "جاري الإنشاء..." : "Generating..."}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {isAr ? "إنشاء وتحميل" : "Generate & Download"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Selected Report Summary */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#F7F8FA] border border-[#E6E9EE]">
          <div
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${selectedTypeConfig.color}18` }}
          >
            {(() => {
              const Icon = selectedTypeConfig.icon;
              return (
                <Icon
                  className="w-3 h-3"
                  style={{ color: selectedTypeConfig.color }}
                  strokeWidth={2}
                />
              );
            })()}
          </div>
          <p className="text-[11px] text-[#6B7A8D]">
            {isAr ? (
              <>
                سيتم إنشاء{" "}
                <span className="font-semibold text-[#0C1825]">
                  {selectedTypeConfig.labelAr}
                </span>{" "}
                بصيغة{" "}
                <span className="font-semibold text-[#0C1825] uppercase">
                  {selectedFormat}
                </span>
                {platform && showPlatformFilter && (
                  <>
                    {" "}لمنصة{" "}
                    <span className="font-semibold text-[#0C1825] capitalize">
                      {platform}
                    </span>
                  </>
                )}
                {dateFrom && (
                  <>
                    {" "}من{" "}
                    <span className="font-semibold text-[#0C1825]">
                      {dateFrom}
                    </span>
                  </>
                )}
                {dateTo && (
                  <>
                    {" "}إلى{" "}
                    <span className="font-semibold text-[#0C1825]">
                      {dateTo}
                    </span>
                  </>
                )}
                {!dateFrom && !dateTo && <> لجميع الفترات الزمنية</>}
              </>
            ) : (
              <>
                Generating{" "}
                <span className="font-semibold text-[#0C1825]">
                  {selectedTypeConfig.labelEn}
                </span>{" "}
                as{" "}
                <span className="font-semibold text-[#0C1825] uppercase">
                  {selectedFormat}
                </span>
                {platform && showPlatformFilter && (
                  <>
                    {" "}for{" "}
                    <span className="font-semibold text-[#0C1825] capitalize">
                      {platform}
                    </span>
                  </>
                )}
                {dateFrom && (
                  <>
                    {" "}from{" "}
                    <span className="font-semibold text-[#0C1825]">
                      {dateFrom}
                    </span>
                  </>
                )}
                {dateTo && (
                  <>
                    {" "}to{" "}
                    <span className="font-semibold text-[#0C1825]">
                      {dateTo}
                    </span>
                  </>
                )}
                {!dateFrom && !dateTo && <> for all time periods</>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Report History Card */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#6B7A8D]" />
            <h2 className="text-[14px] font-semibold text-[#0C1825]">
              {isAr ? "سجل التقارير" : "Report History"}
            </h2>
            {historyTotal > 0 && (
              <span className="text-[11px] text-[#6B7A8D] bg-[#F7F8FA] px-2 py-0.5 rounded-full">
                {historyTotal}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchHistory(historyPage)}
            disabled={historyLoading}
            className="h-7 px-2 text-[11px] text-[#6B7A8D] gap-1.5"
          >
            <RefreshCw
              className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`}
            />
            {isAr ? "تحديث" : "Refresh"}
          </Button>
        </div>

        {historyLoading && history.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#6B7A8D]" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10">
            <History className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
            <p className="text-[13px] text-[#6B7A8D]">
              {isAr
                ? "لم يتم إنشاء أي تقارير بعد"
                : "No reports generated yet"}
            </p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              {isAr
                ? "قم بإنشاء تقرير أعلاه لبدء السجل"
                : "Generate a report above to start your history"}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E6E9EE]">
                    <th className="text-start text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide pb-2.5 pe-4">
                      {isAr ? "نوع التقرير" : "Report Type"}
                    </th>
                    <th className="text-start text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide pb-2.5 pe-4">
                      {isAr ? "الصيغة" : "Format"}
                    </th>
                    <th className="text-start text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide pb-2.5 pe-4">
                      {isAr ? "النطاق الزمني" : "Date Range"}
                    </th>
                    <th className="text-start text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide pb-2.5 pe-4">
                      {isAr ? "تاريخ الإنشاء" : "Generated At"}
                    </th>
                    <th className="text-start text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide pb-2.5 pe-4">
                      {isAr ? "الحجم" : "Size"}
                    </th>
                    <th className="text-end text-[11px] font-semibold text-[#6B7A8D] uppercase tracking-wide pb-2.5">
                      {isAr ? "تحميل" : "Download"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((report) => {
                    const typeConfig = REPORT_TYPES.find(
                      (r) => r.id === report.report_type
                    );
                    const dateRange =
                      report.date_from && report.date_to
                        ? `${report.date_from} — ${report.date_to}`
                        : report.date_from
                          ? `${isAr ? "من" : "From"} ${report.date_from}`
                          : report.date_to
                            ? `${isAr ? "حتى" : "To"} ${report.date_to}`
                            : isAr
                              ? "جميع الفترات"
                              : "All time";
                    const isDownloading = downloadingId === report.id;

                    return (
                      <tr
                        key={report.id}
                        className="border-b border-[#F0F2F5] last:border-0 hover:bg-[#F7F8FA] transition-colors"
                      >
                        <td className="py-2.5 pe-4">
                          <div className="flex items-center gap-2">
                            {typeConfig && (
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${typeConfig.color}12`,
                                }}
                              >
                                {(() => {
                                  const Icon = typeConfig.icon;
                                  return (
                                    <Icon
                                      className="w-3 h-3"
                                      style={{ color: typeConfig.color }}
                                      strokeWidth={2}
                                    />
                                  );
                                })()}
                              </div>
                            )}
                            <span className="text-[12px] font-medium text-[#0C1825]">
                              {isAr
                                ? typeConfig?.labelAr || report.report_type
                                : typeConfig?.labelEn || report.report_type}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pe-4">
                          <span className="text-[11px] font-medium text-[#6B7A8D] uppercase bg-[#F7F8FA] px-2 py-0.5 rounded">
                            {report.format}
                          </span>
                        </td>
                        <td className="py-2.5 pe-4">
                          <span className="text-[12px] text-[#6B7A8D]">
                            {dateRange}
                          </span>
                        </td>
                        <td className="py-2.5 pe-4">
                          <span className="text-[12px] text-[#6B7A8D]">
                            {formatDateTime(report.created_at, isAr)}
                          </span>
                        </td>
                        <td className="py-2.5 pe-4">
                          <span className="text-[12px] text-[#6B7A8D]">
                            {formatFileSize(report.file_size)}
                          </span>
                        </td>
                        <td className="py-2.5 text-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRedownload(report)}
                            disabled={isDownloading}
                            className="h-7 px-2.5 text-[11px] text-[#2563EB] hover:text-[#1d4ed8] hover:bg-[#2563EB0A] gap-1.5"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            {isAr ? "تحميل" : "Download"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-[#6B7A8D]">
                  {isAr
                    ? `صفحة ${historyPage} من ${totalPages}`
                    : `Page ${historyPage} of ${totalPages}`}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage <= 1 || historyLoading}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= totalPages || historyLoading}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
