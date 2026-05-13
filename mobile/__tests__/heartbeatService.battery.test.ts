/**
 * RED test — turns GREEN when Wave 1 ships
 * mobile/src/services/heartbeatService.ts that reads expo-battery values
 * (the existing dashboard.tsx 15-min loop hardcodes 1.0).
 */

import * as Battery from "expo-battery";
import { __mockApi as mockApi } from "./mocks/api-client";

const mockBattery = Battery as unknown as { getBatteryLevelAsync: jest.Mock };

describe("heartbeatService — reads real battery", () => {
  test("forwards real battery level (NOT hardcoded 1.0)", async () => {
    mockBattery.getBatteryLevelAsync.mockResolvedValueOnce(0.42);
    mockApi.heartbeat.mockResolvedValueOnce({});

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendHeartbeat } = require("../src/services/heartbeatService");
    await sendHeartbeat();

    expect(mockApi.heartbeat).toHaveBeenCalledWith(
      expect.objectContaining({ batteryLevel: 0.42 }),
    );
    expect(mockApi.heartbeat).not.toHaveBeenCalledWith(
      expect.objectContaining({ batteryLevel: 1.0 }),
    );
  });
});
