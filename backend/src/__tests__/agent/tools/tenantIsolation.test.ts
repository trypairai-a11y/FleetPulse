// Wave 0 RED test — turns GREEN in Wave 3 (the 11 read tools).
// Do not skip.
//
// Behavior contract:
// Every read tool MUST scope its Prisma queries by ctx.tenantId. Two
// tenants are seeded; the tool is invoked with ctx.tenantId="tenant-A";
// the assertion is that the underlying Prisma findMany/aggregate/groupBy
// receives `where: { tenantId: "tenant-A", ... }`.
//
// REQ-tenant-scoped-everything: this file is RED until Wave 3 (01-03-PLAN.md)
// ships the 11 read tools.
//
// The 11 tools (per REQ-agent-read-tools, ROADMAP.md Phase 1 success
// criterion 2): revenueByDay, revenueByPlatform, revenueByZone,
// courierLeaderboard, courierProfile, violationsList, cashOutstanding,
// attendanceForPeriod, liveFleetStatus, gpsTrack, searchOrders.

import { prisma, agentMocks } from "../../mocks/config";
import { toolRegistry } from "../../../agent/registry";

// Wave 3 will populate `agent/tools/read/<name>.ts`; importing them
// registers the tool as a side-effect via toolRegistry.register().
// Each side-effect import is RED in Wave 0 until the file exists.
import "../../../agent/tools/read/revenueByDay";
import "../../../agent/tools/read/revenueByPlatform";
import "../../../agent/tools/read/revenueByZone";
import "../../../agent/tools/read/courierLeaderboard";
import "../../../agent/tools/read/courierProfile";
import "../../../agent/tools/read/violationsList";
import "../../../agent/tools/read/cashOutstanding";
import "../../../agent/tools/read/attendanceForPeriod";
import "../../../agent/tools/read/liveFleetStatus";
import "../../../agent/tools/read/gpsTrack";
import "../../../agent/tools/read/searchOrders";

const TENANT_A = "tenant-A";
const TENANT_B = "tenant-B";

const ctx = {
  tenantId: TENANT_A,
  agentId: "chat",
  runId: "run-1",
  actorRole: "ADMIN" as const,
  userId: "user-A",
};

// Seed BOTH tenants in every model that any read tool may touch.
// The mock returns whatever the tool's where clause filters; we assert
// on the where-clause itself (not the data) — that's what the contract
// says: tools MUST pass tenantId.
function seedAllModels() {
  const seedRow = (tenantId: string, extra: Record<string, unknown> = {}) => ({
    id: `${tenantId}-row`,
    tenantId,
    ...extra,
  });

  // OrderLog (revenue, searchOrders)
  (prisma.orderLog.findMany as jest.Mock).mockResolvedValue([
    seedRow(TENANT_A, { date: new Date(), totalAmount: 12.345 }),
  ]);
  (prisma.orderLog.aggregate as jest.Mock).mockResolvedValue({
    _sum: { totalAmount: 12.345 },
    _count: { id: 1 },
  });
  (prisma.orderLog.groupBy as jest.Mock).mockResolvedValue([
    {
      tenantId: TENANT_A,
      date: new Date(),
      _sum: { totalAmount: 12.345 },
      _count: { id: 1 },
    },
  ]);

  // Driver (courierLeaderboard, courierProfile, liveFleetStatus)
  (prisma.driver.findMany as jest.Mock).mockResolvedValue([
    seedRow(TENANT_A, { name: "Driver-A", platform: "KEETA" }),
  ]);
  (prisma.driver.findFirst as jest.Mock).mockResolvedValue(
    seedRow(TENANT_A, { name: "Driver-A" }),
  );
  (prisma.driver.findUnique as jest.Mock).mockResolvedValue(
    seedRow(TENANT_A, { name: "Driver-A" }),
  );
  (prisma.driver.count as jest.Mock).mockResolvedValue(1);

  // Violation (violationsList)
  // Mock the violation delegate inline since it's not in agentMocks
  (prisma as unknown as { violation: { findMany: jest.Mock } }).violation = {
    findMany: jest.fn().mockResolvedValue([seedRow(TENANT_A)]),
  };

  // CashRecord (cashOutstanding)
  (prisma.cashRecord.findMany as jest.Mock).mockResolvedValue([
    seedRow(TENANT_A),
  ]);
  (prisma.cashRecord.aggregate as jest.Mock).mockResolvedValue({
    _sum: { pendingDues: 100 },
  });

  // AttendanceRecord (attendanceForPeriod)
  // attendanceRecord exists in config.ts; mock findMany inline
  (
    prisma as unknown as {
      attendanceRecord: { findMany: jest.Mock };
    }
  ).attendanceRecord.findMany = jest.fn().mockResolvedValue([seedRow(TENANT_A)]);

  // LocationLog (gpsTrack) — declared inline as it's not in config.ts
  (prisma as unknown as { locationLog: { findMany: jest.Mock } }).locationLog =
    {
      findMany: jest.fn().mockResolvedValue([
        { ...seedRow(TENANT_A), lat: 29.3, lng: 47.9, recordedAt: new Date() },
      ]),
    };

  // CourierOnlineSession (liveFleetStatus) — declared inline
  (
    prisma as unknown as {
      courierOnlineSession: { findMany: jest.Mock };
    }
  ).courierOnlineSession = {
    findMany: jest.fn().mockResolvedValue([seedRow(TENANT_A)]),
  };
}

/**
 * Asserts the LAST call to a Prisma delegate carried tenantId === tenantA.
 */
function expectLastCallScopedTo(
  modelName: string,
  op: string,
  tenantId: string,
) {
  const delegate = (
    prisma as unknown as Record<string, Record<string, jest.Mock>>
  )[modelName]?.[op];
  expect(delegate).toBeTruthy();
  if (!delegate) return;
  const calls = (delegate as jest.Mock).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const lastCall = calls[calls.length - 1][0];
  // tenantId may live on top-level where, OR inside an AND/OR
  // — match top-level most commonly.
  const where = lastCall?.where ?? {};
  const ok =
    where.tenantId === tenantId ||
    (Array.isArray(where.AND) &&
      where.AND.some(
        (b: { tenantId?: string }) => b?.tenantId === tenantId,
      )) ||
    (Array.isArray(where.OR) &&
      where.OR.every(
        (b: { tenantId?: string }) => b?.tenantId === tenantId,
      ));
  expect(ok).toBe(true);
}

const TOOL_NAMES = [
  "revenueByDay",
  "revenueByPlatform",
  "revenueByZone",
  "courierLeaderboard",
  "courierProfile",
  "violationsList",
  "cashOutstanding",
  "attendanceForPeriod",
  "liveFleetStatus",
  "gpsTrack",
  "searchOrders",
] as const;

// Per-tool input templates so each invocation passes Zod validation.
// Wave 3's tool authors may tighten the shape; this is a hint.
const TOOL_INPUTS: Record<(typeof TOOL_NAMES)[number], unknown> = {
  revenueByDay: { dateFrom: "2026-05-01", dateTo: "2026-05-09" },
  revenueByPlatform: { dateFrom: "2026-05-01", dateTo: "2026-05-09" },
  revenueByZone: { dateFrom: "2026-05-01", dateTo: "2026-05-09" },
  courierLeaderboard: { dateFrom: "2026-05-01", dateTo: "2026-05-09" },
  courierProfile: { driverId: "driver-1" },
  violationsList: { dateFrom: "2026-05-01", dateTo: "2026-05-09" },
  cashOutstanding: {},
  attendanceForPeriod: { dateFrom: "2026-05-01", dateTo: "2026-05-09" },
  liveFleetStatus: {},
  gpsTrack: { driverId: "driver-1", since: "2026-05-09T00:00:00Z" },
  searchOrders: { query: "test" },
};

describe("Tenant isolation — REQ-tenant-scoped-everything (×11 read tools)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedAllModels();
  });

  for (const toolName of TOOL_NAMES) {
    test(`${toolName}: every Prisma read carries tenantId from ctx`, async () => {
      const result = await toolRegistry.invoke(
        toolName,
        ctx,
        TOOL_INPUTS[toolName],
      );
      expect(result.status).not.toBe("error");

      // For every Prisma model the tool may have touched, verify the
      // last call (if any) was scoped to ctx.tenantId === tenant-A.
      const candidates: Array<[string, string]> = [
        ["orderLog", "findMany"],
        ["orderLog", "aggregate"],
        ["orderLog", "groupBy"],
        ["driver", "findMany"],
        ["driver", "findFirst"],
        ["driver", "findUnique"],
        ["driver", "count"],
        ["violation", "findMany"],
        ["cashRecord", "findMany"],
        ["cashRecord", "aggregate"],
        ["attendanceRecord", "findMany"],
        ["locationLog", "findMany"],
        ["courierOnlineSession", "findMany"],
      ];
      for (const [model, op] of candidates) {
        const delegate = (
          prisma as unknown as Record<string, Record<string, jest.Mock>>
        )[model]?.[op];
        if (delegate && (delegate as jest.Mock).mock.calls.length > 0) {
          expectLastCallScopedTo(model, op, TENANT_A);
        }
      }
    });
  }

  // Sentinel: the agentMocks export is referenced (per plan key_links) so
  // a tool implementation refactor that reroutes through Prisma mocks
  // continues to flow through `__tests__/mocks/agentMocks.ts`.
  test("tenant-isolation fixture imports from agentMocks (key_links sentinel)", () => {
    expect(agentMocks).toBeDefined();
    expect(typeof agentMocks.agentAction.create).toBe("function");
  });
});
