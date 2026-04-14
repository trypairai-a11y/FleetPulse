/**
 * Shared test utilities for route integration tests.
 *
 * The mocking is handled by moduleNameMapper in jest.config.js:
 *   - ../config       -> __tests__/mocks/config.ts    (prisma, redis, env)
 *   - ../middleware/auth      -> __tests__/mocks/auth.ts
 *   - ../middleware/tenantScope -> __tests__/mocks/tenantScope.ts
 *   - ../services/driverService -> __tests__/mocks/driverService.ts
 */

/**
 * Helper to retrieve the mocked prisma instance.
 */
export function getMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { prisma } = require("../config");
  return prisma;
}

/**
 * Reset all mock functions on the prisma instance.
 * Call in beforeEach() to get clean mock state per test.
 */
export function resetAllMocks() {
  const p = getMockPrisma();
  for (const [key, model] of Object.entries(p)) {
    if (key === "$transaction") {
      (model as jest.Mock).mockReset();
      continue;
    }
    if (model && typeof model === "object") {
      for (const fn of Object.values(model as Record<string, any>)) {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as jest.Mock).mockReset();
        }
      }
    }
  }
}
