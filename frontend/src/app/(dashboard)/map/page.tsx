"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useUIStore } from "@/stores/uiStore";
import { RefreshCw } from "lucide-react";
import api from "@/lib/api";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const MarkerClusterGroup = dynamic(
  () => import("@/lib/marker-cluster-group").then((m) => m.default),
  { ssr: false }
);

// ── Types ──
interface DriverLocation {
  driver_id: string;
  driver_name: string;
  driver_name_ar: string;
  platform: string;
  status: string;
  employee_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  bearing: number | null;
  vehicle_type: string;
  recorded_at: string;
  orders_today: number;
  shift_status: string;
}

interface AnimatedDriver extends DriverLocation {
  display_lat: number;
  display_lng: number;
  display_bearing: number;
}

// ── Constants ──
const KUWAIT_CENTER: [number, number] = [29.3340, 47.9700];

const PLATFORMS: Record<
  string,
  { color: string; dark: string; label: string }
> = {
  talabat: { color: "#F97316", dark: "#C2410C", label: "Talabat" },
  keeta: { color: "#EAB308", dark: "#A16207", label: "Keeta" },
  deliveroo: { color: "#14B8A6", dark: "#0F766E", label: "Deliveroo" },
  jahez: { color: "#E11D48", dark: "#9F1239", label: "Jahez" },
};

// ══════════════════════════════════════════════
// 3D isometric-style top-down SVG vehicles
// ══════════════════════════════════════════════

function carSvg(color: string, dark: string): string {
  return `<svg width="36" height="42" viewBox="0 0 52 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,0.18))">
  <ellipse cx="26" cy="56" rx="18" ry="3.5" fill="rgba(0,0,0,0.07)"/>
  <g>
    <!-- Body shell -->
    <rect x="12" y="4" width="28" height="46" rx="8" fill="${color}"/>
    <!-- Left panel (3D depth) -->
    <path d="M12 12 Q12 4 20 4 L20 4 L16 4 Q12 4 12 12 Z" fill="rgba(255,255,255,0.15)"/>
    <rect x="12" y="4" width="5" height="46" rx="2.5" fill="${dark}" opacity="0.22"/>
    <!-- Right panel (3D depth) -->
    <rect x="35" y="4" width="5" height="46" rx="2.5" fill="${dark}" opacity="0.22"/>
    <!-- Hood highlight -->
    <rect x="17" y="6" width="18" height="4" rx="2" fill="rgba(255,255,255,0.18)"/>
    <!-- Windshield -->
    <rect x="16" y="8" width="20" height="12" rx="5" fill="rgba(170,210,250,0.55)"/>
    <!-- Windshield glare -->
    <rect x="18" y="10" width="8" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
    <!-- Roof -->
    <rect x="17" y="22" width="18" height="10" rx="3" fill="rgba(255,255,255,0.06)"/>
    <!-- Sunroof hint -->
    <rect x="21" y="24" width="10" height="6" rx="2" fill="rgba(0,0,0,0.05)"/>
    <!-- Rear window -->
    <rect x="16" y="34" width="20" height="10" rx="5" fill="rgba(170,210,250,0.38)"/>
    <!-- Headlights -->
    <ellipse cx="17" cy="5.5" rx="2.5" ry="1.8" fill="rgba(255,255,220,0.95)"/>
    <ellipse cx="35" cy="5.5" rx="2.5" ry="1.8" fill="rgba(255,255,220,0.95)"/>
    <!-- DRL strips -->
    <rect x="14" y="7" width="3" height="1" rx="0.5" fill="rgba(255,255,255,0.5)"/>
    <rect x="35" y="7" width="3" height="1" rx="0.5" fill="rgba(255,255,255,0.5)"/>
    <!-- Tail lights -->
    <rect x="13.5" y="47" width="6" height="2.5" rx="1.2" fill="#EF4444" opacity="0.8"/>
    <rect x="32.5" y="47" width="6" height="2.5" rx="1.2" fill="#EF4444" opacity="0.8"/>
    <!-- Rear bumper line -->
    <rect x="20" y="48.5" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.2)"/>
    <!-- Side mirrors -->
    <ellipse cx="10" cy="14" rx="2.5" ry="1.5" fill="${dark}" opacity="0.6"/>
    <ellipse cx="42" cy="14" rx="2.5" ry="1.5" fill="${dark}" opacity="0.6"/>
  </g>
</svg>`;
}

function motoSvg(color: string, dark: string): string {
  return `<svg width="28" height="40" viewBox="0 0 40 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 5px rgba(0,0,0,0.16))">
  <ellipse cx="20" cy="54" rx="14" ry="3" fill="rgba(0,0,0,0.06)"/>
  <g>
    <!-- Front wheel -->
    <ellipse cx="20" cy="5.5" rx="8" ry="5" fill="#1F2937"/>
    <ellipse cx="20" cy="5.5" rx="6" ry="3.5" fill="#374151"/>
    <ellipse cx="20" cy="5.5" rx="3" ry="1.5" fill="#4B5563"/>
    <ellipse cx="20" cy="4.5" rx="1.5" ry="0.7" fill="#6B7280"/>
    <!-- Rear wheel -->
    <ellipse cx="20" cy="48.5" rx="8" ry="5" fill="#1F2937"/>
    <ellipse cx="20" cy="48.5" rx="6" ry="3.5" fill="#374151"/>
    <ellipse cx="20" cy="48.5" rx="3" ry="1.5" fill="#4B5563"/>
    <ellipse cx="20" cy="49.5" rx="1.5" ry="0.7" fill="#6B7280"/>
    <!-- Fork / front suspension -->
    <rect x="17" y="8" width="2.5" height="6" rx="1" fill="#6B7280"/>
    <rect x="20.5" y="8" width="2.5" height="6" rx="1" fill="#6B7280"/>
    <!-- Handlebars -->
    <rect x="5" y="7.5" width="30" height="4" rx="2" fill="#4B5563"/>
    <!-- Handlebar grips -->
    <rect x="3" y="7.5" width="5" height="4" rx="2" fill="#1F2937"/>
    <rect x="32" y="7.5" width="5" height="4" rx="2" fill="#1F2937"/>
    <!-- Brake levers -->
    <rect x="7" y="6" width="4" height="1.5" rx="0.75" fill="#9CA3AF"/>
    <rect x="29" y="6" width="4" height="1.5" rx="0.75" fill="#9CA3AF"/>
    <!-- Frame / body -->
    <rect x="14" y="12" width="12" height="32" rx="6" fill="${color}"/>
    <!-- Body highlight strip -->
    <rect x="15" y="14" width="4" height="12" rx="2" fill="rgba(255,255,255,0.15)"/>
    <!-- Fuel tank -->
    <ellipse cx="20" cy="17" rx="5.5" ry="3.5" fill="${dark}" opacity="0.3"/>
    <!-- Seat -->
    <ellipse cx="20" cy="24" rx="5.5" ry="5" fill="#1F2937" opacity="0.35"/>
    <!-- Delivery box -->
    <rect x="11" y="33" width="18" height="13" rx="4" fill="${dark}"/>
    <!-- Box branding lines -->
    <rect x="14.5" y="36" width="11" height="1.8" rx="0.9" fill="rgba(255,255,255,0.22)"/>
    <rect x="14.5" y="39.5" width="8" height="1.8" rx="0.9" fill="rgba(255,255,255,0.12)"/>
    <!-- Box latch -->
    <rect x="18" y="44" width="4" height="1.5" rx="0.75" fill="rgba(255,255,255,0.18)"/>
    <!-- Headlight -->
    <ellipse cx="20" cy="3" rx="2.5" ry="1.5" fill="rgba(255,255,220,0.95)"/>
    <!-- Tail light -->
    <rect x="16" cy="50" width="8" height="2" rx="1" y="49" fill="#EF4444" opacity="0.75"/>
    <!-- Exhaust -->
    <rect x="26" y="38" width="3" height="8" rx="1.5" fill="#6B7280" opacity="0.5"/>
  </g>
</svg>`;
}

// ── Helpers ──
function timeAgo(dateStr: string, isAr: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isAr ? "الآن" : "Just now";
  if (mins < 60) return isAr ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return isAr ? `منذ ${hours} س` : `${hours}h ago`;
}

function bearingToDir(b: number | null): string {
  if (b == null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(b / 45) % 8];
}

const SHIFT_STATUS_MAP: Record<string, { en: string; ar: string; color: string }> = {
  active: { en: "On Shift", ar: "في الوردية", color: "#059669" },
  scheduled: { en: "Scheduled", ar: "مجدول", color: "#2563EB" },
  off_duty: { en: "Off Duty", ar: "خارج الخدمة", color: "#6B7A8D" },
};

// ══════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════

export default function MapPage() {
  const { language } = useUIStore();
  const isAr = language === "ar";
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [animated, setAnimated] = useState<AnimatedDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const iconCache = useRef<Map<string, L.DivIcon>>(new Map());

  // ── Init Leaflet ──
  useEffect(() => {
    import("leaflet").then((L) => {
      LRef.current = L;
      setLeafletReady(true);
    });
  }, []);

  // ── Icon factory (cached by platform + type + rounded bearing) ──
  const getIcon = useCallback(
    (platform: string, vehicleType: string, bearing: number) => {
      const L = LRef.current;
      if (!L) return undefined;
      const b = Math.round((bearing || 0) / 10) * 10;
      const key = `${platform}_${vehicleType}_${b}`;
      let icon = iconCache.current.get(key);
      if (!icon) {
        const p = PLATFORMS[platform] || PLATFORMS.talabat;
        const svg =
          vehicleType === "car"
            ? carSvg(p.color, p.dark)
            : motoSvg(p.color, p.dark);
        const isCar = vehicleType === "car";
        icon = L.divIcon({
          html: `<div style="transform:rotate(${b}deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%">${svg}</div>`,
          className: "leaflet-vehicle-icon",
          iconSize: isCar ? [36, 42] : [28, 40],
          iconAnchor: isCar ? [18, 21] : [14, 20],
          popupAnchor: [0, isCar ? -22 : -20],
        });
        iconCache.current.set(key, icon);
      }
      return icon;
    },
    []
  );

  // ── Fetch ──
  const fetchLocations = useCallback(async () => {
    try {
      const { data } = await api.get<DriverLocation[]>(
        "/api/locations/latest"
      );
      setLocations(data);
      setAnimated(
        data.map((d) => ({
          ...d,
          display_lat: d.latitude,
          display_lng: d.longitude,
          display_bearing: d.bearing || 0,
        }))
      );
    } catch {
      /* silent for polling */
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Poll every 10s ──
  useEffect(() => {
    fetchLocations();
    const id = setInterval(fetchLocations, 10000);
    return () => clearInterval(id);
  }, [fetchLocations]);

  // ── Simulate subtle movement every 3s ──
  useEffect(() => {
    const id = setInterval(() => {
      setAnimated((prev) =>
        prev.map((d) => {
          const spd = d.speed || 0;
          if (spd < 2) return d;
          // Very slight bearing drift
          const drift = (Math.random() - 0.5) * 8;
          const newBearing = ((d.display_bearing + drift) % 360 + 360) % 360;
          const rad = (newBearing * Math.PI) / 180;
          // Much smaller movement — just enough to feel alive
          const dist = (spd / 50) * 0.00003;
          const newLat = d.display_lat + Math.cos(rad) * dist;
          const newLng = d.display_lng + Math.sin(rad) * dist;
          return {
            ...d,
            display_lat: newLat,
            display_lng: newLng,
            display_bearing: newBearing,
          };
        })
      );
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // ── Derived ──
  const filtered = useMemo(
    () =>
      activePlatform
        ? animated.filter((d) => d.platform === activePlatform)
        : animated,
    [animated, activePlatform]
  );

  const platformCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of locations) c[d.platform] = (c[d.platform] || 0) + 1;
    return c;
  }, [locations]);

  const selected = selectedId
    ? animated.find((d) => d.driver_id === selectedId)
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-72px)]">
      <div className="flex-1 rounded-xl overflow-hidden border border-[#E2E5EA] relative bg-[#EAEDF1]">
        {/* ── Map ── */}
        {leafletReady ? (
          <MapContainer
            center={KUWAIT_CENTER}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            {/* English-labeled map tiles */}
            {/* No-labels base for a clean look (avoids Arabic street names) */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            />
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
            >
            {filtered.map((d) => {
              const icon = getIcon(
                d.platform,
                d.vehicle_type,
                d.display_bearing
              );
              return (
                <Marker
                  key={d.driver_id}
                  position={[d.display_lat, d.display_lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedId(d.driver_id),
                  }}
                >
                  <Popup>
                    <div className="min-w-[220px] font-sans">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="font-bold text-[13px] text-[#0C1825]">
                          {isAr ? d.driver_name_ar : d.driver_name}
                        </span>
                        <span
                          className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              PLATFORMS[d.platform]?.color || "#888",
                          }}
                        >
                          {PLATFORMS[d.platform]?.label}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-[#6B7A8D]">
                        <div className="flex justify-between">
                          <span>ID</span>
                          <span className="font-medium text-[#0C1825]">
                            {d.employee_id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{isAr ? "الحالة" : "Shift"}</span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              color: SHIFT_STATUS_MAP[d.shift_status]?.color || "#6B7A8D",
                              backgroundColor: `${SHIFT_STATUS_MAP[d.shift_status]?.color || "#6B7A8D"}12`,
                            }}
                          >
                            {isAr
                              ? SHIFT_STATUS_MAP[d.shift_status]?.ar || d.shift_status
                              : SHIFT_STATUS_MAP[d.shift_status]?.en || d.shift_status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{isAr ? "الطلبات" : "Orders"}</span>
                          <span className="font-medium text-[#0C1825]">
                            {d.orders_today} {isAr ? "اليوم" : "today"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{isAr ? "السرعة" : "Speed"}</span>
                          <span className="font-medium text-[#0C1825]">
                            {d.speed
                              ? `${Math.round(d.speed)} km/h ${bearingToDir(d.display_bearing)}`
                              : isAr ? "متوقف" : "Idle"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{isAr ? "آخر تحديث" : "Updated"}</span>
                          <span className="font-medium text-[#0C1825]">
                            {timeAgo(d.recorded_at, isAr)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            </MarkerClusterGroup>
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-[13px] text-[#6B7A8D]">
              Loading map...
            </div>
          </div>
        )}

        {/* ── Floating top-left: title + count ── */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
          <div className="bg-white/90 backdrop-blur-lg rounded-xl px-3.5 py-2 shadow-sm border border-white/60 flex items-center gap-3">
            <h1 className="text-[13px] font-bold text-[#0C1825]">
              {isAr ? "الخريطة الحية" : "Live Map"}
            </h1>
            <div className="w-px h-4 bg-[#E2E5EA]" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#059669]">
              <span className="relative flex h-[7px] w-[7px]">
                <span className="animate-ping absolute h-full w-full rounded-full bg-[#059669] opacity-75" />
                <span className="relative rounded-full h-[7px] w-[7px] bg-[#059669]" />
              </span>
              {locations.length} online
            </span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchLocations();
            }}
            className="bg-white/90 backdrop-blur-lg rounded-xl p-2.5 shadow-sm border border-white/60 hover:bg-white transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#6B7A8D] ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* ── Floating top-right: platform filters ── */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-wrap items-center gap-1.5 max-w-[calc(100%-180px)]">
          {Object.entries(PLATFORMS).map(([key, { color, label }]) => {
            const count = platformCounts[key] || 0;
            const active = activePlatform === key;
            return (
              <button
                key={key}
                onClick={() => setActivePlatform(active ? null : key)}
                className="rounded-xl px-3 py-1.5 text-[11px] font-medium shadow-sm border transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: active ? color : "rgba(255,255,255,0.9)",
                  color: active ? "white" : "#4B5563",
                  borderColor: active ? color : "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: active ? "white" : color }}
                />
                {label}
                <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Floating bottom-center: selected driver card ── */}
        {selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-lg rounded-2xl border border-white/60 shadow-xl px-4 py-3 w-[calc(100%-2rem)] max-w-[420px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{
                    backgroundColor:
                      PLATFORMS[selected.platform]?.color || "#888",
                  }}
                >
                  {selected.vehicle_type === "car" ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <rect x="1" y="7" width="22" height="9" rx="2.5" />
                      <path d="M4 7l2.5-5h11l2.5 5" />
                      <circle cx="6" cy="14" r="1.8" fill="currentColor" />
                      <circle cx="18" cy="14" r="1.8" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <circle cx="5" cy="17" r="3.5" />
                      <circle cx="19" cy="17" r="3.5" />
                      <path d="M8.5 17h2.5l2-6h5l1.5 6" />
                      <path d="M11 11l1.5-5h3l1 3" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#0C1825]">
                    {isAr ? selected.driver_name_ar : selected.driver_name}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                    <span>{selected.employee_id}</span>
                    <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                    <span>{PLATFORMS[selected.platform]?.label}</span>
                    <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                    <span>
                      {selected.vehicle_type === "car" ? "Car" : "Motorcycle"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-[#94A3B8] hover:text-[#0C1825] transition-colors text-lg leading-none px-1"
              >
                &times;
              </button>
            </div>
            <div className="flex gap-2">
              {[
                {
                  label: isAr ? "السرعة" : "Speed",
                  value: selected.speed
                    ? `${Math.round(selected.speed)}`
                    : "0",
                  unit: "km/h",
                },
                {
                  label: isAr ? "الطلبات" : "Orders",
                  value: `${selected.orders_today}`,
                  unit: isAr ? "اليوم" : "today",
                },
                {
                  label: isAr ? "الوردية" : "Shift",
                  value: isAr
                    ? SHIFT_STATUS_MAP[selected.shift_status]?.ar || selected.shift_status
                    : SHIFT_STATUS_MAP[selected.shift_status]?.en || selected.shift_status,
                  unit: "",
                },
                {
                  label: isAr ? "آخر تحديث" : "Updated",
                  value: timeAgo(selected.recorded_at, isAr),
                  unit: "",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex-1 bg-[#F7F8FA] rounded-xl p-2.5 text-center"
                >
                  <div className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wide">
                    {s.label}
                  </div>
                  <div className="text-[16px] font-bold text-[#0C1825] mt-0.5">
                    {s.value}
                  </div>
                  {s.unit && (
                    <div className="text-[9px] text-[#94A3B8]">{s.unit}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
