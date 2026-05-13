/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.expo/",
    "/dist/",
    "/__tests__/mocks/",
    "/__tests__/setup.ts",
    "/__tests__/jest-globals.ts",
  ],
  setupFiles: ["<rootDir>/__tests__/jest-globals.ts"],
  moduleNameMapper: {
    "^@react-native-async-storage/async-storage$":
      "<rootDir>/__tests__/mocks/async-storage.ts",
    "^expo-sqlite$": "<rootDir>/__tests__/mocks/expo-sqlite.ts",
    "^expo-location$": "<rootDir>/__tests__/mocks/expo-location.ts",
    "^expo-task-manager$": "<rootDir>/__tests__/mocks/expo-task-manager.ts",
    "^expo-image-manipulator$": "<rootDir>/__tests__/mocks/expo-image-manipulator.ts",
    "^expo-camera$": "<rootDir>/__tests__/mocks/expo-camera.ts",
    "^expo-battery$": "<rootDir>/__tests__/mocks/expo-battery.ts",
    "^expo-application$": "<rootDir>/__tests__/mocks/expo-application.ts",
    "^expo-secure-store$": "<rootDir>/__tests__/mocks/expo-secure-store.ts",
    "^.*api/client$": "<rootDir>/__tests__/mocks/api-client.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@expo-google-fonts/.*|react-clone-referenced-element|@react-navigation/.*|@unimodules/.*|sentry-expo|native-base|react-native-svg)/)",
  ],
  clearMocks: true,
};
