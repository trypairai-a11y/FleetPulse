"use client";
import React from "react";
import { cn } from "@/lib/cn";
import { CheckCircle2, XCircle } from "lucide-react";

interface DriverSessionsTabProps {
  sessions: any[];
}

export default function DriverSessionsTab({ sessions }: DriverSessionsTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Zone</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Planned</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Actual</th>
              <th className="text-right text-xs font-semibold text-secondary px-5 py-3">Orders</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Face</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">In</th>
              <th className="text-left text-xs font-semibold text-secondary px-5 py-3">Out</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-secondary">
                  No working days found
                </td>
              </tr>
            ) : (
              sessions.map((s: any, i: number) => (
                <tr key={s.id} className={cn(
                  "border-b border-gray-50 last:border-0 hover:bg-blue-50/40 transition-colors",
                  i % 2 === 1 && "bg-gray-50/30"
                )}>
                  <td className="px-5 py-2.5 text-sm font-medium">
                    {s.plannedStart ? new Date(s.plannedStart).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-5 py-2.5 text-sm text-secondary">{s.zone || <span className="text-gray-300">-</span>}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-secondary">
                    {s.plannedStart
                      ? new Date(s.plannedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                    {s.plannedEnd
                      ? `\u2013${new Date(s.plannedEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </td>
                  <td className="px-5 py-2.5 text-sm font-mono">
                    {s.actualHours != null ? (
                      <span className="font-medium">{Number(s.actualHours).toFixed(1)}<span className="text-secondary text-xs">h</span></span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-sm text-right font-mono font-medium">
                    {s.deliveries != null ? s.deliveries : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    {s.faceVerified !== undefined ? (
                      s.faceVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
                          <CheckCircle2 size={11} /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600">
                          <XCircle size={11} /> Fail
                        </span>
                      )
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-sm font-mono text-secondary">
                    {s.actualStart
                      ? new Date(s.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-5 py-2.5 text-sm font-mono text-secondary">
                    {s.actualEnd
                      ? new Date(s.actualEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : <span className="text-gray-300">-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
