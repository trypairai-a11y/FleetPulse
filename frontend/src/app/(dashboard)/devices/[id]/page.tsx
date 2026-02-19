"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import {
  ArrowLeft,
  Smartphone,
  Send,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { useDevice, useDeviceCommands, useSendCommand } from "@/hooks/useDevices";
import { DEVICE_STATUS_CONFIG, DEVICE_COMMAND_TYPES } from "@/lib/constants";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import type { DeviceCommand } from "@/types/device";

const COMMAND_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  pending: { labelEn: "Pending", labelAr: "قيد الانتظار", color: "#F59E0B", bg: "#F59E0B0D" },
  sent: { labelEn: "Sent", labelAr: "تم الإرسال", color: "#2563EB", bg: "#2563EB0D" },
  completed: { labelEn: "Completed", labelAr: "مكتمل", color: "#12B981", bg: "#12B9810D" },
  failed: { labelEn: "Failed", labelAr: "فشل", color: "#E5484D", bg: "#E5484D0D" },
};

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  const { data: device, isLoading: deviceLoading } = useDevice(id);
  const { data: commands, isLoading: commandsLoading } = useDeviceCommands(id);
  const sendCommand = useSendCommand();

  const [selectedCommand, setSelectedCommand] = useState("");

  const handleSendCommand = async () => {
    if (!selectedCommand) return;
    await sendCommand.mutateAsync({
      device_id: id,
      command_type: selectedCommand,
    });
    setSelectedCommand("");
  };

  // Battery color helper
  const batteryColor = (level: number | null) => {
    if (level == null) return "#9CA3AF";
    if (level > 50) return "#12B981";
    if (level >= 20) return "#F59E0B";
    return "#E5484D";
  };

  if (deviceLoading) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/devices")}
          className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isAr ? "العودة للأجهزة" : "Back to Devices"}
        </Button>
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 text-center">
          <p className="text-[14px] font-semibold text-[#0C1825]">
            {isAr ? "الجهاز غير موجود" : "Device not found"}
          </p>
        </div>
      </div>
    );
  }

  const bColor = batteryColor(device.battery_level);

  // Command history columns
  const commandColumns = [
    {
      key: "command_type",
      headerEn: "Command",
      headerAr: "الأمر",
      render: (c: DeviceCommand) => {
        const cmd = DEVICE_COMMAND_TYPES.find((t) => t.value === c.command_type);
        return (
          <span className="text-[12px] font-medium text-[#0C1825] capitalize">
            {cmd ? (isAr ? cmd.labelAr : cmd.labelEn) : c.command_type}
          </span>
        );
      },
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (c: DeviceCommand) => (
        <StatusBadge
          status={c.status}
          config={COMMAND_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "issued_at",
      headerEn: "Issued",
      headerAr: "تاريخ الإصدار",
      render: (c: DeviceCommand) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {formatDateTime(c.issued_at, language)}
        </span>
      ),
    },
    {
      key: "completed_at",
      headerEn: "Completed",
      headerAr: "تاريخ الإكمال",
      render: (c: DeviceCommand) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {c.completed_at ? formatDateTime(c.completed_at, language) : "\u2014"}
        </span>
      ),
    },
    {
      key: "result",
      headerEn: "Result",
      headerAr: "النتيجة",
      render: (c: DeviceCommand) => (
        <span className="text-[11px] text-[#6B7A8D] font-mono truncate max-w-[200px] block">
          {c.result ? JSON.stringify(c.result) : "\u2014"}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/devices")}
        className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isAr ? "العودة للأجهزة" : "Back to Devices"}
      </Button>

      {/* Header Card */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB0D] flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-[#0C1825]">
                {device.device_model || (isAr ? "جهاز غير معروف" : "Unknown Device")}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge
                  status={device.status}
                  config={DEVICE_STATUS_CONFIG}
                  language={language}
                />
                {device.battery_level != null && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${device.battery_level}%`,
                          backgroundColor: bColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: bColor }}
                    >
                      {device.battery_level}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="border-t border-[#F0F2F5] pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "رقم الهاتف" : "Phone Number"}
              </span>
              <span className="text-[12px] text-[#374151] font-mono" dir="ltr">
                {device.phone_number || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                IMEI
              </span>
              <span className="text-[12px] text-[#374151] font-mono" dir="ltr">
                {device.imei || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "إصدار النظام" : "OS Version"}
              </span>
              <span className="text-[12px] text-[#374151]">
                {device.os_version || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "إصدار التطبيق" : "App Version"}
              </span>
              <span className="text-[12px] text-[#374151] font-mono">
                {device.app_version || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "السائق" : "Driver"}
              </span>
              <span className="text-[12px] text-[#374151] font-mono">
                {device.assigned_driver_id || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "آخر ظهور" : "Last Heartbeat"}
              </span>
              <span className="text-[12px] text-[#374151]">
                {formatRelativeTime(device.last_heartbeat_at)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "الموقع" : "Location"}
              </span>
              {device.last_location_lat != null && device.last_location_lng != null ? (
                <span className="text-[12px] text-[#374151] font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#6B7A8D]" />
                  {device.last_location_lat.toFixed(5)}, {device.last_location_lng.toFixed(5)}
                </span>
              ) : (
                <span className="text-[12px] text-[#9CA3AF]">{"\u2014"}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Command Section */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <h2 className="text-[14px] font-semibold text-[#0C1825] mb-3">
          {isAr ? "إرسال أمر" : "Send Command"}
        </h2>
        <div className="flex items-center gap-2">
          <Select value={selectedCommand} onValueChange={setSelectedCommand}>
            <SelectTrigger className="h-8 w-[220px] text-[12px] border-[#E6E9EE] text-[#6B7A8D]">
              <SelectValue
                placeholder={isAr ? "اختر نوع الأمر" : "Select command type"}
              />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_COMMAND_TYPES.map((cmd) => (
                <SelectItem key={cmd.value} value={cmd.value}>
                  {isAr ? cmd.labelAr : cmd.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSendCommand}
            disabled={!selectedCommand || sendCommand.isPending}
            className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
          >
            {sendCommand.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isAr ? "إرسال" : "Send"}
          </Button>
        </div>
      </div>

      {/* Command History */}
      <div className="space-y-2">
        <h2 className="text-[14px] font-semibold text-[#0C1825]">
          {isAr ? "سجل الأوامر" : "Command History"}
        </h2>
        <DataTable<DeviceCommand>
          columns={commandColumns}
          data={commands ?? []}
          loading={commandsLoading}
          emptyMessage={isAr ? "لا توجد أوامر سابقة" : "No commands sent yet"}
          language={language}
          rowKey={(c) => c.id}
        />
      </div>
    </div>
  );
}
