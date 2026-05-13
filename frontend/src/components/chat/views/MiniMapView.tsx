// Phase 4 Wave 3 — mini_map viewBlock (UI-SPEC §3.2.4 variant 5).
// React Leaflet is SSR-unfriendly so we lazy-load via next/dynamic. The
// fallback DOM keeps marker labels accessible in jsdom (tests rely on
// querying marker labels in plain text).
"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { MiniMapSpec } from "@/types/views";

const LeafletMap = dynamic(() => import("./MiniMapLeaflet").then((m) => m.MiniMapLeaflet), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 w-full items-center justify-center rounded-lg bg-sand-50 text-xs text-secondary">
      Loading map…
    </div>
  ),
});

export function MiniMapView({ spec }: { spec: MiniMapSpec }) {
  const markers = useMemo(() => spec?.markers ?? [], [spec?.markers]);
  return (
    <div>
      {spec?.title && (
        <h3 className="mb-3 text-sm font-medium text-foreground">{spec.title}</h3>
      )}
      <div className="overflow-hidden rounded-lg ring-1 ring-sand-200">
        <LeafletMap spec={spec} />
      </div>
      {/* Accessible / jsdom-visible marker labels — also doubles as a legend. */}
      {markers.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] text-secondary">
          {markers.map((m, i) => (
            <li key={m.id ?? `${m.lat}-${m.lng}-${i}`} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: m.color ?? "#006838" }}
              />
              <span>{m.label ?? `Marker ${i + 1}`}</span>
              <span className="ml-1 text-[10px] text-sand-500">
                {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MiniMapView;
