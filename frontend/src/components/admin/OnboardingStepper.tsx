"use client";
// Phase 2 Wave 5 — 5-step horizontal stepper for /admin/onboarding.
//
// Visual: 5 pills connected by 1px sand lines. Each pill state:
//   future:    bg-sand-100 text-sand-500
//   current:   bg-primary text-white
//   completed: bg-primary/10 text-primary + Check icon
//
// Connecting line between pills inherits primary tint when both ends
// completed; sand-300 otherwise.

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperStep {
  key: string;
  label: string;
}

interface OnboardingStepperProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  steps: StepperStep[];
}

export function OnboardingStepper({
  currentStep,
  steps,
}: OnboardingStepperProps) {
  return (
    <ol
      role="list"
      aria-label="Onboarding progress"
      className="flex items-center gap-0 w-full max-w-2xl mx-auto mb-8"
    >
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;
        const showLine = idx < steps.length - 1;
        const lineActive = stepNum < currentStep;
        return (
          <li
            key={step.key}
            className={cn("flex items-center", showLine ? "flex-1" : "")}
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-200",
                  isCurrent && "bg-primary text-white shadow-sm ring-2 ring-primary/20",
                  isCompleted && "bg-primary/10 text-primary",
                  isFuture && "bg-sand-100 text-sand-500",
                )}
              >
                {isCompleted ? <Check size={14} aria-hidden="true" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isCurrent && "text-primary",
                  isCompleted && "text-sand-700",
                  isFuture && "text-sand-500",
                )}
              >
                {step.label}
              </span>
            </div>
            {showLine && (
              <div
                aria-hidden="true"
                className={cn(
                  "flex-1 h-px mx-2 -mt-4 transition-colors duration-200",
                  lineActive ? "bg-primary/40" : "bg-sand-300",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default OnboardingStepper;
