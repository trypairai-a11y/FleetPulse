"use client";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { Users, Activity, DollarSign, AlertTriangle, CheckCircle, Sparkles, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";
import api from "@/lib/api";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string;
  driver?: { name: string; platform: string };
  status: string;
}

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-gray-400",
};

export default function OverviewPage() {
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { data: alertsData } = useApiGet<{ data: Alert[]; pagination: any }>("/api/alerts?status=ACTIVE&limit=20");
  const { data: driversData } = useApiGet<{ pagination: { total: number } }>("/api/drivers?limit=1");
  const { data: summaryData } = useApiGet<any>("/api/attendance/summary");
  const { data: digest, refetch: refetchDigest } = useApiGet<any>("/api/ai/digest");
  const { data: cashData } = useApiGet<any>("/api/cash/ledger?month=" + new Date().toISOString().slice(0, 7) + "&limit=100");

  const handleRefreshDigest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      await api.post("/api/ai/digest/generate");
      await refetchDigest();
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  };

  const alerts = alertsData?.data || [];
  const totalDrivers = driversData?.pagination?.total || 0;
  const pendingCash = (cashData?.data || []).reduce((s: number, r: any) => s + Number(r.closingBalance || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Morning Briefing */}
      {digest && (
        <div className="bg-gradient-to-r from-primary/5 to-blue-50 rounded-2xl p-5 border border-primary/10">
          <button
            onClick={() => setBriefingOpen(!briefingOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Morning Briefing</span>
              <span className="text-[10px] text-secondary">
                {digest.date ? new Date(digest.date).toLocaleDateString() : "Today"}
              </span>
              <button
                onClick={handleRefreshDigest}
                disabled={refreshing}
                className="ml-1 p-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Regenerate digest"
              >
                <RefreshCw size={13} className={cn("text-secondary", refreshing && "animate-spin")} />
              </button>
            </div>
            {briefingOpen ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
          </button>
          {briefingOpen && digest.content && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-foreground">{digest.content.summary}</p>
              {digest.content.alerts?.length > 0 && (
                <ul className="space-y-1">
                  {digest.content.alerts.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-secondary flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              {digest.content.recommendations?.length > 0 && (
                <div className="pt-2 border-t border-primary/10">
                  <p className="text-[10px] font-medium text-secondary uppercase mb-1">Recommendations</p>
                  {digest.content.recommendations.map((r: string, i: number) => (
                    <p key={i} className="text-xs text-primary">{r}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Drivers" value={totalDrivers} icon={Users} />
        <StatCard title="Active Now" value={summaryData?.present || 0} icon={Activity} />
        <StatCard title="Pending Cash" value={`KWD ${pendingCash.toFixed(0)}`} icon={DollarSign} highlight={pendingCash > 100} />
        <StatCard
          title="Open Alerts"
          value={alerts.length}
          icon={AlertTriangle}
          highlight={alerts.length > 0}
        />
      </div>

      {/* Alerts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Today&apos;s Alerts</h2>
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
            <p className="text-sm font-medium text-foreground">All clear</p>
            <p className="text-xs text-secondary mt-1">No active alerts right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200"
              >
                <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", SEVERITY_DOT[alert.severity])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-secondary mt-0.5 truncate">{alert.message}</p>
                </div>
                {alert.driver && <PlatformBadge platform={alert.driver.platform} />}
                <span className="text-xs text-secondary whitespace-nowrap">
                  {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
