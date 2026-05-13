// Phase 6 Wave 0 RED — Turns GREEN when Wave 4 ships
// backend/src/queues/pullChunkPhase6.ts.
//
// REQ-ingest-adapter-layer / BLOCKER 4: pullChunkPhase6 contract.
// - Calls fetchOrders + fetchShifts + fetchAttendance + fetchViolations
// - NEVER calls fetchCash (XLSX-import-only)
// - NotAvailable from one capability does NOT abort the chunk
// - Non-NotAvailable errors captured in errors[] / IngestRun.errorLog
// - Writes exactly 1 IngestRun row per chunk with source='BACKWASH'

jest.mock("../../config", () => ({
  prisma: {
    ingestRun: { create: jest.fn() },
  },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const fetchOrdersSpy = jest.fn(async () => []);
const fetchShiftsSpy = jest.fn(async () => []);
const fetchAttendanceSpy = jest.fn(async () => []);
const fetchViolationsSpy = jest.fn(async () => []);
const fetchCashSpy = jest.fn(async () => []);

jest.mock("../../services/ingest/registry", () => ({
  getAdapter: jest.fn(() => ({
    platform: "KEETA",
    source: "COMPOSITE",
    isAvailable: async () => true,
    fetchOrders: fetchOrdersSpy,
    fetchShifts: fetchShiftsSpy,
    fetchAttendance: fetchAttendanceSpy,
    fetchViolations: fetchViolationsSpy,
    fetchCash: fetchCashSpy,
  })),
}));

import { pullChunkPhase6 } from "../../queues/pullChunkPhase6";
import { prisma } from "../../config";
import { NotAvailable } from "../../services/ingest/types";

describe("Phase 6 / REQ-ingest-adapter-layer: pullChunkPhase6 chunk handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchOrdersSpy.mockImplementation(async () => []);
    fetchShiftsSpy.mockImplementation(async () => []);
    fetchAttendanceSpy.mockImplementation(async () => []);
    fetchViolationsSpy.mockImplementation(async () => []);
    fetchCashSpy.mockImplementation(async () => []);
    (prisma.ingestRun.create as jest.Mock).mockResolvedValue({ id: "run-1" });
  });

  test("calls getAdapter(args.platform).fetchOrders + fetchShifts + fetchAttendance + fetchViolations", async () => {
    await pullChunkPhase6({
      tenantId: "t-1",
      platform: "KEETA",
      from: "2026-05-01",
      to: "2026-05-06",
    } as any);
    expect(fetchOrdersSpy).toHaveBeenCalled();
    expect(fetchShiftsSpy).toHaveBeenCalled();
    expect(fetchAttendanceSpy).toHaveBeenCalled();
    expect(fetchViolationsSpy).toHaveBeenCalled();
  });

  test("does NOT call adapter.fetchCash (XLSX-import-only)", async () => {
    await pullChunkPhase6({
      tenantId: "t-1",
      platform: "KEETA",
      from: "2026-05-01",
      to: "2026-05-06",
    } as any);
    expect(fetchCashSpy).not.toHaveBeenCalled();
  });

  test("NotAvailable thrown by ONE capability does NOT abort the chunk", async () => {
    fetchShiftsSpy.mockImplementation(async () => {
      throw new NotAvailable("shifts offline");
    });
    const result = await pullChunkPhase6({
      tenantId: "t-1",
      platform: "KEETA",
      from: "2026-05-01",
      to: "2026-05-06",
    } as any);
    expect(result).toHaveProperty("rowsOk");
    expect(fetchOrdersSpy).toHaveBeenCalled();
    expect(fetchAttendanceSpy).toHaveBeenCalled();
    expect(fetchViolationsSpy).toHaveBeenCalled();
  });

  test("non-NotAvailable error from one capability captured in errors[] / IngestRun.errorLog", async () => {
    fetchOrdersSpy.mockImplementation(async () => {
      throw new Error("boom");
    });
    const result = await pullChunkPhase6({
      tenantId: "t-1",
      platform: "KEETA",
      from: "2026-05-01",
      to: "2026-05-06",
    } as any);
    // Worker MUST NOT propagate to caller — entire chunk-level failure is logged.
    expect(result).toHaveProperty("rowsOk");
    const calls = (prisma.ingestRun.create as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCallData = calls[calls.length - 1][0].data;
    expect(lastCallData.errorLog).toMatch(/boom/);
  });

  test("writes exactly 1 IngestRun row per chunk with source='BACKWASH'", async () => {
    await pullChunkPhase6({
      tenantId: "t-1",
      platform: "KEETA",
      from: "2026-05-01",
      to: "2026-05-06",
    } as any);
    expect(prisma.ingestRun.create).toHaveBeenCalledTimes(1);
    const data = (prisma.ingestRun.create as jest.Mock).mock.calls[0][0].data;
    expect(data.tenantId).toBe("t-1");
    expect(data.platform).toBe("KEETA");
    expect(data.source).toBe("BACKWASH");
    expect(data.startedAt).toBeInstanceOf(Date);
    expect(data.finishedAt).toBeInstanceOf(Date);
  });

  test("returns {rowsOk} excluding cash contributions", async () => {
    fetchOrdersSpy.mockImplementation(async () => [
      { source: "MOBILE_GPS", tenantId: "t-1", platform: "KEETA", data: { o: 1 } } as any,
      { source: "MOBILE_GPS", tenantId: "t-1", platform: "KEETA", data: { o: 2 } } as any,
    ]);
    const result = await pullChunkPhase6({
      tenantId: "t-1",
      platform: "KEETA",
      from: "2026-05-01",
      to: "2026-05-06",
    } as any);
    expect(result.rowsOk).toBeGreaterThanOrEqual(0);
    expect(fetchCashSpy).not.toHaveBeenCalled();
  });
});

// RED — turned GREEN by Wave 4. File contains "pullChunkPhase6" pin.
