"use client";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { MapPin, Navigation, Star, Loader2, Send } from "lucide-react";
import { useState, useCallback } from "react";
import api from "@/lib/api";

interface RestaurantRec {
  name: string;
  avgOrders: number;
  distance?: string;
  lat?: number;
  lng?: number;
}

interface IdleRecommendation {
  recommendation: string;
  restaurant: RestaurantRec & { distance: string };
  confidence: number;
  reasoning: string;
  alternatives: RestaurantRec[];
}

interface IdleDriverRecommendationProps {
  driverId: string;
  driverName: string;
  lat: number | null;
  lng: number | null;
  platform?: string;
}

export default function IdleDriverRecommendation({ driverId, driverName, lat, lng, platform = "KEETA" }: IdleDriverRecommendationProps) {
  const [notifSent, setNotifSent] = useState(false);
  const [sending, setSending] = useState(false);

  const params = new URLSearchParams({
    driverId,
    platform,
    lat: String(lat ?? 0),
    lng: String(lng ?? 0),
  });

  const { data, loading, error } = useApiGet<IdleRecommendation>(
    `/api/ai-insights/realtime/idle-positioning?${params}`
  );

  const handleSendNotification = useCallback(async () => {
    if (!data) return;
    setSending(true);
    try {
      await api.post("/api/notifications", {
        title: "Position Recommendation",
        body: data.recommendation,
        type: "DRIVER_RECOMMENDATION",
        severity: "MEDIUM",
        driverId,
      });
      setNotifSent(true);
    } catch {
      /* swallow */
    } finally {
      setSending(false);
    }
  }, [data, driverId]);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-blue-500" />
        <span className="text-sm text-blue-700">Finding best position for {driverName}...</span>
      </div>
    );
  }

  if (error || !data || data.confidence === 0) {
    return null; // Don't show if no data available
  }

  const confidencePct = Math.round(data.confidence * 100);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Navigation size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase text-blue-500">AI Recommendation</p>
          <p className="text-sm font-medium text-blue-900 mt-0.5">{data.recommendation}</p>
        </div>
      </div>

      {/* Main restaurant card */}
      <div className="bg-white/70 rounded-lg p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <MapPin size={18} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{data.restaurant.name}</p>
          <p className="text-xs text-secondary">{data.restaurant.distance} away</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-blue-700">{data.restaurant.avgOrders.toFixed(1)}</p>
          <p className="text-[10px] text-secondary">avg orders</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-secondary font-medium">Confidence</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              confidencePct >= 70 ? "bg-green-500" :
              confidencePct >= 40 ? "bg-amber-500" :
              "bg-red-400"
            )}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-secondary">{confidencePct}%</span>
      </div>

      {/* Reasoning */}
      <p className="text-[11px] text-secondary leading-relaxed">{data.reasoning}</p>

      {/* Alternatives */}
      {data.alternatives.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-secondary mb-1.5">Alternatives</p>
          <div className="space-y-1">
            {data.alternatives.map((alt, i) => (
              <div key={i} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Star size={10} className="text-amber-400" />
                  <span className="text-xs text-foreground">{alt.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-secondary">
                  {alt.distance && <span>{alt.distance}</span>}
                  <span>{alt.avgOrders.toFixed(1)} avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send to driver button */}
      <button
        onClick={handleSendNotification}
        disabled={notifSent || sending}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors",
          notifSent
            ? "bg-green-100 text-green-700 cursor-default"
            : "bg-blue-600 text-white hover:bg-blue-700"
        )}
      >
        {sending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : notifSent ? (
          <>Sent to {driverName}</>
        ) : (
          <>
            <Send size={12} />
            Send recommendation to {driverName}
          </>
        )}
      </button>
    </div>
  );
}
