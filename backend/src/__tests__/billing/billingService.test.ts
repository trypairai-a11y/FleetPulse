// Wave 0 RED test — turns GREEN in Wave 5 when
// backend/src/services/billing/billingService.ts ships
// computeMonthlyBill(). Do not skip.
//
// Behavior contract (CON-pricing-model + REQ-pricing-model):
//   - Standard: KD 2 × monthlyActiveCouriers, with a KD 200 floor.
//   - Design partner override: tenant.monthlyOverrideKd, when set,
//     beats the computed standard amount (used or not used as floor —
//     plan says override beats computed).
//   - "Active courier" = ≥240 actualHoursMinutes (4h) on at least one
//     day in the month (matches assumption A1 in 02-RESEARCH.md).
//
// REQ-pricing-model.

import { computeMonthlyBill } from "../../services/billing/billingService";
import { prisma } from "../mocks/config";

const TENANT = "t-bill-1";

function seedTenant(overrideKd: number | null = null) {
  (prisma as any).tenant = {
    findFirst: jest.fn().mockResolvedValue({
      id: TENANT,
      designPartner: overrideKd != null,
      monthlyOverrideKd: overrideKd,
    }),
  };
}

function seedShifts(activeCount: number, oneShortHours = false) {
  // active drivers: each has at least one shift with actualHoursMinutes >= 240
  const rows: any[] = [];
  for (let i = 0; i < activeCount; i++) {
    rows.push({
      driverId: `drv-${i}`,
      tenantId: TENANT,
      actualHoursMinutes: 240,
      date: new Date("2026-05-01"),
    });
  }
  if (oneShortHours) {
    // one driver whose ONLY shift is sub-threshold — must NOT count
    rows.push({
      driverId: "drv-short",
      tenantId: TENANT,
      actualHoursMinutes: 100,
      date: new Date("2026-05-01"),
    });
  }
  (prisma.shift.findMany as jest.Mock).mockResolvedValue(rows);
}

describe("REQ-pricing-model: computeMonthlyBill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedTenant();
  });

  test("150 active couriers, no override → netKd=300.000", async () => {
    seedShifts(150);
    const bill = await computeMonthlyBill({
      tenantId: TENANT,
      yearMonth: "2026-05",
    });
    expect(bill.netKd).toBeCloseTo(300, 3);
    expect(bill.activeCouriers).toBe(150);
  });

  test("50 active couriers, no override → netKd=200.000 (floor)", async () => {
    seedShifts(50);
    const bill = await computeMonthlyBill({
      tenantId: TENANT,
      yearMonth: "2026-05",
    });
    expect(bill.netKd).toBeCloseTo(200, 3);
    expect(bill.activeCouriers).toBe(50);
  });

  test("150 active couriers + monthlyOverrideKd=100 → netKd=100.000 (override beats computed)", async () => {
    seedTenant(100);
    seedShifts(150);
    const bill = await computeMonthlyBill({
      tenantId: TENANT,
      yearMonth: "2026-05",
    });
    expect(bill.netKd).toBeCloseTo(100, 3);
  });

  test("courier with one shift actualHoursMinutes=240 → counts as 1 active", async () => {
    seedShifts(1);
    const bill = await computeMonthlyBill({
      tenantId: TENANT,
      yearMonth: "2026-05",
    });
    expect(bill.activeCouriers).toBe(1);
  });

  test("courier with all shifts actualHoursMinutes<240 → NOT active", async () => {
    seedShifts(0, true); // only the sub-threshold driver row
    const bill = await computeMonthlyBill({
      tenantId: TENANT,
      yearMonth: "2026-05",
    });
    expect(bill.activeCouriers).toBe(0);
    expect(bill.netKd).toBeCloseTo(200, 3); // floor
  });
});
