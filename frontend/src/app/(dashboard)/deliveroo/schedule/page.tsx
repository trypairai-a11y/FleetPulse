"use client";

import Link from "next/link";
import { Calendar, Users, History, ArrowRight } from "lucide-react";

export default function DeliverooSchedulePage() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-deliveroo" />
        <h1 className="text-xl font-semibold">Deliveroo</h1>
        <span className="text-secondary/30 text-lg font-light">/</span>
        <span className="text-xl text-secondary font-medium">Schedule</span>
      </div>

      <p className="max-w-2xl text-sm text-secondary">
        Deliveroo Schedule merges planning and live roster into a single page. The
        unified layout (today&rsquo;s roster, week view, attendance history) ships in
        v0.2. Until then use the existing pages below.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/deliveroo/shifts"
          className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-5 hover:border-deliveroo/40 hover:bg-deliveroo/5"
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-secondary">
              <Calendar size={14} /> Shifts
            </div>
            <div className="text-base font-semibold">Week plan + drag-and-drop</div>
            <div className="mt-1 text-xs text-secondary">
              Book riders to zone / shift slots.
            </div>
          </div>
          <ArrowRight size={16} className="text-secondary" />
        </Link>

        <Link
          href="/deliveroo/attendance"
          className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-5 hover:border-deliveroo/40 hover:bg-deliveroo/5"
        >
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-secondary">
              <History size={14} /> Attendance history
            </div>
            <div className="text-base font-semibold">Last 30 days</div>
            <div className="mt-1 text-xs text-secondary">
              Who showed up, who clocked out early, punctuality per rider.
            </div>
          </div>
          <ArrowRight size={16} className="text-secondary" />
        </Link>
      </div>
    </div>
  );
}
