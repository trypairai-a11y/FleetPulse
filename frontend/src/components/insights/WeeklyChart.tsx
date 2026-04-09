"use client";
import type { DayBar } from "./types";

interface Props {
  thisWeek: DayBar[];
  lastWeek: DayBar[];
}

export default function WeeklyChart({ thisWeek, lastWeek }: Props) {
  const allValues = [...thisWeek, ...lastWeek].map((d) => d.orders);
  const maxOrders = Math.max(...allValues, 1);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-foreground">Weekly chart</h2>
        <div className="flex items-center gap-4 text-xs text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
            This week
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />
            Last week
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2 h-36">
        {thisWeek.map((bar, i) => {
          const lastBar = lastWeek[i];
          const thisH = Math.round((bar.orders / maxOrders) * 100);
          const lastH = lastBar ? Math.round((lastBar.orders / maxOrders) * 100) : 0;

          return (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end gap-0.5 h-28">
                <div
                  className="flex-1 bg-primary rounded-t-sm transition-all duration-500"
                  style={{ height: `${thisH}%`, minHeight: bar.orders > 0 ? "3px" : "0" }}
                  title={`${bar.label} this week: ${bar.orders}`}
                />
                <div
                  className="flex-1 bg-gray-200 rounded-t-sm transition-all duration-500"
                  style={{ height: `${lastH}%`, minHeight: lastBar && lastBar.orders > 0 ? "3px" : "0" }}
                  title={`${bar.label} last week: ${lastBar?.orders ?? 0}`}
                />
              </div>
              <span className="text-[11px] text-secondary font-medium">{bar.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-secondary mt-3 text-right tabular-nums">
        Peak: {maxOrders.toLocaleString()} orders
      </p>
    </div>
  );
}
