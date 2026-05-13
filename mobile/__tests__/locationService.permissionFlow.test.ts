/**
 * RED tests — turn GREEN when Wave 1 rewrites
 * mobile/src/services/locationService.ts with the documented permission
 * flow + startBeacon contract.
 *
 * Contract:
 *   - startBeacon() awaits foreground permission FIRST.
 *   - If foreground is denied → return { ok:false, reason:"foreground_denied" }
 *     and DO NOT call requestBackgroundPermissionsAsync.
 *   - If both granted → return { ok:true } and start the background location
 *     task with the documented options (accuracy, activityType,
 *     pausesUpdatesAutomatically:false, showsBackgroundLocationIndicator:true,
 *     deferredUpdatesInterval:60000, foregroundService.killServiceOnDestroy:false).
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const mockLocation = Location as unknown as {
  requestForegroundPermissionsAsync: jest.Mock;
  requestBackgroundPermissionsAsync: jest.Mock;
  startLocationUpdatesAsync: jest.Mock;
};
const mockTaskManager = TaskManager as unknown as {
  isTaskRegisteredAsync: jest.Mock;
};

describe("locationService.startBeacon — permission flow", () => {
  test("foreground denied → no background ask, returns ok:false reason:foreground_denied", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: "denied",
      granted: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startBeacon } = require("../src/services/locationService");
    const result = await startBeacon();

    expect(mockLocation.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "foreground_denied" });
  });

  test("foreground+background granted → ok:true; startLocationUpdatesAsync called with required keys", async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: "granted",
      granted: true,
    });
    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValueOnce({
      status: "granted",
      granted: true,
    });
    mockTaskManager.isTaskRegisteredAsync.mockResolvedValueOnce(false);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startBeacon } = require("../src/services/locationService");
    const result = await startBeacon();

    expect(result).toEqual({ ok: true });
    expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      "darb-background-location",
      expect.objectContaining({
        accuracy: expect.any(Number),
        activityType: expect.any(Number),
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        deferredUpdatesInterval: 60000,
        foregroundService: expect.objectContaining({
          killServiceOnDestroy: false,
        }),
      }),
    );
  });
});
