import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: React.ElementType;
  iconColor: string;
}

export function StatCard({ label, value, change, positive, icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#E6E9EE] p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}0D` }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2} />
        </div>
        {change && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${positive ? "text-[#12B981]" : "text-[#E5484D]"}`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <div className="text-[22px] font-bold text-[#0C1825] tracking-tight leading-none">{value}</div>
      <div className="text-[11px] text-[#6B7A8D] mt-1 font-medium">{label}</div>
    </div>
  );
}
