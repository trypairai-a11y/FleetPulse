/**
 * AiSuggestionFeed
 * -----------------
 * Bilingual AI-driven suggestion cards for couriers in the Expo app.
 * Polls /api/courier/:driverId/suggestions, renders ranked cards with CTAs.
 *
 * Drop into the home screen above the shift list.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  I18nManager,
} from "react-native";
import { api } from "../api/client"; // assumes existing axios client

type SuggestionType =
  | "GO_ONLINE_SURGE"
  | "TAKE_SHIFT"
  | "APPEAL_VIOLATION"
  | "BONUS_PROXIMITY"
  | "ROUTE_OPTIMIZATION"
  | "REST_BREAK"
  | "EARNINGS_INSIGHT";

interface Suggestion {
  type: SuggestionType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  estimatedValueKD?: number;
  confidence: number;
  ctaAction?: { kind: "deeplink" | "api"; target: string; payload?: any };
}

const TYPE_COLORS: Record<SuggestionType, { bg: string; accent: string; emoji: string }> = {
  GO_ONLINE_SURGE: { bg: "#FFF7E6", accent: "#F59E0B", emoji: "⚡" },
  TAKE_SHIFT: { bg: "#EEF2FF", accent: "#6366F1", emoji: "🗓" },
  APPEAL_VIOLATION: { bg: "#FEF2F2", accent: "#DC2626", emoji: "⚖" },
  BONUS_PROXIMITY: { bg: "#ECFDF5", accent: "#10B981", emoji: "🎯" },
  ROUTE_OPTIMIZATION: { bg: "#F0F9FF", accent: "#0284C7", emoji: "🧭" },
  REST_BREAK: { bg: "#FAF5FF", accent: "#A855F7", emoji: "☕" },
  EARNINGS_INSIGHT: { bg: "#F0FDFA", accent: "#0D9488", emoji: "💰" },
};

interface Props {
  driverId: string;
  language?: "en" | "ar";
}

export const AiSuggestionFeed: React.FC<Props> = ({ driverId, language = "en" }) => {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const isAr = language === "ar";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get(`/courier/${driverId}/suggestions?max=3`);
        if (!cancelled) setItems(data.suggestions ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5 * 60_000); // refresh every 5 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [driverId]);

  const handleCta = (s: Suggestion) => {
    if (!s.ctaAction) return;
    if (s.ctaAction.kind === "deeplink") Linking.openURL(s.ctaAction.target).catch(() => {});
    if (s.ctaAction.kind === "api") api.post(s.ctaAction.target, s.ctaAction.payload ?? {});
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={{ direction: isAr ? "rtl" : "ltr" } as any}
    >
      {items.map((s, idx) => {
        const palette = TYPE_COLORS[s.type] ?? TYPE_COLORS.EARNINGS_INSIGHT;
        const title = isAr ? s.titleAr : s.title;
        const body = isAr ? s.bodyAr : s.body;
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.85}
            onPress={() => handleCta(s)}
            style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.accent }]}
          >
            <Text style={styles.emoji}>{palette.emoji}</Text>
            <Text style={[styles.title, { color: palette.accent }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.body} numberOfLines={3}>
              {body}
            </Text>
            {s.estimatedValueKD != null && (
              <View style={[styles.badge, { backgroundColor: palette.accent }]}>
                <Text style={styles.badgeText}>+{s.estimatedValueKD} KD</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loading: { paddingVertical: 24, alignItems: "center" },
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  card: {
    width: 240,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  emoji: { fontSize: 24, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  body: { fontSize: 13, color: "#374151", lineHeight: 18 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 10,
  },
  badgeText: { color: "white", fontSize: 12, fontWeight: "600" },
});

export default AiSuggestionFeed;
