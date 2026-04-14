"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Courier = {
  id: string; name: string; lat: number | null; lng: number | null;
  status: string; area: string | null; vehicle: string | null;
};
type Order = {
  id: string; status: string;
  merchantLat: number | null; merchantLng: number | null;
  customerLat: number | null; customerLng: number | null;
  courierId: string | null;
};

const STATUS = {
  working: { color: "#22c55e", ring: "rgba(34,197,94,0.25)", label: "Working" },
  idle:    { color: "#f59e0b", ring: "rgba(245,158,11,0.25)", label: "Idle" },
  offline: { color: "#64748b", ring: "rgba(100,116,139,0.25)", label: "Offline" },
};

function courierPin(status: keyof typeof STATUS, selected = false) {
  const s = STATUS[status] ?? STATUS.offline;
  const size = selected ? 36 : 28;
  return L.divIcon({
    className: "opc-pin",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <span style="position:absolute;inset:0;border-radius:999px;background:${s.ring};animation:opcPulse 2s ease-out infinite;"></span>
        <span style="position:absolute;inset:4px;border-radius:999px;background:${s.color};box-shadow:0 2px 10px rgba(0,0,0,0.45),0 0 0 2px rgba(255,255,255,0.9) inset;"></span>
        <span style="position:absolute;top:50%;left:50%;width:6px;height:6px;border-radius:999px;background:white;transform:translate(-50%,-50%);"></span>
      </div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

function merchantPin() {
  return L.divIcon({
    className: "opc-merchant",
    html: `
      <div style="width:22px;height:22px;background:#111827;border-radius:6px 6px 6px 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
        <div style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;">●</div>
      </div>`,
    iconSize: [22, 22], iconAnchor: [11, 22],
  });
}

function customerPin() {
  return L.divIcon({
    className: "opc-customer",
    html: `<div style="width:14px;height:14px;border-radius:999px;background:white;border:3px solid #0ea5e9;box-shadow:0 2px 6px rgba(14,165,233,0.5);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES_LABELLESS = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

export default function OperationCentreMap({
  mode, couriers, orders, onSelect, selectedId,
}: {
  mode: "courier" | "order";
  couriers: Courier[];
  orders: Order[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [29.3759, 47.9774],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      zoomSnap: 0.25,
    });
    L.tileLayer(DARK_TILES, { maxZoom: 19, detectRetina: true }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution("© OpenStreetMap · © CARTO")
      .addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    // Inject styles once
    if (!document.getElementById("opc-style")) {
      const style = document.createElement("style");
      style.id = "opc-style";
      style.textContent = `
        @keyframes opcPulse { 0% { transform: scale(0.75); opacity: 0.9; } 100% { transform: scale(2); opacity: 0; } }
        .opc-map { background: #f3f5f7; }
        .opc-map .leaflet-control-zoom { border: none; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-radius: 12px; overflow: hidden; }
        .opc-map .leaflet-control-zoom a { width: 36px; height: 36px; line-height: 36px; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); color: #111; border: none; font-size: 16px; font-weight: 500; }
        .opc-map .leaflet-control-zoom a:hover { background: #fff; }
        .opc-map .leaflet-control-attribution { background: rgba(255,255,255,0.7); backdrop-filter: blur(6px); border-radius: 8px; padding: 2px 8px; font-size: 10px; color: #6b7280; }
        .opc-map .leaflet-tooltip.opc-tooltip { background: rgba(17,24,39,0.95); color: #fff; border: none; border-radius: 10px; padding: 8px 12px; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); backdrop-filter: blur(8px); }
        .opc-map .leaflet-tooltip.opc-tooltip::before { border-top-color: rgba(17,24,39,0.95) !important; }
        .opc-map .leaflet-popup-content-wrapper { border-radius: 14px; box-shadow: 0 12px 36px rgba(0,0,0,0.15); }
        .opc-map .leaflet-popup-content { margin: 12px 14px; font-size: 12px; }
        .opc-map .leaflet-popup-tip { display: none; }
        .opc-map .leaflet-pane { filter: saturate(0.85); }
      `;
      document.head.appendChild(style);
    }
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (mode === "courier") {
      for (const c of couriers) {
        if (c.lat == null || c.lng == null) continue;
        const key = (c.status as keyof typeof STATUS) in STATUS ? (c.status as keyof typeof STATUS) : "offline";
        const meta = STATUS[key];
        const m = L.marker([c.lat, c.lng], { icon: courierPin(key, c.id === selectedId), riseOnHover: true });
        m.bindTooltip(
          `<div style="min-width:140px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="width:6px;height:6px;border-radius:999px;background:${meta.color}"></span>
              <span style="font-weight:600">${c.name}</span>
            </div>
            <div style="color:rgba(255,255,255,0.7);font-size:11px">${c.vehicle ?? "—"} · ${c.area ?? "—"}</div>
            <div style="color:${meta.color};font-size:11px;margin-top:2px">${meta.label}</div>
          </div>`,
          { direction: "top", offset: [0, -10], className: "opc-tooltip", sticky: false }
        );
        m.on("click", () => onSelect?.(c.id));
        m.addTo(layer);
      }
    } else {
      for (const o of orders) {
        const hasMerchant = o.merchantLat != null && o.merchantLng != null;
        const hasCustomer = o.customerLat != null && o.customerLng != null;
        if (hasMerchant && hasCustomer) {
          L.polyline(
            [[o.merchantLat!, o.merchantLng!], [o.customerLat!, o.customerLng!]],
            { color: "#0ea5e9", weight: 2.5, opacity: 0.6, dashArray: "6 8", lineCap: "round" }
          ).addTo(layer);
        }
        if (hasMerchant) {
          L.marker([o.merchantLat!, o.merchantLng!], { icon: merchantPin() })
            .bindTooltip(`<div><div style="font-weight:600">Order ${o.id.slice(0, 8)}</div><div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:2px">${o.status}</div></div>`, { direction: "top", offset: [0, -18], className: "opc-tooltip" })
            .addTo(layer);
        }
        if (hasCustomer) {
          L.marker([o.customerLat!, o.customerLng!], { icon: customerPin() }).addTo(layer);
        }
      }
    }
  }, [mode, couriers, orders, onSelect, selectedId]);

  return <div ref={ref} className="opc-map w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: "calc(100vh - 180px)" }} />;
}
