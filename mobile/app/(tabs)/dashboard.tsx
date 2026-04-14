import { useState, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  SafeAreaView, RefreshControl, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { heartbeat, agentFetch } from "../../src/api/client";
import { startTracking, stopTracking } from "../../src/services/locationService";

interface DashboardStats {
  ordersToday: number;
  onlineMinutes: number;
  completionRate: number;
  rating: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [onShift, setOnShift] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    ordersToday: 0,
    onlineMinutes: 0,
    completionRate: 0,
    rating: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const data = await agentFetch<DashboardStats>("/api/agent/stats");
      setStats(data);
    } catch {
      // Stats fetch failed silently — keep previous values
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Heartbeat every 15 minutes
  useEffect(() => {
    const timer = setInterval(async () => {
      const deviceId = await SecureStore.getItemAsync("device_id");
      if (deviceId) {
        heartbeat({ deviceId, batteryLevel: 1.0, appVersion: "1.0.0" }).catch(() => {});
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleShift = useCallback(async () => {
    if (onShift) {
      router.push({ pathname: "/selfie", params: { type: "clock_out" } });
      await stopTracking();
      setOnShift(false);
    } else {
      router.push({ pathname: "/selfie", params: { type: "clock_in" } });
      const started = await startTracking();
      if (!started) {
        Alert.alert("Location Required", "Please grant background location permission to start your shift.");
        return;
      }
      setOnShift(true);
    }
  }, [onShift, router]);

  function formatHours(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        <Text style={styles.greeting}>Good day, Driver</Text>

        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: onShift ? "#16a34a" : "#dc2626" }]} />
          <Text style={styles.statusText}>{onShift ? "On Shift" : "Off Shift"}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.ordersToday}</Text>
            <Text style={styles.statLabel}>Orders Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatHours(stats.onlineMinutes)}</Text>
            <Text style={styles.statLabel}>Time on Shift</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.completionRate > 0 ? `${stats.completionRate}%` : "--"}
            </Text>
            <Text style={styles.statLabel}>Completion Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.rating > 0 ? stats.rating.toFixed(1) : "--"}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.shiftButton, onShift ? styles.shiftButtonEnd : styles.shiftButtonStart]}
          onPress={handleToggleShift}
        >
          <Text style={styles.shiftButtonText}>
            {onShift ? "End Shift" : "Start Shift"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f7" },
  container: { flex: 1, padding: 24 },
  greeting: { fontSize: 22, fontWeight: "700", marginTop: 16, marginBottom: 24 },
  statusCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, padding: 20,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 18, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 20,
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 28, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#86868b", marginTop: 4 },
  shiftButton: {
    borderRadius: 16, padding: 20, alignItems: "center", marginTop: 32, marginBottom: 40,
  },
  shiftButtonStart: { backgroundColor: "#16a34a" },
  shiftButtonEnd: { backgroundColor: "#dc2626" },
  shiftButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
