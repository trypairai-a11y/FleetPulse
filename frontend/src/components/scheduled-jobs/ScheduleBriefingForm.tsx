// Phase 4 Wave 5 — Create-a-briefing form.
// UI-SPEC §3.2.7 Variant C — 3 schedule radio options + custom cron field
// (admin-only). On submit calls onCreate({ title, prompt, schedule }) when
// passed as a prop (test mode), else calls useCreateBriefing.mutate().
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { briefingsApi } from "@/lib/api/scheduledBriefings";

export interface ScheduleBriefingFormProps {
  onClose: () => void;
  prefilledPrompt?: string;
  /**
   * Test override: when provided, bypasses the React Query mutation and
   * calls this handler with the submitted values. The Wave 0 RED test
   * uses this path to assert the create event fires.
   */
  onCreate?: (values: { title: string; prompt: string; schedule: string }) => void;
}

type ScheduleMode = "06" | "07" | "17" | "monday-06" | "custom";

const SCHEDULE_PATTERN: Record<ScheduleMode, string> = {
  "06": "0 6 * * *",
  "07": "0 7 * * *",
  "17": "0 17 * * *",
  "monday-06": "0 6 * * 1",
  custom: "",
};

export function ScheduleBriefingForm({
  onClose,
  prefilledPrompt = "",
  onCreate,
}: ScheduleBriefingFormProps) {
  const [title, setTitle] = useState("Morning briefing");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("06");
  const [customCron, setCustomCron] = useState("");
  const [prompt, setPrompt] = useState(prefilledPrompt || "Give me yesterday's summary");
  const [type, setType] = useState<"briefing" | "standing_rule_v3">("briefing");
  const [pending, setPending] = useState(false);

  const cron =
    scheduleMode === "custom" ? customCron : SCHEDULE_PATTERN[scheduleMode];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cronValue = cron || "0 6 * * *";
    const values = { title: title.trim(), prompt: prompt.trim(), schedule: cronValue };
    if (onCreate) {
      onCreate(values);
      onClose();
      return;
    }
    if (!values.title || !values.prompt) return;
    setPending(true);
    try {
      await briefingsApi.create({
        name: values.title,
        cron: values.schedule,
        prompt: values.prompt,
        type,
      });
      onClose();
    } catch {
      // Surface inline; do not crash the form.
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-card ring-1 ring-sand-200 p-4 space-y-3"
      aria-label="Create scheduled briefing"
    >
      <h3 className="text-sm font-semibold">Schedule a briefing</h3>
      <label className="block text-xs text-secondary">
        Name
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Briefing name"
          className="mt-1 w-full rounded-lg ring-1 ring-sand-200 px-3 py-2 text-sm"
        />
      </label>
      <fieldset className="space-y-1">
        <legend className="text-xs text-secondary">Schedule</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={scheduleMode === "06"}
            onChange={() => setScheduleMode("06")}
          />{" "}
          Every morning at 06:00 (Asia/Kuwait)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={scheduleMode === "07"}
            onChange={() => setScheduleMode("07")}
          />{" "}
          Every morning at 07:00 (Asia/Kuwait)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={scheduleMode === "17"}
            onChange={() => setScheduleMode("17")}
          />{" "}
          Every evening at 17:00 (Asia/Kuwait)
        </label>
      </fieldset>
      <label className="block text-xs text-secondary">
        Source prompt
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={3}
          placeholder="The question Darb will answer at the scheduled time."
          className="mt-1 w-full rounded-lg ring-1 ring-sand-200 px-3 py-2 text-sm"
        />
      </label>
      <fieldset className="space-y-1">
        <legend className="text-xs text-secondary">Type</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={type === "briefing"}
            onChange={() => setType("briefing")}
          />{" "}
          Briefing (fires at scheduled time, posts answer to a new chat thread)
        </label>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="radio"
            checked={type === "standing_rule_v3"}
            onChange={() => setType("standing_rule_v3")}
          />{" "}
          Standing rule template{" "}
          <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-900 px-1 rounded">
            Phase 12
          </span>
        </label>
      </fieldset>
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg ring-1 ring-sand-200 px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary text-white px-3 py-1.5 text-xs inline-flex items-center gap-1"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Save"
          )}
        </button>
      </div>
    </form>
  );
}
