"use client";
import { useEffect, useState } from "react";
import ShortlistView, { ShortlistItem } from "@/components/shared/ShortlistView";
import { MOCK_DISPATCH_GAPS } from "@/mocks/v2";

export default function DispatchPage() {
  const [gaps, setGaps] = useState<typeof MOCK_DISPATCH_GAPS>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setGaps(MOCK_DISPATCH_GAPS);
      setLoading(false);
    }, 300);
  }, []);

  const criticalOrWarning = gaps.filter((g) => g.severity !== "ok");

  const shortlistItems: ShortlistItem[] = criticalOrWarning.map((g) => ({
    id: g.id,
    badge: {
      label: g.severity === "critical" ? "SHORT" : "TIGHT",
      tone: g.severity === "critical" ? "critical" : "warning",
    },
    title: `${g.zone} · ${g.slot}`,
    description: `${g.assigned} of ${g.target} couriers assigned. ${g.severity === "critical" ? "Need " + (g.target - g.assigned) + " more now." : "Coverage tight — monitor."}`,
    meta: [{ label: `shortfall ${g.target - g.assigned}`, tone: g.severity === "critical" ? "critical" : "warning" }],
    primaryAction: { label: "Fill", onClick: () => {} },
    secondaryAction: { label: "Dismiss", onClick: () => {} },
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <ShortlistView
        title="Dispatch"
        subtitle="Coverage gaps ranked by peak-hour impact. Default view surfaces the gaps you need to fill now."
        items={shortlistItems}
        loading={loading}
        emptyHint="All zone/slot coverage is at or above target."
        browseContent={
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-left text-[11px] uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Zone</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium">{g.zone}</td>
                    <td className="px-4 py-3 text-secondary">{g.slot}</td>
                    <td className="px-4 py-3">{g.assigned}</td>
                    <td className="px-4 py-3">{g.target}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          g.severity === "critical"
                            ? "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                            : g.severity === "warning"
                            ? "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                            : "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        }
                      >
                        {g.severity.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
    </div>
  );
}
