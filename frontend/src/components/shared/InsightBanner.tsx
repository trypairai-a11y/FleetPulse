"use client";
import { useState, useEffect, useCallback } from "react";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  Lightbulb, TrendingUp, Users, DollarSign, Shield, GraduationCap,
  Zap, X, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  ExternalLink,
} from "lucide-react";

interface AiInsight {
  id: string;
  category: string;
  subcategory: string;
  severity: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  data?: any;
  score: number;
}

interface InsightBannerProps {
  context: string;
  platform?: string;
  driverId?: string;
  maxInsights?: number;
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-50 border-red-200 text-red-800",
  WARNING: "bg-amber-50 border-amber-200 text-amber-800",
  OPPORTUNITY: "bg-blue-50 border-blue-200 text-blue-800",
  INFO: "bg-gray-50 border-gray-200 text-gray-700",
};

const CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  REVENUE: TrendingUp,
  WORKFORCE: Users,
  FINANCIAL: DollarSign,
  COMPLIANCE: Shield,
  COACHING: GraduationCap,
  EFFICIENCY: Zap,
};

export default function InsightBanner({ context, platform, driverId, maxInsights = 3 }: InsightBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = new URLSearchParams({ context, limit: String(maxInsights + 5) });
  if (platform) params.set("platform", platform);
  if (driverId) params.set("driverId", driverId);

  const { data, loading } = useApiGet<{ insights: AiInsight[] }>(
    `/api/ai-insights/contextual?${params}`
  );

  const insights = (data?.insights ?? []).filter((i) => !dismissed.has(i.id)).slice(0, maxInsights);

  const handleDismiss = useCallback(async (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await api.post(`/api/ai-insights/${id}/dismiss`);
    } catch { /* swallow */ }
  }, []);

  const handleFeedback = useCallback(async (id: string, useful: boolean) => {
    try {
      await api.post(`/api/ai-insights/${id}/feedback?useful=${useful}`);
    } catch { /* swallow */ }
  }, []);

  if (loading || insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => {
        const Icon = CATEGORY_ICONS[insight.category] ?? Lightbulb;
        const isExpanded = expanded === insight.id;
        const styles = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.INFO;

        return (
          <div
            key={insight.id}
            className={cn("border rounded-xl transition-all", styles)}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5">
                <Icon size={16} className="opacity-70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase opacity-60">{insight.category}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    insight.severity === "CRITICAL" ? "bg-red-200/50" :
                    insight.severity === "WARNING" ? "bg-amber-200/50" :
                    insight.severity === "OPPORTUNITY" ? "bg-blue-200/50" :
                    "bg-gray-200/50"
                  )}>
                    {insight.severity}
                  </span>
                </div>
                <p className="text-sm font-medium mt-0.5">{insight.title}</p>
                {isExpanded && (
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">{insight.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {insight.actionHref && (
                  <a
                    href={insight.actionHref}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/60 hover:bg-white transition-colors flex items-center gap-1"
                  >
                    {insight.actionLabel ?? "View"}
                    <ExternalLink size={10} />
                  </a>
                )}
                <button
                  onClick={() => setExpanded(isExpanded ? null : insight.id)}
                  className="p-1 rounded-lg hover:bg-white/40 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  onClick={() => handleDismiss(insight.id)}
                  className="p-1 rounded-lg hover:bg-white/40 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Feedback row */}
            {isExpanded && (
              <div className="flex items-center gap-2 px-4 pb-3 pt-0">
                <span className="text-[10px] opacity-50">Was this helpful?</span>
                <button
                  onClick={() => handleFeedback(insight.id, true)}
                  className="p-1 rounded hover:bg-white/40 transition-colors"
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => handleFeedback(insight.id, false)}
                  className="p-1 rounded hover:bg-white/40 transition-colors"
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
