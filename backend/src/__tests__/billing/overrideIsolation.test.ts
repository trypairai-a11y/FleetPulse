// Wave 0 RED test — turns GREEN in Wave 5. Do not skip.
//
// Behavior contract: a monthlyOverrideKd value on tenant A MUST NOT
// affect tenant B's bill. Defends against an accidental Prisma scope
// bug or globally-cached config that leaks design-partner pricing
// across tenants.
//
// REQ-pricing-model.

import { computeMonthlyBill } from "../../services/billing/billingService";
import { prisma } from "../mocks/config";

describe("REQ-pricing-model: override does not leak across tenants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Tenant A monthlyOverrideKd=100, Tenant B no override → tenant B = standard formula", async () => {
    const tenants: Record<string, any> = {
      "t-A": { id: "t-A", designPartner: true, monthlyOverrideKd: 100 },
      "t-B": { id: "t-B", designPartner: false, monthlyOverrideKd: null },
    };
    (prisma as any).tenant = {
      findFirst: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(tenants[where.id] ?? null),
      ),
    };

    const shiftRows: Record<string, any[]> = {
      "t-A": Array.from({ length: 80 }, (_, i) => ({
        driverId: `a-${i}`,
        tenantId: "t-A",
        actualHoursMinutes: 240,
        date: new Date("2026-05-01"),
      })),
      "t-B": Array.from({ length: 80 }, (_, i) => ({
        driverId: `b-${i}`,
        tenantId: "t-B",
        actualHoursMinutes: 240,
        date: new Date("2026-05-01"),
      })),
    };
    (prisma.shift.findMany as jest.Mock).mockImplementation(({ where }: any) =>
      Promise.resolve(shiftRows[where.tenantId] ?? []),
    );

    const billA = await computeMonthlyBill({
      tenantId: "t-A",
      yearMonth: "2026-05",
    });
    expect(billA.netKd).toBeCloseTo(100, 3);

    const billB = await computeMonthlyBill({
      tenantId: "t-B",
      yearMonth: "2026-05",
    });
    // Standard formula: 80 × 2 = 160 → floored to 200.
    expect(billB.netKd).toBeCloseTo(200, 3);
    // Belt and suspenders: B never gets A's KD 100 (override leakage).
    expect(billB.netKd).not.toBeCloseTo(100, 3);
  });
});
