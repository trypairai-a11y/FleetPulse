"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import type { InsightsOverview } from "./types";

interface Props {
  overview: InsightsOverview;
}

export default function OverviewCards({ overview }: Props) {
  const {
    ordersToday,
    ordersVsYesterday,
    ordersSuggestion,
    ordersStatus,
    cashUncollected,
    cashSuggestion,
    cashStatus,
    topSuggestion,
    topSuggestionHref,
  } = overview;

  const deltaSign = ordersVsYesterday > 0 ? "+" : "";

  const DeltaIcon =
    ordersVsYesterday > 0 ? TrendingUp : ordersVsYesterday < 0 ? TrendingDown : Minus;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Orders today */}
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 flex flex-col gap-3 shadow-sm",
          ordersStatus === "red"
            ? "border-red-200"
            : ordersStatus === "green"
            ? "border-green-200"
            : "border-gray-100"
        )}
      >
        <p className="text-xs font-medium text-secondary uppercase tracking-wider">
          Orders today
        </p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-foreground tabular-nums leading-none">
            {ordersToday.toLocaleString()}
          </span>
          {ordersVsYesterday !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-1",
                ordersVsYesterday > 0
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              )}
            >
              <DeltaIcon size={11} />
              {deltaSign}
              {ordersVsYesterday}
            </span>
          )}
        </div>
        <p className="text-sm text-secondary leading-snug">{ordersSuggestion}</p>
      </div>

      {/* Cash uncollected */}
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 flex flex-col gap-3 shadow-sm",
          cashStatus === "red"
            ? "border-red-200"
            : cashStatus === "green"
            ? "border-green-200"
            : "border-gray-100"
        )}
      >
        <p className="text-xs font-medium text-secondary uppercase tracking-wider">
          Cash uncollected
        </p>
        <div className="flex items-end gap-2">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums leading-none",
              cashStatus === "red"
                ? "text-red-600"
                : cashStatus === "green"
                ? "text-green-600"
                : "text-foreground"
            )}
          >
            {cashUncollected.toFixed(3)}
          </span>
          <span className="text-base text-secondary mb-0.5">KD</span>
        </div>
        <p className="text-sm text-secondary leading-snug">{cashSuggestion}</p>
      </div>

      {/* Most important action */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col gap-3 shadow-sm">
        <p className="text-xs font-medium text-secondary uppercase tracking-wider">
          Most important action
        </p>
        <p className="text-base font-semibold text-foreground leading-snug flex-1">
          {topSuggestion}
        </p>
        <Link
          href={topSuggestionHref}
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Go there <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
