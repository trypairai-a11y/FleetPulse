/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^../config$": "<rootDir>/src/__tests__/mocks/config.ts",
    "^../config/(.*)$": "<rootDir>/src/__tests__/mocks/config.ts",
    // Phase 2 Wave 2: services nested 2 levels deep
    // (e.g. src/services/decisions/*) import "../../config".
    // 3-level paths (src/agent/tools/{read,action}/*) intentionally
    // resolve to the real prisma client — Phase 1 read-tool tests
    // assert against the registry surface, not the underlying client,
    // so leaving those unmapped preserves the prior equilibrium.
    "^\\.\\./\\.\\./config$": "<rootDir>/src/__tests__/mocks/config.ts",
    "^\\.\\./\\.\\./config/(.*)$": "<rootDir>/src/__tests__/mocks/config.ts",
    "^./notificationService$": "<rootDir>/src/__tests__/mocks/notificationService.ts",
    "^../middleware/auth$": "<rootDir>/src/__tests__/mocks/auth.ts",
    "^../middleware/tenantScope$": "<rootDir>/src/__tests__/mocks/tenantScope.ts",
    "^../services/driverService$": "<rootDir>/src/__tests__/mocks/driverService.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { strict: false } }],
  },
};
