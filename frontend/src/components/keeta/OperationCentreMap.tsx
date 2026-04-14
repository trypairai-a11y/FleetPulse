"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Courier = { id: string; name: string; lat: number | null; lng: number | null; status: string; area: string | null; vehicle: string | null };
type Order = { id: string; status: string; merchantLat: number | null; merchantLng: number | null; customerLat: number | null; customerLng: number | null; courierId: string | null };

const STATUS_COLOR: Record<string, string> = {
  working: "#16A34A",
  idle: "#F59E0B",
  offline: "#6B7280",
};

export default function OperationCentreMap({
  mode, couriers, orders, onSelect,
}: {
  mode: "courier" | "order";
  couriers: Courier[];
  orders: Order[];
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { center: [29.3759, 47.9774], zoom: 11, zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (mode === "courier") {
      for (const c of couriers) {
        if (c.lat == null || c.lng == null) continue;
        const color = STATUS_COLOR[c.status] || "#6B7280";
        const marker = L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).bindTooltip(`<div style="font-size:12px"><b>${c.name}</b><br/>${c.vehicle ?? ""} · ${c.area ?? ""}<br/>${c.status}</div>`, { direction: "top" });
        marker.on("click", () => onSelect?.(c.id));
        marker.addTo(layer);
      }
    } else {
      for (const o of orders) {
        if (o.merchantLat != null && o.merchantLng != null) {
          L.marker([o.merchantLat, o.merchantLng], {
            icon: L.divIcon({
              className: "",
              html: `<div style="width:10px;height:10px;background:#F59E0B;transform:rotate(45deg);border:2px solid white"></div>`,
              iconSize: [12, 12], iconAnchor: [6, 6],
            }),
          }).bindTooltip(`Order ${o.id}<br/>Status: ${o.status}`).addTo(layer);
        }
        if (o.customerLat != null && o.customerLng != null) {
          L.circleMarker([o.customerLat, o.customerLng], {
            radius: 6, color: "#3B82F6", weight: 2, fillColor: "#3B82F6", fillOpacity: 0.4,
          }).addTo(layer);
          if (o.merchantLat != null && o.merchantLng != null) {
            L.polyline([[o.merchantLat, o.merchantLng], [o.customerLat, o.customerLng]], {
              color: "#3B82F6", dashArray: "4 4", weight: 2,
            }).addTo(layer);
          }
        }
      }
    }
  }, [mode, couriers, orders, onSelect]);

  return <div ref={ref} className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: "calc(100vh - 180px)" }} />;
}
