/**
 * Test bootstrap — runs before each test.
 * Resets all module mocks + in-memory mock stores.
 *
 * Wired via jest.config.js → setupFilesAfterEach: ["<rootDir>/__tests__/setup.ts"]
 */

import * as ExpoSqliteMock from "./mocks/expo-sqlite";
import * as ExpoSecureStoreMock from "./mocks/expo-secure-store";
import * as ExpoTaskManagerMock from "./mocks/expo-task-manager";

beforeEach(() => {
  jest.clearAllMocks();
  ExpoSqliteMock.__resetDb();
  ExpoSecureStoreMock.__resetStore();
  ExpoTaskManagerMock.__resetTasks();
});
