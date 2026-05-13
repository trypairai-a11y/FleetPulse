/**
 * expo-location mock. Tests inject behaviour per-test via .mockResolvedValueOnce.
 */

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export const ActivityType = {
  Other: 1,
  AutomotiveNavigation: 2,
  Fitness: 3,
  OtherNavigation: 4,
  Airborne: 5,
};

// Real expo-location exports both names — `ActivityType` for the older surface
// and `LocationActivityType` for the typed-routes-era enum. Wave 1 production
// code uses the new name; the mock mirrors both to avoid runtime undefined errors.
export const LocationActivityType = ActivityType;

export const requestForegroundPermissionsAsync = jest.fn(async () => ({
  status: "undetermined",
  granted: false,
  canAskAgain: true,
  expires: "never",
}));

export const requestBackgroundPermissionsAsync = jest.fn(async () => ({
  status: "undetermined",
  granted: false,
  canAskAgain: true,
  expires: "never",
}));

export const startLocationUpdatesAsync = jest.fn(async (_taskName: string, _options: any) => {});
export const stopLocationUpdatesAsync = jest.fn(async (_taskName: string) => {});
export const hasStartedLocationUpdatesAsync = jest.fn(async (_taskName: string) => false);
export const getCurrentPositionAsync = jest.fn(async (_options?: any) => ({
  coords: {
    latitude: 29.3759,
    longitude: 47.9774,
    accuracy: 10,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
}));

export default {
  Accuracy,
  ActivityType,
  LocationActivityType,
  requestForegroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  hasStartedLocationUpdatesAsync,
  getCurrentPositionAsync,
};
