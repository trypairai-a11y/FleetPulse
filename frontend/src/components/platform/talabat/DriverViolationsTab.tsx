"use client";
import React, { useState } from "react";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import {
  Filter, X, Search, Ban, Plus, Trash2, CheckCircle2,
} from "lucide-react";

interface DriverViolationsTabProps {
  violations: any[];
  restrictions: any[];
  driverId: string;
  refetchRestrictions: () => void;
}

export default function DriverViolationsTab({
  violations,
  restrictions,
  driverId,
  refetchRestrictions,
}: DriverViolationsTabProps) {
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>("ALL");
  const [violationSearch, setViolationSearch] = useState<string>("");
  const [showAddRestriction, setShowAddRestriction] = useState(false);
  const [restrictionForm, setRestrictionForm] = useState({ type: "TEMPORARY", startDate: "", endDate: "", reason: "" });
  const [restrictionSaving, setRestrictionSaving] = useState(false);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);

  const uniqueTypes = Array.from(new Set(violations.map((v: any) => v.type).filter(Boolean))) as string[];

  const filteredViolations = violations.filter((evt: any) => {
    if (violationTypeFilter !== "ALL" && evt.type !== violationTypeFilter) return false;
    if (violationSearch) {
      const q = violationSearch.toLowerCase();
      const matchDesc = (evt.description || "").toLowerCase().includes(q);
      const matchType = (evt.type || "").replace(/_/g, " ").toLowerCase().includes(q);
      if (!matchDesc && !matchType) return false;
    }
    return true;
  });

  const hasActiveViolationFilters = violationTypeFilter !== "ALL" || violationSearch !== "";

  return (
    <>
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-secondary">
          <Filter size={14} />
          <span className="font-medium">Filter</span>
        </div>

        {/* Type filter */}
        <select
          value={violationTypeFilter}
          onChange={(e) => setViolationTypeFilter(e.target.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors appearance-none cursor-pointer pr-7",
            violationTypeFilter !== "ALL" ? "border-orange-300 text-orange-600" : "border-gray-200 text-foreground"
          )}
        >
          <option value="ALL">All Types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search violations..."
            value={violationSearch}
            onChange={(e) => setViolationSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-orange-200 w-48"
          />
        </div>

        {/* Clear filters */}
        {hasActiveViolationFilters && (
          <button
            onClick={() => { setViolationTypeFilter("ALL"); setViolationSearch(""); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}

        {/* Result count */}
        {hasActiveViolationFilters && (
          <span className="text-xs text-secondary ml-auto">
            {filteredViolations.length} of {violations.length} violations
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date / Time</th>
                <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-sm text-secondary">
                    {hasActiveViolationFilters ? "No violations match your filters" : "No violations"}
                  </td>
                </tr>
              ) : (
                filteredViolations.map((evt: any, i: number) => (
                  <tr key={evt.id} className={cn(
                    "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                    i % 2 === 1 && "bg-gray-50/30"
                  )}>
                    <td className="px-5 py-2.5 text-sm font-mono">
                      <span className="font-medium">
                        {evt.createdAt ? new Date(evt.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "-"}
                      </span>
                      {evt.createdAt && (
                        <span className="text-xs text-secondary ml-1.5">
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                        "bg-red-50 text-red-600": evt.type === "SELFIE_FAIL",
                        "bg-amber-50 text-amber-600": evt.type === "GPS_OFF",
                        "bg-blue-50 text-blue-600": evt.type === "EQUIPMENT_MISSING",
                        "bg-purple-50 text-purple-600": evt.type === "SHIFT_NOT_BOOKED",
                        "bg-cyan-50 text-cyan-600": evt.type === "ORDER_CLICK_THROUGH",
                        "bg-orange-50 text-orange-600": evt.type === "LATE_CLOCK_IN" || evt.type === "EARLY_CLOCK_OUT",
                        "bg-pink-50 text-pink-600": evt.type === "ZONE_MISMATCH",
                        "bg-gray-100 text-gray-500": !["SELFIE_FAIL", "GPS_OFF", "EQUIPMENT_MISSING", "SHIFT_NOT_BOOKED", "ORDER_CLICK_THROUGH", "LATE_CLOCK_IN", "EARLY_CLOCK_OUT", "ZONE_MISMATCH"].includes(evt.type),
                      })}>
                        {(evt.type || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-sm text-secondary max-w-xs truncate">{evt.description || (<span className="text-gray-300">-</span>)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Restrictions sub-section — rendered by the parent when tab === "restrictions" */
/* ──────────────────────────────────────────────────────────────────────────── */

interface DriverRestrictionsTabProps {
  restrictions: any[];
  driverId: string;
  refetchRestrictions: () => void;
}

export function DriverRestrictionsTab({
  restrictions,
  driverId,
  refetchRestrictions,
}: DriverRestrictionsTabProps) {
  const [showAddRestriction, setShowAddRestriction] = useState(false);
  const [restrictionForm, setRestrictionForm] = useState({ type: "TEMPORARY", startDate: "", endDate: "", reason: "" });
  const [restrictionSaving, setRestrictionSaving] = useState(false);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wide">Restriction History</h3>
        <button
          onClick={() => { setShowAddRestriction(true); setRestrictionError(null); setRestrictionForm({ type: "TEMPORARY", startDate: "", endDate: "", reason: "" }); }}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors"
        >
          <Ban size={14} /> Add Restriction
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Start</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">End</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Reason</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Processed</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {restrictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-secondary">
                  No restrictions on record
                </td>
              </tr>
            ) : (
              restrictions.map((r: any, i: number) => (
                <tr key={r.id} className={cn(
                  "border-b border-gray-50 last:border-0",
                  i % 2 === 1 && "bg-gray-50/30"
                )}>
                  <td className="px-5 py-3">
                    <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", {
                      "bg-amber-50 text-amber-700": r.type === "TEMPORARY",
                      "bg-red-100 text-red-700": r.type === "PERMANENT",
                    })}>
                      {r.type === "PERMANENT" ? "Permanent" : "Temporary"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-mono">
                    {new Date(r.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-secondary">
                    {r.endDate
                      ? new Date(r.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                      : <span className="text-red-500 font-medium">{"\u221E"}</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-secondary max-w-xs truncate">
                    {r.reason || <span className="text-gray-300">{"\u2014"}</span>}
                  </td>
                  <td className="px-5 py-3">
                    {r.processedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 size={12} /> Auto-processed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={async () => {
                        if (!confirm("Lift this restriction and restore driver to ACTIVE?")) return;
                        await api.delete(`/api/driver-restrictions/${r.id}`);
                        refetchRestrictions();
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Lift restriction"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Restriction Modal */}
      {showAddRestriction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-amber-600" />
                <h2 className="text-base font-semibold">Add Restriction</h2>
              </div>
              <button onClick={() => setShowAddRestriction(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">Type</label>
                <div className="flex gap-2 mt-1.5">
                  {[{ v: "TEMPORARY", label: "Temporary (date range)" }, { v: "PERMANENT", label: "Permanent" }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setRestrictionForm(f => ({ ...f, type: v }))}
                      className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-xl border transition-colors",
                        restrictionForm.type === v
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-secondary hover:border-gray-300"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={restrictionForm.startDate}
                  onChange={e => setRestrictionForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* End Date (temporary only) */}
              {restrictionForm.type === "TEMPORARY" && (
                <div>
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">End Date</label>
                  <input
                    type="date"
                    value={restrictionForm.endDate}
                    min={restrictionForm.startDate}
                    onChange={e => setRestrictionForm(f => ({ ...f, endDate: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-xs font-medium text-secondary uppercase tracking-wide">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Talabat platform restriction"
                  value={restrictionForm.reason}
                  onChange={e => setRestrictionForm(f => ({ ...f, reason: e.target.value }))}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {restrictionError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{restrictionError}</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAddRestriction(false)}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={restrictionSaving || !restrictionForm.startDate || (restrictionForm.type === "TEMPORARY" && !restrictionForm.endDate)}
                onClick={async () => {
                  setRestrictionSaving(true);
                  setRestrictionError(null);
                  try {
                    await api.post("/api/driver-restrictions", {
                      driverId,
                      type: restrictionForm.type,
                      startDate: restrictionForm.startDate,
                      endDate: restrictionForm.type === "TEMPORARY" ? restrictionForm.endDate : undefined,
                      reason: restrictionForm.reason || undefined,
                    });
                    setShowAddRestriction(false);
                    refetchRestrictions();
                  } catch (err: any) {
                    setRestrictionError(err.response?.data?.error || "Failed to save restriction");
                  } finally {
                    setRestrictionSaving(false);
                  }
                }}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {restrictionSaving ? "Saving..." : "Confirm Restriction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
