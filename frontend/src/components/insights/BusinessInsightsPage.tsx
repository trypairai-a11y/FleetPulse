"use client";
import { useApiGet } from "@/hooks/useApi";
import { RefreshCw } from "lucide-react";
import type { InsightsPayload } from "./types";
import InsightsSkeleton from "./InsightsSkeleton";
import OverviewCards from "./OverviewCards";
import SuggestionList from "./SuggestionList";
import WeeklyChart from "./WeeklyChart";
import QuickWins from "./QuickWins";
import { useI18n } from "@/i18n/I18nProvider";

export default function BusinessInsightsPage() {
  const { t } = useI18n();
  const { data, loading, error, refetch } = useApiGet<InsightsPayload>("/api/insights");

  const generatedAgo = data?.generatedAt
    ? Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 60000)
    : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-1 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("insights.title")}</h1>
          <p className="text-sm text-secondary mt-0.5">
            {t("insights.focus")}
            {generatedAgo !== null && (
              <span className="ms-1">
                {generatedAgo === 0
                  ? t("insights.updatedJustNow")
                  : t("insights.updatedAgo").replace("{n}", String(generatedAgo))}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-foreground transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {t("common.refresh")}
        </button>
      </div>

      {loading && <InsightsSkeleton />}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">{t("insights.couldNotLoad")}</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
          <button onClick={refetch} className="mt-3 text-sm text-red-600 underline">
            {t("actions.tryAgain")}
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <OverviewCards overview={data.overview} />
          <QuickWins wins={data.quickWins} />
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">{t("insights.whatYouShouldDo")}</h2>
            <SuggestionList suggestions={data.suggestions} />
          </div>
          <WeeklyChart thisWeek={data.weeklyChart.thisWeek} lastWeek={data.weeklyChart.lastWeek} />
        </>
      )}
    </div>
  );
}
