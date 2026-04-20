"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeviceMapEntry {
  id: string;
  driverName: string;
  platform: string;
  lat: number;
  lng: number;
  speed?: number;
  status: string;
  lastSeen: string;
}

interface LeafletMapProps {
  drivers: DeviceMapEntry[];
  activeFilters: Set<string>;
}

const PLATFORM_COLORS: Record<string, string> = {
  KEETA: "#FFB800",
  TALABAT: "#FF5A00",
  DELIVEROO: "#00CCBC",
  AMERICANA: "#0066FF",
};

function createMarkerIcon(platform: string, selected: boolean) {
  const color = PLATFORM_COLORS[platform] || "#6b7280";
  const size = selected ? 16 : 12;
  const border = selected ? 3 : 2;
  return L.divIcon({
    className: "leaflet-driver-marker",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:${border}px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
      ${selected ? "transform:scale(1.3);" : ""}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LeafletMap({ drivers, activeFilters }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = drivers.filter(
    (d) => activeFilters.size === 0 || activeFilters.has(d.platform),
  );

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [29.38, 47.99], // Kuwait City
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add attribution in bottom-right
    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>')
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when drivers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(visible.map((d) => d.id));
    const existingMarkers = markersRef.current;

    // Remove markers for drivers no longer visible
    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        existingMarkers.delete(id);
      }
    });

    // Add or update markers
    for (const driver of visible) {
      const isSelected = driver.id === selectedId;
      const icon = createMarkerIcon(driver.platform, isSelected);

      if (existingMarkers.has(driver.id)) {
        const marker = existingMarkers.get(driver.id)!;
        marker.setLatLng([driver.lat, driver.lng]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([driver.lat, driver.lng], { icon })
          .addTo(map);

        const color = PLATFORM_COLORS[driver.platform] || "#6b7280";
        const lastSeen = new Date(driver.lastSeen);
        const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60_000);
        const timeStr = minutesAgo < 1 ? "Just now" : `${minutesAgo}m ago`;

        marker.bindPopup(`
          <div style="min-width:180px;font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
              <div>
                <div style="font-weight:600;font-size:13px;">${driver.driverName}</div>
                <div style="font-size:11px;color:${color};font-weight:500;">${driver.platform}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <div style="background:#f9fafb;border-radius:8px;padding:6px 8px;">
                <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:500;">Status</div>
                <div style="font-size:11px;font-weight:600;margin-top:2px;">${driver.status}</div>
              </div>
              ${driver.speed !== undefined ? `
              <div style="background:#f9fafb;border-radius:8px;padding:6px 8px;">
                <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:500;">Speed</div>
                <div style="font-size:11px;font-weight:600;margin-top:2px;">${driver.speed} km/h</div>
              </div>` : ""}
              <div style="background:#f9fafb;border-radius:8px;padding:6px 8px;${driver.speed === undefined ? "grid-column:span 2;" : "grid-column:span 2;"}">
                <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:500;">Last seen</div>
                <div style="font-size:11px;font-weight:600;margin-top:2px;">${timeStr}</div>
              </div>
            </div>
          </div>
        `, { className: "leaflet-driver-popup", closeButton: true, maxWidth: 250 });

        marker.on("click", () => setSelectedId(driver.id));
        existingMarkers.set(driver.id, marker);
      }
    }

    // Fit bounds if we have drivers
    if (visible.length > 0) {
      const bounds = L.latLngBounds(visible.map((d) => [d.lat, d.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [visible, selectedId]);

  return (
    <div ref={mapContainerRef} className="w-full h-full rounded-2xl" />
  );
}
