"use client";
import { cn } from "@/lib/cn";
import { CheckCircle2, Clock, AlertCircle, XCircle, Circle } from "lucide-react";

export interface TimelineStep {
  id: string;
  action: string;
  description: string;
  operator?: string | null;
  operatorId?: string | null;
  timestamp: string;
  elapsedSeconds: number;
  elapsedFormatted: string;
  metadata?: any;
}

interface OrderTimelineProps {
  steps: TimelineStep[];
  /** Seconds before marking elapsed as amber (default 300 = 5min) */
  warnThreshold?: number;
  /** Seconds before marking elapsed as red (default 900 = 15min) */
  dangerThreshold?: number;
}

function getStepIcon(step: TimelineStep, isLast: boolean) {
  if (step.action.toLowerCase().includes("cancel")) {
    return <XCircle size={18} className="text-red-500" />;
  }
  if (isLast) {
    return <Circle size={18} className="text-blue-500" />;
  }
  return <CheckCircle2 size={18} className="text-green-500" />;
}

function getElapsedColor(seconds: number, warn: number, danger: number) {
  if (seconds >= danger) return "text-red-600 bg-red-50";
  if (seconds >= warn) return "text-amber-600 bg-amber-50";
  return "text-secondary bg-gray-50";
}

export default function OrderTimeline({
  steps,
  warnThreshold = 300,
  dangerThreshold = 900,
}: OrderTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-secondary">
        No order events recorded
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Visual Timeline */}
      <div className="relative">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Vertical line + icon */}
              <div className="flex flex-col items-center">
                <div className="z-10 bg-white">{getStepIcon(step, isLast)}</div>
                {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-1 -mt-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{step.description}</p>
                    {step.operator && (
                      <p className="text-xs text-secondary mt-0.5">{step.operator}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-secondary font-mono">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                    {i > 0 && step.elapsedSeconds > 0 && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-0.5 inline-block",
                        getElapsedColor(step.elapsedSeconds, warnThreshold, dangerThreshold)
                      )}>
                        +{step.elapsedFormatted}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operation Record Table */}
      <div className="mt-6">
        <h4 className="text-xs font-medium text-secondary uppercase mb-3">Operation Record</h4>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Action</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Content</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Operator</th>
                  <th className="text-left text-xs font-medium text-secondary px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => (
                  <tr key={step.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2 text-xs font-medium">{step.action}</td>
                    <td className="px-4 py-2 text-xs">{step.description}</td>
                    <td className="px-4 py-2 text-xs text-secondary">{step.operator || "—"}</td>
                    <td className="px-4 py-2 text-xs text-secondary font-mono">
                      {new Date(step.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
