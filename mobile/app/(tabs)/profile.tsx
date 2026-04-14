import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, ScrollView, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { agentFetch } from "../../src/api/client";

interface DriverProfile {
  id: string;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  civilId?: string;
  platform?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  status?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await agentFetch<DriverProfile>("/api/agent/profile");
      setProfile(data);
    } catch {
      // Fetch failed silently
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  async function handleLogout() {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out? You will need to re-enroll this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync("agent_token");
            await SecureStore.deleteItemAsync("device_id");
            router.replace("/enrollment");
          },
        },
      ]
    );
  }

  function renderRow(label: string, value: string | undefined) {
    if (!value) return null;
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "D"}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name || "Driver"}</Text>
          {profile?.nameAr && <Text style={styles.nameAr}>{profile.nameAr}</Text>}
          {profile?.platform && (
            <View style={styles.platformBadge}>
              <Text style={styles.platformText}>{profile.platform}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.card}>
            {renderRow("ID", profile?.id)}
            {renderRow("Phone", profile?.phone)}
            {renderRow("Email", profile?.email)}
            {renderRow("Civil ID", profile?.civilId)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <View style={styles.card}>
            {renderRow("Type", profile?.vehicleType)}
            {renderRow("Plate Number", profile?.vehiclePlate)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {renderRow("Status", profile?.status)}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Darb Agent v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f7" },
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginTop: 16, marginBottom: 24 },
  avatarContainer: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#1A1A2E",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700" },
  nameAr: { fontSize: 16, color: "#86868b", marginTop: 4 },
  platformBadge: {
    marginTop: 8, backgroundColor: "#F97316", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  platformText: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#86868b", marginBottom: 8, textTransform: "uppercase" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "600" },
  logoutButton: {
    backgroundColor: "#dc262620", borderRadius: 16, padding: 16,
    alignItems: "center", marginTop: 12,
  },
  logoutText: { color: "#dc2626", fontSize: 16, fontWeight: "600" },
  version: { textAlign: "center", color: "#86868b", fontSize: 12, marginTop: 24, marginBottom: 40 },
});
