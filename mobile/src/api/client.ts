import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("agent_token");
}

export async function agentFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function register(enrollmentCode: string, deviceInfo: {
  imei?: string;
  model: string;
  osVersion: string;
  appVersion: string;
}): Promise<{ token: string; deviceId: string; driverId: string }> {
  const data = await agentFetch<any>("/api/agent/register", {
    method: "POST",
    body: JSON.stringify({ enrollmentCode, ...deviceInfo }),
  });
  await SecureStore.setItemAsync("agent_token", data.token);
  await SecureStore.setItemAsync("device_id", data.deviceId);
  return data;
}

export async function heartbeat(payload: {
  deviceId: string;
  batteryLevel: number;
  appVersion: string;
}) {
  return agentFetch("/api/agent/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadSelfie(payload: {
  type: "clock_in" | "clock_out";
  imageBase64: string;
  latitude: number;
  longitude: number;
}) {
  return agentFetch("/api/agent/selfie", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadLocations(batch: {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}[]) {
  return agentFetch("/api/agent/location", {
    method: "POST",
    body: JSON.stringify({ locations: batch }),
  });
}

export async function uploadCapturedOrders(orders: {
  platform: string;
  rawText: string;
  capturedAt: string;
}[]) {
  return agentFetch("/api/agent/captured-orders", {
    method: "POST",
    body: JSON.stringify({ orders }),
  });
}

export async function pollCommands(deviceId: string) {
  return agentFetch<any[]>(`/api/agent/commands?deviceId=${deviceId}`);
}

export async function ackCommand(commandId: string) {
  return agentFetch(`/api/agent/commands/${commandId}/ack`, { method: "POST" });
}
