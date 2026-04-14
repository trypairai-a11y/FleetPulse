import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  SafeAreaView, ActivityIndicator,
} from "react-native";
import { agentFetch } from "../../src/api/client";

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  area?: string;
  status: string;
}

export default function ShiftsScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShifts = useCallback(async () => {
    try {
      const data = await agentFetch<{ data: Shift[] }>("/api/agent/shifts");
      setShifts(data.data || []);
    } catch {
      // Fetch failed silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchShifts();
    setRefreshing(false);
  }, [fetchShifts]);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  function formatTime(timeStr: string): string {
    // Handle both ISO datetime and HH:mm format
    if (timeStr.includes("T")) {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return timeStr;
  }

  function getStatusStyle(status: string) {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "active": return { bg: "#16a34a20", text: "#16a34a" };
      case "pending": return { bg: "#F9731620", text: "#F97316" };
      case "completed": return { bg: "#6B728020", text: "#6B7280" };
      case "cancelled": return { bg: "#dc262620", text: "#dc2626" };
      default: return { bg: "#6B728020", text: "#6B7280" };
    }
  }

  function renderShift({ item }: { item: Shift }) {
    const statusStyle = getStatusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Shift Time</Text>
          <Text style={styles.timeValue}>
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
        </View>

        {item.area && (
          <View style={styles.areaRow}>
            <View style={styles.areaBadge}>
              <Text style={styles.areaText}>{item.area}</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Shifts</Text>

        {shifts.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No shifts scheduled</Text>
            <Text style={styles.emptySubtext}>Your upcoming shifts will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={shifts}
            renderItem={renderShift}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f7" },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginTop: 16, marginBottom: 16 },
  list: { paddingBottom: 24 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#374151" },
  emptySubtext: { fontSize: 14, color: "#86868b", marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  date: { fontSize: 16, fontWeight: "700" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  timeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  timeLabel: { fontSize: 13, color: "#86868b" },
  timeValue: { fontSize: 14, fontWeight: "600" },
  areaRow: { marginTop: 4 },
  areaBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1A1A2E", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  areaText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
