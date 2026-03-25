import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  highlight?: boolean;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, highlight, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md",
      highlight && "ring-1 ring-red-200",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-secondary mb-1">{title}</p>
          <p className={cn(
            "text-2xl font-semibold",
            highlight ? "text-red-500" : "text-foreground"
          )}>
            {value}
          </p>
          {trend && <p className="text-xs text-secondary mt-1">{trend}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-gray-50 rounded-xl">
            <Icon size={18} className="text-secondary" />
          </div>
        )}
      </div>
    </div>
  );
}
