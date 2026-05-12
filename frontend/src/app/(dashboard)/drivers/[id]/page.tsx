"use client";

// Phase 3 Wave 2 — canonical Driver File page.
// 8 section anchors per CON-driver-file-sections.
// Section content stubs are wired in Wave 3.

import { useParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";
import type { DriverFileData } from "@/types/driver-file";

const SECTION_IDS = [
  { id: "profile", label: "Profile" },
  { id: "score", label: "Score" },
  { id: "trend", label: "90-day trend" },
  { id: "shifts", label: "Recent shifts" },
  { id: "orders", label: "Recent orders" },
  { id: "violations", label: "Violations" },
  { id: "cash", label: "Cash" },
  { id: "notes", label: "Agent notes" },
] as const;

function DriverFileSkeleton() {
  return (
    <div data-testid="driver-file-skeleton" className="p-8 animate-pulse">
      <div className="h-8 w-1/3 bg-sand-200 rounded mb-4" />
      <div className="h-32 bg-sand-100 rounded mb-4" />
      <div className="h-32 bg-sand-100 rounded mb-4" />
    </div>
  );
}

function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      {message ? <p className="text-sand-700">{message}</p> : null}
    </div>
  );
}

export default function DriverFilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const url = id ? `/api/drivers/${id}/file` : null;
  const { data, isLoading, error } = useApiQuery<DriverFileData>(
    ["driver-file", id ?? ""],
    url,
  );

  if (isLoading) return <DriverFileSkeleton />;
  if (error && (error as any).status === 404) {
    return <ErrorState title="Driver not found" />;
  }
  if (error || !data) {
    return <ErrorState title="Unable to load Driver File" message={(error as any)?.message} />;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{data.profile.name}</h1>
        <p className="text-sm text-sand-700">
          {data.profile.platform} · {data.profile.vehicleType} · {data.profile.status}
        </p>
      </header>

      <nav className="mb-6 flex gap-3 text-sm overflow-x-auto pb-2 border-b border-sand-200">
        {SECTION_IDS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-sand-700 hover:text-primary whitespace-nowrap">
            {s.label}
          </a>
        ))}
      </nav>

      {SECTION_IDS.map((s) => (
        <section key={s.id} id={s.id} role="region" aria-label={s.label} className="mb-8 scroll-mt-24">
          <h2 className="text-lg font-medium mb-3">{s.label}</h2>
          <div className="bg-white rounded-lg border border-sand-200 p-4 text-sm text-sand-700">
            {renderSection(s.id, data)}
          </div>
        </section>
      ))}
    </div>
  );
}

function renderSection(id: string, d: DriverFileData) {
  switch (id) {
    case "profile": {
      const p = d.profile ?? ({} as any);
      return (
        <dl className="grid grid-cols-2 gap-2">
          <dt>Name</dt><dd>{p.name ?? "—"}</dd>
          <dt>Phone</dt><dd>{p.phone ?? "—"}</dd>
          <dt>Platform</dt><dd>{p.platform ?? "—"}</dd>
          <dt>Vehicle</dt><dd>{p.vehicleType ?? "—"}</dd>
          <dt>Status</dt><dd>{p.status ?? "—"}</dd>
          <dt>Civil ID</dt><dd>{p.civilIdStatus ?? "—"}</dd>
        </dl>
      );
    }
    case "score":
      if (!d.score) return <p>Score not yet available.</p>;
      return (
        <div>
          <div className="text-3xl font-semibold">{d.score.compositeScore} / 100</div>
          <p className="mt-2 text-sand-800">{d.scoreExplanation?.text ?? ""}</p>
        </div>
      );
    case "trend": {
      const snaps = d.snapshots90d ?? [];
      return snaps.length === 0 ? (
        <p>No 90-day trend yet</p>
      ) : (
        <p>{snaps.length} snapshots in last 90 days. Chart ships in Wave 3.</p>
      );
    }
    case "shifts": {
      const a = d.attendance ?? { last14Days: [], lateCount: 0, absentCount: 0 };
      return <p>{(a.last14Days ?? []).length} attendance records · {a.lateCount ?? 0} late · {a.absentCount ?? 0} absent.</p>;
    }
    case "orders":
      return <p>Recent orders surface ships with the per-platform OrderLog enricher (Wave 3).</p>;
    case "violations":
      return <p>{(d.violations?.items ?? []).length} violations on record.</p>;
    case "cash": {
      const c = d.cash ?? { outstanding: 0, records: [] };
      return <p>KD {Number(c.outstanding ?? 0).toFixed(3)} outstanding · {(c.records ?? []).length} records this month.</p>;
    }
    case "notes": {
      const n = d.agentNotes ?? { proposals: [], observations: [], audit: [] };
      const total = (n.proposals ?? []).length + (n.observations ?? []).length + (n.audit ?? []).length;
      return total === 0 ? (
        <p>Darb hasn't proposed anything for this driver yet.</p>
      ) : (
        <p>{(n.proposals ?? []).length} proposals · {(n.observations ?? []).length} observations · {(n.audit ?? []).length} audit entries.</p>
      );
    }
    default:
      return null;
  }
}
