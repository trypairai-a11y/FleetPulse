import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uploadLocations } from "../api/client";

const LOCATION_TASK = "darb-background-location";
const BUFFER_STORAGE_KEY = "darb_location_buffer";

type LocationEntry = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
};

let locationBuffer: LocationEntry[] = [];

/**
 * Persist the current in-memory buffer to AsyncStorage.
 * Called after every buffer mutation so data survives app crashes.
 */
async function persistBuffer(): Promise<void> {
  try {
    await AsyncStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(locationBuffer));
  } catch {
    // Storage write failed — buffer remains in memory only
  }
}

/**
 * Restore any previously persisted buffer from disk on startup.
 * Merges with the current in-memory buffer.
 */
async function restoreBuffer(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(BUFFER_STORAGE_KEY);
    if (stored) {
      const parsed: LocationEntry[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        locationBuffer = [...parsed, ...locationBuffer];
      }
    }
  } catch {
    // Restore failed — start with empty buffer
  }
}

// Restore persisted buffer when the module loads
restoreBuffer();

/**
 * Define the background location task. This runs even when the app is
 * backgrounded or the screen is off. Locations are buffered and flushed
 * to the backend every 10 entries or 60 seconds (whichever comes first).
 */
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };

  for (const loc of locations) {
    locationBuffer.push({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
      timestamp: new Date(loc.timestamp).toISOString(),
    });
  }

  await persistBuffer();

  if (locationBuffer.length >= 10) {
    await flushLocations();
  }
});

async function flushLocations() {
  if (locationBuffer.length === 0) return;
  const batch = [...locationBuffer];
  locationBuffer = [];
  await persistBuffer();
  try {
    await uploadLocations(batch);
    // Clear persisted buffer on successful upload
    await AsyncStorage.removeItem(BUFFER_STORAGE_KEY);
  } catch {
    // Re-queue on failure — will be sent next flush
    locationBuffer = [...batch, ...locationBuffer];
    await persistBuffer();
  }
}

export async function startTracking(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return false;

  const bgStatus = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus.status !== "granted") return false;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 50,
    foregroundService: {
      notificationTitle: "Darb Agent",
      notificationBody: "Tracking your location during shift",
      notificationColor: "#FF5A00",
    },
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
  });

  return true;
}

export async function stopTracking(): Promise<void> {
  await flushLocations();
  const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}
