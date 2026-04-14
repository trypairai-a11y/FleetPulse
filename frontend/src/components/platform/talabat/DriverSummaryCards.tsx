"use client";
import React from "react";
import StatCard from "@/components/shared/StatCard";
import { CalendarClock, Package, Banknote, ShieldAlert } from "lucide-react";

interface DriverSummaryCardsProps {
  driverSummary: any;
  onTabChange: (tab: string) => void;
}

export default function DriverSummaryCards({ driverSummary, onTabChange }: DriverSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Shifts This Month"
        value={driverSummary?.sessionsThisMonth || 0}
        icon={CalendarClock}
      />
      <StatCard
        title="Avg Orders/Day"
        value={driverSummary?.avgDeliveriesPerDay != null ? driverSummary.avgDeliveriesPerDay.toFixed(1) : "0"}
        icon={Package}
      />
      <StatCard
        title="Pending Dues"
        value={driverSummary?.pendingDuesKd != null ? `${driverSummary.pendingDuesKd.toFixed(3)} KD` : "0.000 KD"}
        icon={Banknote}
        highlight={(driverSummary?.pendingDuesKd || 0) > 0}
        onClick={() => onTabChange("orders")}
      />
      <StatCard
        title="Violations"
        value={driverSummary?.violationEvents || 0}
        icon={ShieldAlert}
        highlight={(driverSummary?.violationEvents || 0) > 0}
        onClick={() => onTabChange("violations")}
      />
    </div>
  );
}
