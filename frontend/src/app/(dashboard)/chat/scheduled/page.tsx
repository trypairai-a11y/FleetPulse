// Phase 4 Wave 5 — /chat/scheduled page route.
// Renders the ScheduledBriefingsList with React Query data; the form
// hits POST /api/scheduled-briefings on submit.
import { ScheduledBriefingsList } from "@/components/scheduled-jobs/ScheduledBriefingsList";

export default function ScheduledBriefingsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <ScheduledBriefingsList />
    </main>
  );
}
