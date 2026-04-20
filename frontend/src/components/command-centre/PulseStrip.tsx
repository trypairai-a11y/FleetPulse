"use client";
import { cn } from "@/lib/cn";
import { Users, Package, Wallet, Siren } from "lucide-react";

interface Pulse {
  onShift: number;
  ordersInFlight: number;
  cashPendingKd: number;
  openViolations: number;
  queuePending: number;
}

interface PulseStripProps {
  pulse: Pulse | null;
  loading?: boolean;
}

export default function PulseStrip({ pulse, loading }: PulseStripProps) {
  const items = [
    { label: "On shift now", value: pulse?.onShift, icon: Users, tone: "default" as const },
    { label: "Orders in flight", value: pulse?.ordersInFlight, icon: Package, tone: "default" as const },
    { label: "Cash pending (KD)", value: pulse?.cashPendingKd?.toFixed(3), icon: Wallet, tone: pulse && pulse.cashPendingKd > 500 ? "warning" : "default" },
    { label: "Open violations", value: pulse?.openViolations, icon: Siren, tone: pulse && pulse.openViolations > 0 ? "warning" : "default" },
    { label: "Needs your decision", value: pulse?.queuePending, icon: Siren, tone: pulse && pulse.queuePending > 0 ? "critical" : "default" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map((it, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md",
            it.tone === "warning" && "ring-1 ring-amber-200",
            it.tone === "critical" && "ring-1 ring-red-200"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-secondary">{it.label}</p>
            <it.icon size={14} className={cn(
              it.tone === "critical" && "text-red-500",
              it.tone === "warning" && "text-amber-500",
              it.tone === "default" && "text-gray-300"
            )} />
          </div>
          <p className={cn(
            "mt-2 text-2xl font-semibold",
            it.tone === "critical" && "text-red-600",
            it.tone === "warning" && "text-amber-700",
            it.tone === "default" && "text-foreground"
          )}>
            {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100" /> : (it.value ?? "—")}
          </p>
        </div>
      ))}
    </div>
  );
}
