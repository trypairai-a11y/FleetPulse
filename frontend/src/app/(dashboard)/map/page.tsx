"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { MapPin, RefreshCw, Wifi, WifiOff } from "lucide-react";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

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

type MapApiResponse = DeviceMapEntry[];

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: "KEETA",      label: "Keeta",      hex: "#FFB800" },
  { key: "TALABAT",    label: "Talabat",    hex: "#FF5A00" },
  { key: "DELIVEROO",  label: "Deliveroo",  hex: "#00CCBC" },
  { key: "AMERICANA",  label: "Americana",  hex: "#0066FF" },
] as const;

type PlatformKey = (typeof PLATFORMS)[number]["key"];

function platformHex(platform: string): string {
  return PLATFORMS.find((p) => p.key === platform)?.hex ?? "#6b7280";
}

// ─── Marker dot (SVG canvas fallback) ────────────────────────────────────────

function DriverMarker({
  driver,
  onClick,
  selected,
}: {
  driver: DeviceMapEntry;
  onClick: () => void;
  selected: boolean;
}) {
  const color = platformHex(driver.platform);
  return (
    <button
      onClick={onClick}
      title={driver.driverName}
      style={{ color }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group focus:outline-none",
      )}
    >
      <span
        className={cn(
          "block rounded-full border-2 border-white shadow-md transition-transform duration-150",
          selected ? "w-5 h-5 scale-125" : "w-4 h-4 group-hover:scale-110",
        )}
        style={{ backgroundColor: color }}
      />
      <span
        className={cn(
          "text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-md bg-white shadow-sm border border-gray-100 whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          selected && "opacity-100",
        )}
        style={{ color }}
      >
        {driver.driverName.split(" ")[0]}
      </span>
    </button>
  );
}

// ─── Info popup ───────────────────────────────────────────────────────────────

function DriverPopup({
  driver,
  onClose,
}: {
  driver: DeviceMapEntry;
  onClose: () => void;
}) {
  const color = platformHex(driver.platform);
  const lastSeen = new Date(driver.lastSeen);
  const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60_000);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          />
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {driver.driverName}
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color }}>
              {driver.platform}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Status</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">
            {driver.status.toLowerCase()}
          </p>
        </div>
        {driver.speed !== undefined && (
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Speed</p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5">{driver.speed} km/h</p>
          </div>
        )}
        <div className="bg-gray-50 rounded-xl px-3 py-2 col-span-2">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Last seen</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5">
            {minutesAgo < 1 ? "Just now" : `${minutesAgo}m ago`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Placeholder map canvas ───────────────────────────────────────────────────

function MapPlaceholder({ drivers, activeFilters }: { drivers: DeviceMapEntry[]; activeFilters: Set<PlatformKey> }) {
  const [selected, setSelected] = useState<DeviceMapEntry | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visible = drivers.filter(
    (d) => activeFilters.size === 0 || activeFilters.has(d.platform as PlatformKey),
  );

  // Normalise lat/lng to % positions within the bounding box (with padding)
  const lats = visible.map((d) => d.lat);
  const lngs = visible.map((d) => d.lng);
  const minLat = Math.min(...lats, 29.3);
  const maxLat = Math.max(...lats, 29.5);
  const minLng = Math.min(...lngs, 47.9);
  const maxLng = Math.max(...lngs, 48.1);
  const pad = 0.1;

  function toPercent(driver: DeviceMapEntry) {
    const latRange = maxLat - minLat + pad * 2;
    const lngRange = maxLng - minLng + pad * 2;
    const x = ((driver.lng - minLng + pad) / lngRange) * 100;
    const y = (1 - (driver.lat - minLat + pad) / latRange) * 100;
    return { x, y };
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #e8edf2 0%, #dde4ec 40%, #d4dce8 100%)",
      }}
    >
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Road-like blobs */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-0 right-0 h-3 bg-gray-500 rounded-full" />
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-500 rounded-full" />
        <div className="absolute top-3/4 left-0 right-0 h-3 bg-gray-500 rounded-full" />
        <div className="absolute left-1/4 top-0 bottom-0 w-2 bg-gray-500 rounded-full" />
        <div className="absolute left-1/2 top-0 bottom-0 w-3 bg-gray-500 rounded-full" />
        <div className="absolute left-3/4 top-0 bottom-0 w-2 bg-gray-500 rounded-full" />
      </div>

      {/* No-API-key notice */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none z-0">
        <MapPin size={36} className="mx-auto text-gray-300 mb-2" />
        <p className="text-xs text-gray-400 font-medium max-w-[200px] leading-relaxed">
          Configure{" "}
          <span className="font-mono bg-gray-200 px-1 rounded text-gray-500">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </span>{" "}
          to enable map
        </p>
      </div>

      {/* Driver markers */}
      {visible.map((driver) => {
        const { x, y } = toPercent(driver);
        return (
          <div
            key={driver.id}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute"
          >
            <DriverMarker
              driver={driver}
              selected={selected?.id === driver.id}
              onClick={() => setSelected(selected?.id === driver.id ? null : driver)}
            />
          </div>
        );
      })}

      {/* Selected driver popup */}
      {selected && (
        <DriverPopup driver={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { data, loading, error, refetch } = useApiGet<MapApiResponse>("/api/devices/map");
  const [activeFilters, setActiveFilters] = useState<Set<PlatformKey>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refetch]);

  const rawDevices = Array.isArray(data) ? data : [];
  const drivers: DeviceMapEntry[] = rawDevices.map((d: any) => ({
    id: d.id,
    driverName: d.driver?.name || "Unknown",
    platform: d.driver?.platform || "KEETA",
    lat: parseFloat(d.lastLatitude) || 29.38,
    lng: parseFloat(d.lastLongitude) || 47.99,
    speed: undefined,
    status: d.driver?.status || "ACTIVE",
    lastSeen: d.lastSeen || new Date().toISOString(),
  }));

  function toggleFilter(key: PlatformKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const visibleCount =
    activeFilters.size === 0
      ? drivers.length
      : drivers.filter((d) => activeFilters.has(d.platform as PlatformKey)).length;

  return (
    <div className="relative -m-8 h-[calc(100vh-64px)] flex flex-col">
      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        {loading && drivers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Loading map data…</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-xs">
              <WifiOff size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">Unable to load map</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <LeafletMap drivers={drivers} activeFilters={activeFilters} />
        )}

        {/* ── Floating top-right controls ── */}
        <div className="absolute top-5 right-5 z-10 flex flex-col items-end gap-3">
          {/* Platform filter chips */}
          <div className="flex flex-wrap justify-end gap-2 max-w-xs">
            {PLATFORMS.map((p) => {
              const active = activeFilters.has(p.key);
              const count = drivers.filter((d) => d.platform === p.key).length;
              return (
                <button
                  key={p.key}
                  onClick={() => toggleFilter(p.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                    "shadow-sm border transition-all duration-150 focus:outline-none",
                    active
                      ? "text-white border-transparent shadow-md scale-105"
                      : "bg-white/90 backdrop-blur-sm border-gray-100 text-gray-700 hover:border-gray-200",
                  )}
                  style={active ? { backgroundColor: p.hex, borderColor: p.hex } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: active ? "rgba(255,255,255,0.8)" : p.hex }}
                  />
                  {p.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-bold ml-0.5",
                        active ? "text-white/80" : "text-gray-400",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Auto-refresh + driver count pill */}
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors",
                autoRefresh ? "text-green-600" : "text-gray-400",
              )}
              title={autoRefresh ? "Auto-refresh on (30s)" : "Auto-refresh off"}
            >
              {autoRefresh ? <Wifi size={12} /> : <WifiOff size={12} />}
              Live
            </button>
            <span className="text-gray-200 select-none">|</span>
            <span className="text-xs font-semibold text-gray-700">
              {visibleCount}
              <span className="text-gray-400 font-normal"> driver{visibleCount !== 1 ? "s" : ""}</span>
            </span>
            <button
              onClick={refetch}
              className={cn(
                "ml-0.5 text-gray-400 hover:text-gray-600 transition-colors",
                loading && "animate-spin text-blue-500",
              )}
              title="Refresh now"
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </div>

        {/* ── Platform legend (bottom-left) ── */}
        <div className="absolute bottom-5 left-5 z-10 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Platforms</p>
          {PLATFORMS.map((p) => {
            const count = drivers.filter((d) => d.platform === p.key).length;
            return (
              <div key={p.key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.hex }} />
                <span className="text-xs text-gray-700 font-medium w-20">{p.label}</span>
                <span className="text-xs text-gray-400 font-semibold tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
