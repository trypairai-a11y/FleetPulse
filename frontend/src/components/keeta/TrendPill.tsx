import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export default function TrendPill({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null || pct === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-[11px] font-medium text-gray-400">
        <Minus size={10} /> — {label}
      </span>
    );
  }
  const positive = pct > 0;
  const zero = pct === 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
      zero && "bg-gray-50 text-gray-500",
      positive && !zero && "bg-green-50 text-green-700",
      !positive && !zero && "bg-red-50 text-red-600",
    )}>
      {positive ? <ArrowUp size={10} /> : zero ? <Minus size={10} /> : <ArrowDown size={10} />}
      {Math.abs(pct).toFixed(2)}% {label}
    </span>
  );
}
