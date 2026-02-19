"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import {
  Plus,
  Smartphone,
  Wifi,
  WifiOff,
  BatteryLow,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDevices, useCreateDevice, useSendCommand } from "@/hooks/useDevices";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { DEVICE_STATUS_CONFIG, DEVICE_COMMAND_TYPES } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type { Device, DeviceCreate, DeviceCommandCreate } from "@/types/device";

export default function DevicesPage() {
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialogs
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandDeviceId, setCommandDeviceId] = useState("");

  // Enroll form state
  const [formModel, setFormModel] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formImei, setFormImei] = useState("");
  const [formDriverId, setFormDriverId] = useState("");

  // Command form state
  const [commandType, setCommandType] = useState("");

  // Debounced search
  const debouncedSearch = useDebounce(search, 300);

  // Pagination
  const { page, perPage, goToPage, resetPage } = usePagination({
    initialPage: 1,
    initialPerPage: 20,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, resetPage]);

  // Fetch devices
  const { data, isLoading } = useDevices({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    per_page: perPage,
  });

  // Mutations
  const createDevice = useCreateDevice();
  const sendCommand = useSendCommand();

  const devices = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // Summary chips
  const summary = useMemo(() => {
    const all = devices;
    const online = all.filter((d) => d.status === "active").length;
    const offline = all.filter((d) => d.status === "inactive" || d.status === "decommissioned").length;
    const lowBattery = all.filter((d) => d.battery_level != null && d.battery_level < 20).length;
    return { online, offline, lowBattery };
  }, [devices]);

  const handleEnroll = async () => {
    const body: DeviceCreate = {
      device_model: formModel || undefined,
      phone_number: formPhone || undefined,
      imei: formImei || undefined,
      assigned_driver_id: formDriverId || undefined,
    };
    await createDevice.mutateAsync(body);
    setEnrollOpen(false);
    setFormModel("");
    setFormPhone("");
    setFormImei("");
    setFormDriverId("");
  };

  const handleSendCommand = async () => {
    if (!commandDeviceId || !commandType) return;
    const body: DeviceCommandCreate = {
      device_id: commandDeviceId,
      command_type: commandType,
    };
    await sendCommand.mutateAsync(body);
    setCommandOpen(false);
    setCommandDeviceId("");
    setCommandType("");
  };

  const openCommandDialog = (deviceId: string, type: string) => {
    setCommandDeviceId(deviceId);
    setCommandType(type);
    setCommandOpen(true);
  };

  // Filter options
  const statusOptions = Object.keys(DEVICE_STATUS_CONFIG).map((s) => ({
    value: s,
    labelEn: DEVICE_STATUS_CONFIG[s].labelEn,
    labelAr: DEVICE_STATUS_CONFIG[s].labelAr,
  }));

  // Battery color helper
  const batteryColor = (level: number | null) => {
    if (level == null) return "#9CA3AF";
    if (level > 50) return "#12B981";
    if (level >= 20) return "#F59E0B";
    return "#E5484D";
  };

  // Table columns
  const columns = [
    {
      key: "device_model",
      headerEn: "Model",
      headerAr: "الموديل",
      render: (d: Device) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2563EB0D] flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
          </div>
          <span className="text-[13px] font-medium text-[#0C1825] group-hover:text-[#2563EB] transition-colors">
            {d.device_model || (isAr ? "غير معروف" : "Unknown")}
          </span>
        </div>
      ),
    },
    {
      key: "assigned_driver_id",
      headerEn: "Driver",
      headerAr: "السائق",
      render: (d: Device) => (
        <span className="text-[12px] text-[#6B7A8D] font-mono">
          {d.assigned_driver_id || "\u2014"}
        </span>
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (d: Device) => (
        <StatusBadge
          status={d.status}
          config={DEVICE_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "battery_level",
      headerEn: "Battery",
      headerAr: "البطارية",
      render: (d: Device) => {
        if (d.battery_level == null) {
          return <span className="text-[12px] text-[#9CA3AF]">{"\u2014"}</span>;
        }
        const color = batteryColor(d.battery_level);
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${d.battery_level}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color }}
            >
              {d.battery_level}%
            </span>
          </div>
        );
      },
    },
    {
      key: "last_heartbeat_at",
      headerEn: "Last Seen",
      headerAr: "آخر ظهور",
      render: (d: Device) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {formatRelativeTime(d.last_heartbeat_at)}
        </span>
      ),
    },
    {
      key: "app_version",
      headerEn: "App Version",
      headerAr: "إصدار التطبيق",
      render: (d: Device) => (
        <span className="text-[12px] text-[#6B7A8D] font-mono">
          {d.app_version || "\u2014"}
        </span>
      ),
    },
    {
      key: "actions",
      headerEn: "Actions",
      headerAr: "إجراءات",
      render: (d: Device) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="border-[#E6E9EE] text-[#6B7A8D] gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Send className="w-3 h-3" />
              <span className="text-[10px]">{isAr ? "أمر" : "Command"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {DEVICE_COMMAND_TYPES.map((cmd) => (
              <DropdownMenuItem
                key={cmd.value}
                onClick={(e) => {
                  e.stopPropagation();
                  openCommandDialog(d.id, cmd.value);
                }}
                className="text-[12px]"
              >
                {isAr ? cmd.labelAr : cmd.labelEn}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const noFiltersActive = !debouncedSearch && statusFilter === "all";

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <PageHeader
        titleEn="Devices"
        titleAr="الأجهزة"
        subtitleEn="Manage and monitor Android devices"
        subtitleAr="إدارة ومراقبة أجهزة الأندرويد"
        actions={
          <Button
            onClick={() => setEnrollOpen(true)}
            className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAr ? "تسجيل جهاز" : "Enroll Device"}
          </Button>
        }
      />

      {/* Summary Chips */}
      <div className="flex gap-3">
        {[
          {
            icon: Wifi,
            label: isAr ? "متصل" : "Online",
            count: summary.online,
            color: "#12B981",
          },
          {
            icon: WifiOff,
            label: isAr ? "غير متصل" : "Offline",
            count: summary.offline,
            color: "#E5484D",
          },
          {
            icon: BatteryLow,
            label: isAr ? "بطارية منخفضة" : "Low Battery",
            count: summary.lowBattery,
            color: "#F59E0B",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-lg border border-[#E6E9EE] px-4 py-3 flex items-center gap-3 min-w-[140px]"
          >
            <s.icon
              className="w-4 h-4"
              style={{ color: s.color }}
              strokeWidth={1.75}
            />
            <div>
              <div className="text-[18px] font-bold text-[#0C1825] leading-none">
                {s.count}
              </div>
              <div className="text-[11px] text-[#6B7A8D] mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholderEn="Search devices..."
        searchPlaceholderAr="بحث في الأجهزة..."
        filters={[
          {
            key: "status",
            placeholderEn: "Status",
            placeholderAr: "الحالة",
            options: statusOptions,
            value: statusFilter,
            onChange: setStatusFilter,
          },
        ]}
      />

      {/* Table or Empty State */}
      {!isLoading && devices.length === 0 && noFiltersActive ? (
        <EmptyState
          icon={Smartphone}
          titleEn="No devices enrolled"
          titleAr="لا توجد أجهزة مسجلة"
          descriptionEn="Enroll Android devices to start tracking drivers and capturing orders."
          descriptionAr="سجّل أجهزة الأندرويد لبدء تتبع السائقين والتقاط الطلبات."
          actionLabelEn="Enroll Device"
          actionLabelAr="تسجيل جهاز"
          onAction={() => setEnrollOpen(true)}
        />
      ) : (
        <>
          <DataTable<Device>
            columns={columns}
            data={devices}
            loading={isLoading}
            emptyMessage={isAr ? "لا توجد نتائج" : "No devices found"}
            language={language}
            rowKey={(d) => d.id}
            onRowClick={(d) => router.push(`/devices/${d.id}`)}
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
        </>
      )}

      {/* Enroll Device Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "تسجيل جهاز جديد" : "Enroll New Device"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {isAr
                ? "أدخل بيانات الجهاز لتسجيله في النظام"
                : "Enter device details to enroll it in the system"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#374151]">
                {isAr ? "موديل الجهاز" : "Device Model"}
              </Label>
              <Input
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder={isAr ? "مثال: Samsung Galaxy A54" : "e.g. Samsung Galaxy A54"}
                className="h-8 text-[12px] border-[#E6E9EE]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#374151]">
                  {isAr ? "رقم الهاتف" : "Phone Number"}
                </Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+965XXXXXXXX"
                  className="h-8 text-[12px] border-[#E6E9EE]"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#374151]">IMEI</Label>
                <Input
                  value={formImei}
                  onChange={(e) => setFormImei(e.target.value)}
                  placeholder="IMEI"
                  className="h-8 text-[12px] border-[#E6E9EE]"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#374151]">
                {isAr ? "معرف السائق (اختياري)" : "Driver ID (optional)"}
              </Label>
              <Input
                value={formDriverId}
                onChange={(e) => setFormDriverId(e.target.value)}
                placeholder={isAr ? "معرف السائق" : "Driver ID"}
                className="h-8 text-[12px] border-[#E6E9EE]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEnrollOpen(false)}
              className="h-8 px-3 text-[12px]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={createDevice.isPending}
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {createDevice.isPending
                ? isAr
                  ? "جاري التسجيل..."
                  : "Enrolling..."
                : isAr
                  ? "تسجيل الجهاز"
                  : "Enroll Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Command Confirmation Dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "إرسال أمر" : "Send Command"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {isAr
                ? "هل أنت متأكد من إرسال هذا الأمر للجهاز؟"
                : "Are you sure you want to send this command to the device?"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="bg-[#F0F2F5] rounded-lg px-3 py-2">
              <span className="text-[11px] text-[#6B7A8D] block mb-0.5">
                {isAr ? "نوع الأمر" : "Command Type"}
              </span>
              <span className="text-[13px] font-medium text-[#0C1825] capitalize">
                {(() => {
                  const cmd = DEVICE_COMMAND_TYPES.find(
                    (c) => c.value === commandType
                  );
                  return cmd
                    ? isAr
                      ? cmd.labelAr
                      : cmd.labelEn
                    : commandType;
                })()}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCommandOpen(false)}
              className="h-8 px-3 text-[12px]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSendCommand}
              disabled={sendCommand.isPending}
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
            >
              <Send className="w-3 h-3" />
              {sendCommand.isPending
                ? isAr
                  ? "جاري الإرسال..."
                  : "Sending..."
                : isAr
                  ? "إرسال"
                  : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
