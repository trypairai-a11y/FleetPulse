// Mock Prisma and Redis for unit tests
export const prisma = {
  alert: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  talabatViolationEvent: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  driver: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  shift: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  cashRecord: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  pendingDuesLedger: {
    findMany: jest.fn(),
  },
  talabatSession: {
    findMany: jest.fn(),
  },
  attendanceRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  platformSettings: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  leaveRequest: {
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

export const redis = null;
export const env = { PORT: 3001, JWT_SECRET: "test", JWT_REFRESH_SECRET: "test", REDIS_URL: "" };
