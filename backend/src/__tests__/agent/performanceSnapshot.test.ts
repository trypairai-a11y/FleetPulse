// Wave 0 RED test — turns GREEN in Wave 2 when
// backend/src/agent/performanceSnapshot.ts ships with
// writePerformanceSnapshot(). Do not skip.
//
// Behavior contract:
// PerformanceSnapshot is daily per-driver. snapshotDate is truncated to
// UTC midnight. Upsert is keyed by (tenantId, driverId, snapshotDate).
// All 6 sub-scores (attendance, delivery, financial, equipment, platform,
// composite) + trend + breakdown JSON must persist.
// REQ-data-performance-snapshot.

import { writePerformanceSnapshot } from "../../agent/performanceSnapshot";
import { prisma } from "../mocks/config";

const baseInput = {
  tenantId: "t1",
  driverId: "driver-1",
  snapshotDate: new Date("2026-05-09T15:34:21.123Z"),
  compositeScore: 80,
  attendanceScore: 95,
  deliveryScore: 78,
  financialScore: 70,
  equipmentScore: 90,
  platformScore: 82,
  trend: "UP" as const,
};

describe("PerformanceSnapshot — REQ-data-performance-snapshot (daily writer)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.performanceSnapshot.upsert as jest.Mock).mockResolvedValue({
      id: "snap-1",
    });
  });

  test("snapshotDate is truncated to UTC midnight regardless of input time", async () => {
    await writePerformanceSnapshot(baseInput);
    const call = (prisma.performanceSnapshot.upsert as jest.Mock).mock
      .calls[0][0];
    const truncated: Date = call.create.snapshotDate ?? call.update.snapshotDate;
    expect(truncated.toISOString()).toBe("2026-05-09T00:00:00.000Z");
  });

  test("uses upsert with composite key (tenantId_driverId_snapshotDate)", async () => {
    await writePerformanceSnapshot(baseInput);
    const call = (prisma.performanceSnapshot.upsert as jest.Mock).mock
      .calls[0][0];
    // Prisma generates a composite-unique key joiner of the form
    // `tenantId_driverId_snapshotDate`. Tolerate either spelling.
    const where = call.where;
    expect(
      where.tenantId_driverId_snapshotDate ??
        (where.tenantId === "t1" && where.driverId === "driver-1"),
    ).toBeTruthy();
  });

  test("all 6 scores + trend persisted in upsert payload", async () => {
    await writePerformanceSnapshot({
      ...baseInput,
      ordersCount: 42,
      shiftsCount: 3,
      breakdown: { onTime: 0.92 },
    });
    const call = (prisma.performanceSnapshot.upsert as jest.Mock).mock
      .calls[0][0];
    const payload = call.create;
    expect(payload).toEqual(
      expect.objectContaining({
        compositeScore: 80,
        attendanceScore: 95,
        deliveryScore: 78,
        financialScore: 70,
        equipmentScore: 90,
        platformScore: 82,
        trend: "UP",
        ordersCount: 42,
        shiftsCount: 3,
        breakdown: { onTime: 0.92 },
      }),
    );
  });

  test("tenantId is required — empty string rejected", async () => {
    await expect(
      writePerformanceSnapshot({ ...baseInput, tenantId: "" }),
    ).rejects.toThrow();
  });
});
