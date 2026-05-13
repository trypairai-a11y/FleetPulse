// Phase 4 Wave 3 — Leaflet sub-renderer (lazy-loaded, client-only).
"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { MiniMapSpec } from "@/types/views";
import "leaflet/dist/leaflet.css";

function resolveCenter(spec: MiniMapSpec): [number, number] {
  if (Array.isArray(spec.center) && spec.center.length === 2) {
    return [spec.center[0], spec.center[1]];
  }
  // Loose support for object-shaped centers in fixtures.
  const c = spec.center as unknown as { lat?: number; lng?: number } | undefined;
  if (c && typeof c.lat === "number" && typeof c.lng === "number") {
    return [c.lat, c.lng];
  }
  if (spec.markers?.[0]) return [spec.markers[0].lat, spec.markers[0].lng];
  return [29.3759, 47.9774]; // Kuwait City fallback
}

export function MiniMapLeaflet({ spec }: { spec: MiniMapSpec }) {
  const center = resolveCenter(spec);
  const zoom = spec.zoom ?? 12;
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "200px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {(spec.markers ?? []).map((m, i) => (
        <Marker key={m.id ?? `${m.lat}-${m.lng}-${i}`} position={[m.lat, m.lng]}>
          {m.label && <Popup>{m.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MiniMapLeaflet;
