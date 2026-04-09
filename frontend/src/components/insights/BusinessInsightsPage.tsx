"use client";
import { useApiGet } from "@/hooks/useApi";
import { RefreshCw } from "lucide-react";
import type { InsightsPayload } from "./types";
import InsightsSkeleton from "./InsightsSkeleton";
import OverviewCards from "./OverviewCards";
import SuggestionList from "./SuggestionList";
import WeeklyChart from "./WeeklyChart";
import QuickWins from "./QuickWins";

export default function BusinessInsightsPage() {
  const { data, loading, error, refetch } = useApiGet<InsightsPayload>("/api/insights");

  const generatedAgo = data?.generatedAt
    ? Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 60000)
    : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-1 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insights</h1>
          <p className="text-sm text-secondary mt-0.5">
            What to focus on today — in plain English.
            {generatedAgo !== null && (
              <span className="ml-1">
                Updated {generatedAgo === 0 ? "just now" : `${generatedAgo}m ago`}
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
          Refresh
        </button>
      </div>

      {loading && <InsightsSkeleton />}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">Could not load insights</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
          <button onClick={refetch} className="mt-3 text-sm text-red-600 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <OverviewCards overview={data.overview} />
          <QuickWins wins={data.quickWins} />
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">What you should do</h2>
            <SuggestionList suggestions={data.suggestions} />
          </div>
          <WeeklyChart thisWeek={data.weeklyChart.thisWeek} lastWeek={data.weeklyChart.lastWeek} />
        </>
      )}
    </div>
  );
}
