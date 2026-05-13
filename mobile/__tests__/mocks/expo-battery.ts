/**
 * expo-battery mock. Tests inject battery level via .mockResolvedValueOnce.
 */

export const getBatteryLevelAsync = jest.fn(async () => 0.85);
export const getBatteryStateAsync = jest.fn(async () => 1); // BatteryState.UNPLUGGED
export const getPowerStateAsync = jest.fn(async () => ({
  batteryLevel: 0.85,
  batteryState: 1,
  lowPowerMode: false,
}));
export const isLowPowerModeEnabledAsync = jest.fn(async () => false);

export const BatteryState = {
  UNKNOWN: 0,
  UNPLUGGED: 1,
  CHARGING: 2,
  FULL: 3,
};

export default {
  getBatteryLevelAsync,
  getBatteryStateAsync,
  getPowerStateAsync,
  isLowPowerModeEnabledAsync,
  BatteryState,
};
