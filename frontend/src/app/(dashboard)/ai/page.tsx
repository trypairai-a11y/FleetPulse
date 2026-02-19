"use client";

import Link from "next/link";
import { useUIStore } from "@/stores/uiStore";
import { useDigest, useAlerts, useAlertCount } from "@/hooks/useAI";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Sparkles, AlertTriangle, MessageSquare,
  ArrowRight, TrendingUp, Users, Package, Banknote,
  CheckCircle2, XCircle, Bell,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "#E5484D", bg: "#E5484D0D" },
  high: { color: "#F59E0B", bg: "#F59E0B0D" },
  medium: { color: "#2563EB", bg: "#2563EB0D" },
  low: { color: "#6B7A8D", bg: "#6B7A8D0D" },
};

export default function AIPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";

  const { data: digestData, isLoading: digestLoading } = useDigest();
  const { data: alertsData, isLoading: alertsLoading } = useAlerts({ status: "active", per_page: 5 });
  const { data: alertCount } = useAlertCount();

  const digest = digestData?.digest;
  const digestContent = isAr ? digest?.content_ar : digest?.content;
  const alerts = alertsData?.items ?? [];
  const activeCount = alertCount?.count ?? 0;

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
          {isAr ? "الذكاء الاصطناعي" : "AI Insights"}
        </h1>
        <p className="text-[12px] text-[#6B7A8D] mt-0.5">
          {isAr ? "تحليلات وتنبيهات ذكية مدعومة بـ Claude" : "Powered by Claude — smart analytics and alerts"}
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link href="/ai/chat" className="group">
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-5 hover:border-[#2563EB]/30 hover:shadow-sm transition-all h-full">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4 text-[#7C3AED]" strokeWidth={2} />
            </div>
            <div className="text-[14px] font-semibold text-[#0C1825] group-hover:text-[#2563EB] transition-colors">
              {isAr ? "محادثة AI" : "AI Chat"}
            </div>
            <div className="text-[12px] text-[#6B7A8D] mt-1">
              {isAr ? "اسأل أي سؤال عن بيانات الأسطول" : "Ask anything about your fleet data"}
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[#2563EB]">
              {isAr ? "ابدأ محادثة" : "Start chatting"} <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>

        <Link href="/ai/alerts" className="group">
          <div className="bg-white rounded-lg border border-[#E6E9EE] p-5 hover:border-[#F59E0B]/30 hover:shadow-sm transition-all h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#F59E0B0D] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" strokeWidth={2} />
              </div>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#E5484D] text-white text-[10px] font-bold">
                  {activeCount}
                </span>
              )}
            </div>
            <div className="text-[14px] font-semibold text-[#0C1825] group-hover:text-[#F59E0B] transition-colors">
              {isAr ? "التنبيهات" : "Smart Alerts"}
            </div>
            <div className="text-[12px] text-[#6B7A8D] mt-1">
              {isAr ? "تنبيهات استباقية للمشاكل المحتملة" : "Proactive alerts for potential issues"}
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[#F59E0B]">
              {isAr ? "عرض التنبيهات" : "View alerts"} <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
          <div className="w-9 h-9 rounded-lg bg-[#12B9810D] flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-[#12B981]" strokeWidth={2} />
          </div>
          <div className="text-[14px] font-semibold text-[#0C1825]">
            {isAr ? "درجات الأداء" : "Performance Scores"}
          </div>
          <div className="text-[12px] text-[#6B7A8D] mt-1">
            {isAr ? "تقييم أداء السواق بالذكاء الاصطناعي" : "AI-powered driver performance evaluation"}
          </div>
          <div className="mt-3 text-[11px] font-medium text-[#12B981]">
            {isAr ? "يتم التحديث يومياً الساعة 2 صباحاً" : "Updated daily at 2 AM"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Digest card */}
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-[14px] font-semibold text-[#0C1825]">
              {isAr ? "الملخص اليومي" : "Daily Digest"}
            </h2>
            {digest && (
              <span className="text-[10px] text-[#6B7A8D] px-2 py-0.5 rounded bg-[#F7F8FA]">
                {digest.date}
              </span>
            )}
          </div>

          {digestLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
          ) : !digest ? (
            <div className="py-8 text-center">
              <Brain className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
              <p className="text-[13px] text-[#6B7A8D]">
                {isAr ? "لا يوجد ملخص بعد" : "No digest available yet"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                {isAr ? "سيتم إنشاؤه تلقائياً الساعة 6 صباحاً" : "Auto-generated daily at 6 AM"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-[#374151] leading-relaxed mb-4">
                {digestContent?.summary}
              </p>

              {/* Metrics grid */}
              {digestContent?.metrics && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <MetricCard
                    icon={Users}
                    label={isAr ? "سائقين نشطين" : "Active Drivers"}
                    value={digestContent.metrics.active_drivers}
                    color="#2563EB"
                  />
                  <MetricCard
                    icon={Package}
                    label={isAr ? "الطلبات" : "Orders"}
                    value={digestContent.metrics.total_orders}
                    color="#12B981"
                  />
                  <MetricCard
                    icon={CheckCircle2}
                    label={isAr ? "نسبة الحضور" : "Attendance"}
                    value={`${digestContent.metrics.attendance_rate}%`}
                    color="#F59E0B"
                  />
                  <MetricCard
                    icon={Banknote}
                    label={isAr ? "نقد معلق" : "Outstanding"}
                    value={`${digestContent.metrics.cash_outstanding} KD`}
                    color="#E5484D"
                  />
                </div>
              )}

              {/* Highlights */}
              {digestContent?.highlights && digestContent.highlights.length > 0 && (
                <div className="space-y-1.5">
                  {digestContent.highlights.map((h: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B981] mt-0.5 shrink-0" />
                      <span className="text-[12px] text-[#374151]">{h}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Concerns */}
              {digestContent?.concerns && digestContent.concerns.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {digestContent.concerns.map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-[#E5484D] mt-0.5 shrink-0" />
                      <span className="text-[12px] text-[#374151]">{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent alerts */}
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#F59E0B]" />
              <h2 className="text-[14px] font-semibold text-[#0C1825]">
                {isAr ? "التنبيهات الأخيرة" : "Recent Alerts"}
              </h2>
              {activeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#E5484D] text-white text-[10px] font-bold min-w-[18px] text-center">
                  {activeCount}
                </span>
              )}
            </div>
            <Link href="/ai/alerts" className="text-[11px] font-medium text-[#2563EB] hover:text-[#1d4ed8]">
              {isAr ? "عرض الكل" : "View all"} →
            </Link>
          </div>

          {alertsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-[#12B981] mx-auto mb-2" />
              <p className="text-[13px] text-[#6B7A8D]">
                {isAr ? "لا توجد تنبيهات نشطة" : "No active alerts"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                {isAr ? "كل شي تمام!" : "Everything looks good!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F7F8FA] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: sev.bg }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" style={{ color: sev.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#0C1825] truncate">
                        {isAr ? (alert.title_ar || alert.title) : alert.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={{ color: sev.color, backgroundColor: sev.bg }}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {formatRelativeTime(alert.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-[#F7F8FA]">
      <Icon className="w-3.5 h-3.5 mb-1.5" style={{ color }} />
      <div className="text-[15px] font-bold text-[#0C1825]">{value}</div>
      <div className="text-[10px] text-[#6B7A8D]">{label}</div>
    </div>
  );
}
