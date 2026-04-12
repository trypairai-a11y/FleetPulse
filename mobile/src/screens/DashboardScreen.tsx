import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { heartbeat } from "../api/client";
import { startTracking, stopTracking } from "../services/locationService";

export default function DashboardScreen({ onSelfie }: { onSelfie: (type: "clock_in" | "clock_out") => void }) {
  const [onShift, setOnShift] = useState(false);
  const [stats, setStats] = useState({ orders: 0, hours: "0h 0m" });

  useEffect(() => {
    const timer = setInterval(async () => {
      const deviceId = await SecureStore.getItemAsync("device_id");
      if (deviceId) {
        heartbeat({ deviceId, batteryLevel: 1.0, appVersion: "1.0.0" }).catch(() => {});
      }
    }, 15 * 60 * 1000); // 15 min
    return () => clearInterval(timer);
  }, []);

  const handleToggleShift = useCallback(async () => {
    if (onShift) {
      onSelfie("clock_out");
      await stopTracking();
      setOnShift(false);
    } else {
      onSelfie("clock_in");
      const started = await startTracking();
      if (!started) {
        Alert.alert("Location Required", "Please grant background location permission to start your shift.");
        return;
      }
      setOnShift(true);
    }
  }, [onShift, onSelfie]);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good day, Driver</Text>

      <View style={styles.statusCard}>
        <View style={[styles.statusDot, { backgroundColor: onShift ? "#16a34a" : "#dc2626" }]} />
        <Text style={styles.statusText}>{onShift ? "On Shift" : "Off Shift"}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.orders}</Text>
          <Text style={styles.statLabel}>Orders Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.hours}</Text>
          <Text style={styles.statLabel}>Time on Shift</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f5f5f7" },
  greeting: { fontSize: 22, fontWeight: "700", marginTop: 60, marginBottom: 24 },
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
    borderRadius: 16, padding: 20, alignItems: "center", marginTop: 32,
  },
  shiftButtonStart: { backgroundColor: "#16a34a" },
  shiftButtonEnd: { backgroundColor: "#dc2626" },
  shiftButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
