"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { cleanDriverName } from "@/lib/formatters";
import {
  ArrowLeft, Phone, Truck, Receipt, Banknote, MapPin, Clock,
} from "lucide-react";

interface ActiveOrder {
  platformOrderId?: string;
  shortCode?: string;
  amount?: number | null;
  distanceKm?: number | null;
  createdAt?: string;
  orderType?: string;
}

interface DriverHeaderProps {
  driver: any;
  activeOrder: ActiveOrder | null;
  driverSummary?: any;
}

export default function DriverHeader({ driver, activeOrder, driverSummary }: DriverHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/talabat/drivers")} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        {driver.photoUrl ? (
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-orange-200"
          />
        ) : (
          <span className="w-11 h-11 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-semibold">
            {(driver.name || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold">{cleanDriverName(driver.talabatDisplayName || driver.name)}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {driver.platformDriverId && (
              <span className="text-xs font-mono text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">ID: {driver.platformDriverId}</span>
            )}
            {driver.vehicleType && (
              <span className="text-xs text-secondary">{driver.vehicleType.replace(/_/g, " ").toLowerCase().replace("motorcycle", "bike")}</span>
            )}
            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
              "bg-green-50 text-green-600": driver.status === "ACTIVE",
              "bg-gray-100 text-gray-500": driver.status === "INACTIVE",
              "bg-red-50 text-red-600": driver.status === "SUSPENDED" || driver.status === "TERMINATED",
              "bg-amber-50 text-amber-700": driver.status === "RESTRICTED",
              "bg-red-100 text-red-700": driver.status === "RESTRICTED_PERMANENTLY",
            })}>
              {driver.status === "RESTRICTED_PERMANENTLY" ? "Restricted \u221E" : driver.status}
            </span>
            {driver.zone && (
              <span className="text-xs text-secondary">Zone: {driver.zone}</span>
            )}
            {driver.batchNumber && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                {driver.batchNumber}
              </span>
            )}
            {driver.phone && (
              <span className="flex items-center gap-1 text-xs text-secondary">
                <Phone size={12} /> {driver.phone}
              </span>
            )}
            {driver.assignedVehicle?.plateNumber && (
              <span className="flex items-center gap-1 text-xs text-secondary">
                <Truck size={12} /> {driver.assignedVehicle.plateNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Driver Details Card */}
      {(() => {
        const details: { label: string; value: React.ReactNode }[] = [];
        if (driver.phone) details.push({ label: "Phone", value: <span className="flex items-center gap-1"><Phone size={13} className="text-gray-400" />{driver.phone}</span> });
        if (driver.vehicleType) details.push({ label: "Vehicle Type", value: driver.vehicleType.replace(/_/g, " ").toLowerCase().replace("motorcycle", "Bike").replace("car", "Car") });
        if (driver.assignedVehicle?.plateNumber) details.push({ label: "Plate", value: <span className="font-mono">{driver.assignedVehicle.plateNumber}</span> });
        if (driver.zone) details.push({ label: "Zone", value: driver.zone });
        if (driver.batchNumber) details.push({ label: "Batch", value: driver.batchNumber });
        if (driver.joinDate) details.push({ label: "Joined", value: new Date(driver.joinDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) });
        if (driver.contractType) details.push({ label: "Contract", value: driver.contractType });
        if (driver.nationalId) details.push({ label: "National ID", value: <span className="font-mono">{driver.nationalId}</span> });
        if (driver.civilId) details.push({ label: "Civil ID", value: <span className="font-mono">{driver.civilId}</span> });
        if (driver.email) details.push({ label: "Email", value: driver.email });
        if (driverSummary?.totalDeliveries != null) details.push({ label: "Total Orders", value: driverSummary.totalDeliveries.toLocaleString() });
        if (driverSummary?.totalSessions != null) details.push({ label: "Total Shifts", value: driverSummary.totalSessions.toLocaleString() });
        if (details.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-3">Driver Info</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3">
              {details.map((d) => (
                <div key={d.label}>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</div>
                  <div className="text-sm text-foreground">{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Active Order Banner */}
      {activeOrder && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-green-800">Active Delivery</span>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-green-700">
              {activeOrder.platformOrderId && (
                <span className="flex items-center gap-1 font-mono">
                  <Receipt size={11} /> #{activeOrder.platformOrderId}
                </span>
              )}
              {activeOrder.shortCode && (
                <span className="font-mono">#{activeOrder.shortCode}</span>
              )}
              {(activeOrder.amount != null) && (
                <span className="flex items-center gap-1">
                  <Banknote size={11} /> {Number(activeOrder.amount).toFixed(3)} KD
                </span>
              )}
              {activeOrder.distanceKm != null && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {Number(activeOrder.distanceKm).toFixed(1)} km
                </span>
              )}
              {activeOrder.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock size={11} /> Started {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
            {activeOrder.orderType || "Delivery"}
          </span>
        </div>
      )}
    </>
  );
}
