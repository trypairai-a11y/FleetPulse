/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^../config$": "<rootDir>/src/__tests__/mocks/config.ts",
    "^../config/(.*)$": "<rootDir>/src/__tests__/mocks/config.ts",
    "^./notificationService$": "<rootDir>/src/__tests__/mocks/notificationService.ts",
    "^../middleware/auth$": "<rootDir>/src/__tests__/mocks/auth.ts",
    "^../middleware/tenantScope$": "<rootDir>/src/__tests__/mocks/tenantScope.ts",
    "^../services/driverService$": "<rootDir>/src/__tests__/mocks/driverService.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { strict: false } }],
  },
};
