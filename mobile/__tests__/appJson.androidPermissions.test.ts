/**
 * RED static check — turns GREEN when Wave 1 updates mobile/app.json to:
 *   - android.permissions includes FOREGROUND_SERVICE_LOCATION
 *   - iOS NSLocationAlwaysAndWhenInUseUsageDescription present (already present today)
 *   - plugins array declares "expo-sqlite"
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require("../app.json");

describe("app.json — Phase 5 manifest requirements", () => {
  test("android.permissions includes FOREGROUND_SERVICE_LOCATION", () => {
    expect(appJson.expo.android.permissions).toContain("FOREGROUND_SERVICE_LOCATION");
  });

  test("iOS NSLocationAlwaysAndWhenInUseUsageDescription is present", () => {
    expect(appJson.expo.ios.infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription).toBeTruthy();
  });

  test("expo-sqlite plugin is declared", () => {
    expect(appJson.expo.plugins).toEqual(expect.arrayContaining(["expo-sqlite"]));
  });
});
