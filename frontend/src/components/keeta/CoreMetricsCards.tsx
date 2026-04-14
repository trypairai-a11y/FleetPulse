"use client";
import { Package, CheckCircle2, Users, Target, XCircle, Percent } from "lucide-react";
import TrendPill from "./TrendPill";

type Card = { value: number; dodPct: number | null; wowPct: number | null };
type Cards = {
  acceptedTasks: Card;
  deliveredTasks: Card;
  deliveredProp: Card;
  cancelledTasks: Card;
  onlineCouriers: Card;
  onTimeRateDaily: Card;
};

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default function CoreMetricsCards({ cards }: { cards: Cards | null }) {
  if (!cards) return null;
  const items = [
    { title: "Accepted Tasks", icon: Package, value: String(cards.acceptedTasks.value), card: cards.acceptedTasks },
    { title: "Delivered Tasks", icon: CheckCircle2, value: String(cards.deliveredTasks.value), card: cards.deliveredTasks },
    { title: "Couriers (Delivered) Proportion", icon: Percent, value: fmtPct(cards.deliveredProp.value), card: cards.deliveredProp },
    { title: "Cancelled Tasks", icon: XCircle, value: String(cards.cancelledTasks.value), card: cards.cancelledTasks },
    { title: "Online Couriers", icon: Users, value: String(cards.onlineCouriers.value), card: cards.onlineCouriers },
    { title: "On-time Rate (D)", icon: Target, value: fmtPct(cards.onTimeRateDaily.value), card: cards.onTimeRateDaily },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <div key={it.title} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-secondary uppercase tracking-wide truncate">{it.title}</p>
            <it.icon size={14} className="text-secondary shrink-0" />
          </div>
          <p className="text-xl font-semibold">{it.value}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <TrendPill pct={it.card.dodPct} label="DoD" />
            <TrendPill pct={it.card.wowPct} label="WoW" />
          </div>
        </div>
      ))}
    </div>
  );
}
