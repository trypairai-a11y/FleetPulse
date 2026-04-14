import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  SafeAreaView, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { agentFetch } from "../../src/api/client";

interface Order {
  id: string;
  platform: string;
  status: string;
  customerName?: string;
  merchantName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  amount?: number;
  createdAt: string;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await agentFetch<{ data: Order[] }>("/api/agent/orders");
      setOrders(data.data || []);
    } catch {
      // Fetch failed silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "delivered":
      case "completed": return "#16a34a";
      case "in_progress":
      case "picked_up": return "#F97316";
      case "cancelled": return "#dc2626";
      default: return "#6B7280";
    }
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderOrder({ item }: { item: Order }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.platformBadge}>
            <Text style={styles.platformText}>{item.platform}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {item.merchantName && (
          <Text style={styles.merchantName}>{item.merchantName}</Text>
        )}

        {item.deliveryAddress && (
          <Text style={styles.address} numberOfLines={1}>{item.deliveryAddress}</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          {item.amount != null && (
            <Text style={styles.amount}>{item.amount.toFixed(3)} KD</Text>
          )}
        </View>
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
        <Text style={styles.title}>Orders</Text>

        {orders.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No orders yet today</Text>
            <Text style={styles.emptySubtext}>Orders will appear here once your shift is active</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  platformBadge: {
    backgroundColor: "#1A1A2E", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  platformText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  merchantName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  address: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 12, color: "#86868b" },
  amount: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
});
