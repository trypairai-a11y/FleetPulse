"use client";

import { useState, useCallback } from "react";
import { useUIStore } from "@/stores/uiStore";
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  useCash,
  useCashSummary,
  useOutstandingDrivers,
  useCreateDeposit,
  useReconcileCash,
} from "@/hooks/useCash";
import { usePagination } from "@/hooks/usePagination";
import { CASH_STATUS_CONFIG } from "@/lib/constants";
import { formatKWD, formatDate } from "@/lib/utils";
import type { CashRecord, CashRecordCreate } from "@/types/cash";

const INITIAL_DEPOSIT: CashRecordCreate = {
  driver_id: "",
  date: new Date().toISOString().split("T")[0],
  record_type: "deposit",
  amount: 0,
  reference_number: "",
  notes: "",
};

export default function CashPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const { page, perPage, goToPage } = usePagination();

  // Dialog
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositForm, setDepositForm] = useState<CashRecordCreate>({
    ...INITIAL_DEPOSIT,
  });

  // Queries
  const { data: summaryData, isLoading: summaryLoading } = useCashSummary(
    dateFrom || undefined,
    dateTo || undefined
  );

  const { data: cashData, isLoading: cashLoading } = useCash({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    per_page: perPage,
  });

  const { data: outstandingDrivers } = useOutstandingDrivers();

  const createDeposit = useCreateDeposit();
  const reconcileCash = useReconcileCash();

  const records = cashData?.items ?? [];
  const total = cashData?.total ?? 0;
  const pages = cashData?.pages ?? 1;

  const summary = summaryData ?? {
    collected: 0,
    deposited: 0,
    outstanding: 0,
    verified: 0,
  };

  const handleDeposit = async () => {
    if (!depositForm.driver_id || depositForm.amount <= 0) return;
    try {
      await createDeposit.mutateAsync(depositForm);
      setDepositOpen(false);
      setDepositForm({ ...INITIAL_DEPOSIT });
    } catch {
      // Error handled by React Query
    }
  };

  const handleReconcile = async (id: string) => {
    try {
      await reconcileCash.mutateAsync(id);
    } catch {
      // Error handled by React Query
    }
  };

  const isOldOutstanding = useCallback((oldestDate: string): boolean => {
    const diffMs = Date.now() - new Date(oldestDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  }, []);

  const columns = [
    {
      key: "date",
      headerEn: "Date",
      headerAr: "التاريخ",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#374151]">
          {formatDate(r.date, language)}
        </span>
      ),
    },
    {
      key: "driver",
      headerEn: "Driver",
      headerAr: "السائق",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {r.driver_id ? r.driver_id.slice(0, 8) + "..." : "—"}
        </span>
      ),
    },
    {
      key: "type",
      headerEn: "Type",
      headerAr: "النوع",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#374151] capitalize">
          {r.record_type}
        </span>
      ),
    },
    {
      key: "amount",
      headerEn: "Amount",
      headerAr: "المبلغ",
      render: (r: CashRecord) => (
        <span className="text-[13px] font-semibold text-[#0C1825] tabular-nums">
          {formatKWD(r.amount)}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (r: CashRecord) => (
        <StatusBadge
          status={r.status}
          config={CASH_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "reference",
      headerEn: "Reference",
      headerAr: "المرجع",
      render: (r: CashRecord) => (
        <span className="text-[12px] text-[#6B7A8D] font-mono">
          {r.reference_number || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      headerEn: "Actions",
      headerAr: "الإجراءات",
      render: (r: CashRecord) =>
        r.status === "pending" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleReconcile(r.id);
            }}
            disabled={reconcileCash.isPending}
            className="h-7 px-2 text-[11px] text-[#2563EB] border-[#E6E9EE] hover:bg-[#2563EB0D]"
          >
            {reconcileCash.isPending
              ? isAr
                ? "جاري..."
                : "..."
              : isAr
                ? "تسوية"
                : "Reconcile"}
          </Button>
        ) : (
          <span className="text-[11px] text-[#9CA3AF]">—</span>
        ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      <PageHeader
        titleEn="Cash"
        titleAr="النقدية"
        subtitleEn="Track collections and deposits"
        subtitleAr="تتبع التحصيل والإيداعات"
        actions={
          <>
            <ExportButton url="/api/cash/export" filename="cash-records.csv" />
            <Button
              onClick={() => setDepositOpen(true)}
              className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? "تسجيل إيداع" : "Record Deposit"}
            </Button>
          </>
        }
      />

      {/* Date Range */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-[#6B7A8D] whitespace-nowrap">
            {isAr ? "من" : "From"}
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              goToPage(1);
            }}
            className="h-8 text-[12px] w-[150px] bg-white border-[#E6E9EE]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-[#6B7A8D] whitespace-nowrap">
            {isAr ? "إلى" : "To"}
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              goToPage(1);
            }}
            className="h-8 text-[12px] w-[150px] bg-white border-[#E6E9EE]"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              goToPage(1);
            }}
            className="h-8 px-2 text-[11px] text-[#6B7A8D]"
          >
            {isAr ? "مسح" : "Clear"}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={isAr ? "إجمالي التحصيل" : "Total Collected"}
          value={summaryLoading ? "..." : formatKWD(summary.collected)}
          icon={ArrowDownRight}
          iconColor="#2563EB"
        />
        <StatCard
          label={isAr ? "تم الإيداع" : "Deposited"}
          value={summaryLoading ? "..." : formatKWD(summary.deposited)}
          icon={ArrowUpRight}
          iconColor="#12B981"
        />
        <StatCard
          label={isAr ? "معلق" : "Outstanding"}
          value={summaryLoading ? "..." : formatKWD(summary.outstanding)}
          icon={AlertTriangle}
          iconColor="#F59E0B"
        />
        <StatCard
          label={isAr ? "تم التحقق" : "Verified"}
          value={summaryLoading ? "..." : formatKWD(summary.verified)}
          icon={CheckCircle2}
          iconColor="#6B7A8D"
        />
      </div>

      {/* Outstanding Drivers */}
      {outstandingDrivers && outstandingDrivers.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-4">
          <h3 className="text-[13px] font-semibold text-[#0C1825] mb-3">
            {isAr ? "سائقين لديهم مبالغ معلقة" : "Outstanding Drivers"}
          </h3>
          <div className="divide-y divide-[#F0F2F5]">
            {outstandingDrivers.map((d) => (
              <div
                key={d.driver_id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#F59E0B0D] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#0C1825]">
                      {d.driver_name}
                    </div>
                    <div className="text-[11px] text-[#9CA3AF]">
                      {isAr ? "منذ" : "Since"}{" "}
                      {formatDate(d.oldest_date, language)}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[13px] font-semibold tabular-nums ${
                    isOldOutstanding(d.oldest_date)
                      ? "text-[#E5484D]"
                      : "text-[#F59E0B]"
                  }`}
                >
                  {formatKWD(d.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cash Records Table */}
      <DataTable<CashRecord>
        columns={columns}
        data={records}
        loading={cashLoading}
        emptyMessage={isAr ? "لا توجد سجلات نقدية" : "No cash records found"}
        language={language}
        rowKey={(r) => r.id}
      />

      {total > 0 && (
        <Pagination
          page={page}
          pages={pages}
          total={total}
          perPage={perPage}
          onPageChange={goToPage}
        />
      )}

      {/* Record Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "تسجيل إيداع" : "Record Deposit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#6B7A8D]">
                {isAr ? "معرف السائق" : "Driver ID"} *
              </Label>
              <Input
                value={depositForm.driver_id}
                onChange={(e) =>
                  setDepositForm({ ...depositForm, driver_id: e.target.value })
                }
                placeholder={isAr ? "أدخل معرف السائق" : "Enter driver ID"}
                className="h-8 text-[12px] border-[#E6E9EE]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "المبلغ" : "Amount"} (KWD) *
                </Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={depositForm.amount || ""}
                  onChange={(e) =>
                    setDepositForm({
                      ...depositForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.000"
                  className="h-8 text-[12px] border-[#E6E9EE] tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#6B7A8D]">
                  {isAr ? "التاريخ" : "Date"} *
                </Label>
                <Input
                  type="date"
                  value={depositForm.date}
                  onChange={(e) =>
                    setDepositForm({ ...depositForm, date: e.target.value })
                  }
                  className="h-8 text-[12px] border-[#E6E9EE]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#6B7A8D]">
                {isAr ? "رقم المرجع" : "Reference Number"}
              </Label>
              <Input
                value={depositForm.reference_number ?? ""}
                onChange={(e) =>
                  setDepositForm({
                    ...depositForm,
                    reference_number: e.target.value,
                  })
                }
                placeholder={isAr ? "رقم الإيصال أو الحوالة" : "Receipt or transfer number"}
                className="h-8 text-[12px] border-[#E6E9EE] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#6B7A8D]">
                {isAr ? "ملاحظات" : "Notes"}
              </Label>
              <Textarea
                value={depositForm.notes ?? ""}
                onChange={(e) =>
                  setDepositForm({ ...depositForm, notes: e.target.value })
                }
                placeholder={isAr ? "ملاحظات إضافية..." : "Additional notes..."}
                className="text-[12px] border-[#E6E9EE] min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDepositOpen(false)}
              className="h-8 px-3 text-[12px]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={
                !depositForm.driver_id ||
                depositForm.amount <= 0 ||
                createDeposit.isPending
              }
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {createDeposit.isPending
                ? isAr
                  ? "جاري التسجيل..."
                  : "Recording..."
                : isAr
                  ? "تسجيل الإيداع"
                  : "Record Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
