// Wave 0 RED test — turns GREEN in Wave 4 when
// backend/src/services/onboarding/reportBuilder.ts ships
// buildOnboardingReport(). Do not skip.
//
// Behavior contract (REQ-gtm-onboarding + UI-SPEC §3.4.3):
// buildOnboardingReport returns ReportData with all 9 sections
// present. 8 are fixed-shape; the 9th (whatDarbWouldHaveDone) is an
// array of 0..10 ReportCard objects each conforming to:
//   { action: string, reasoning: string, courierName: string,
//     dateRange: { from: string, to: string } }
//
// The seed-design-partner-fixture script (Plan 04) ensures ≥10
// PendingAgentAction rows exist for the design-partner-1 dry-run, so
// the production report returns exactly 10 cards. The unit test here
// only checks SHAPE, not LENGTH (≥0 cards, each shape-conforming).

import { buildOnboardingReport } from "../../services/onboarding/reportBuilder";
import { prisma } from "../mocks/config";

const TENANT = "t-onb-1";

describe("REQ-gtm-onboarding: Darb's read on your fleet — report shape", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (prisma as any).tenant = {
      findFirst: jest.fn().mockResolvedValue({
        id: TENANT,
        name: "Acme Fleet",
        fleetSize: 142,
        designPartner: true,
        monthlyOverrideKd: 100,
      }),
    };
    (prisma.driver.findMany as jest.Mock).mockResolvedValue([
      { id: "d1", name: "Ali", tenantId: TENANT },
    ]);
    (prisma.driver.count as jest.Mock).mockResolvedValue(142);
    (prisma.orderLog.aggregate as jest.Mock).mockResolvedValue({
      _sum: { totalAmount: 4200.5 },
      _count: { id: 1500 },
    });
    (prisma.cashRecord.aggregate as jest.Mock).mockResolvedValue({
      _sum: { pendingDues: 320.0 },
    });
    (prisma.cashRecord.findMany as jest.Mock).mockResolvedValue([]);
    (prisma as any).violation = { findMany: jest.fn().mockResolvedValue([]) };
    (prisma as any).pendingAgentAction.findMany = jest
      .fn()
      .mockResolvedValue([
        // 3 sample rows — shape test does NOT require 10.
        {
          id: "pa-1",
          tenantId: TENANT,
          toolName: "draftCourierMessage",
          recommendation: "approve",
          reasoning: "3 late clock-ins this week.",
          subjectType: "Driver",
          subjectId: "d1",
          createdAt: new Date("2026-05-09T06:31:00Z"),
        },
      ]);
  });

  test("returns ReportData with all 9 sections present (8 fixed + whatDarbWouldHaveDone array)", async () => {
    const report = await buildOnboardingReport({
      tenantId: TENANT,
      windowDays: 30,
    });

    expect(report).toEqual(
      expect.objectContaining({
        cover: expect.any(Object),
        topLineNumbers: expect.any(Object),
        top5Performers: expect.any(Array),
        bottom5Performers: expect.any(Array),
        cashExposure: expect.any(Object),
        violations: expect.any(Object),
        whatDarbWouldHaveDone: expect.any(Array),
        whatThisCosts: expect.any(Object),
        footer: expect.any(Object),
      }),
    );

    // whatDarbWouldHaveDone is an array of 0..10 ReportCard objects,
    // each conforming to the documented shape.
    expect(report.whatDarbWouldHaveDone.length).toBeGreaterThanOrEqual(0);
    expect(report.whatDarbWouldHaveDone.length).toBeLessThanOrEqual(10);
    for (const card of report.whatDarbWouldHaveDone) {
      expect(card).toEqual(
        expect.objectContaining({
          action: expect.any(String),
          reasoning: expect.any(String),
          courierName: expect.any(String),
          dateRange: expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
          }),
        }),
      );
    }
  });
});
