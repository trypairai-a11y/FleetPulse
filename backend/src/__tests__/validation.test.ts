import {
  createDriverSchema,
  createShiftSchema,
  createCashRecordSchema,
  createTalabatSessionSchema,
  createOrderSchema,
  createLeaveRequestSchema,
  createKpiRecordSchema,
} from "../utils/validate";

describe("Zod validation schemas", () => {
  describe("createDriverSchema", () => {
    const base = {
      name: "Ahmed Ali",
      phone: "+96599999999",
      platform: "TALABAT",
      companyId: "comp-1",
    };

    test("accepts a minimal valid driver", () => {
      expect(createDriverSchema.safeParse(base).success).toBe(true);
    });

    test("rejects short names", () => {
      const r = createDriverSchema.safeParse({ ...base, name: "A" });
      expect(r.success).toBe(false);
    });

    test("rejects unknown platform", () => {
      const r = createDriverSchema.safeParse({ ...base, platform: "UBER" });
      expect(r.success).toBe(false);
    });

    test("defaults status to ACTIVE", () => {
      const r = createDriverSchema.safeParse(base);
      expect(r.success && r.data.status).toBe("ACTIVE");
    });

    test("rejects negative salary", () => {
      const r = createDriverSchema.safeParse({ ...base, salary: -100 });
      expect(r.success).toBe(false);
    });
  });

  describe("createShiftSchema", () => {
    test("accepts a valid shift", () => {
      const r = createShiftSchema.safeParse({
        driverId: "drv-1",
        platform: "TALABAT",
        date: "2026-04-11",
      });
      expect(r.success).toBe(true);
    });

    test("rejects invalid date", () => {
      const r = createShiftSchema.safeParse({
        driverId: "drv-1",
        platform: "TALABAT",
        date: "not-a-date",
      });
      expect(r.success).toBe(false);
    });

    test("rejects plannedHoursMinutes > 1440", () => {
      const r = createShiftSchema.safeParse({
        driverId: "drv-1",
        platform: "TALABAT",
        date: "2026-04-11",
        plannedHoursMinutes: 2000,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("createCashRecordSchema", () => {
    test("accepts minimal record", () => {
      const r = createCashRecordSchema.safeParse({
        driverId: "drv-1",
        date: "2026-04-11",
        salesAmount: 25.5,
      });
      expect(r.success).toBe(true);
    });

    test("rejects negative salesAmount", () => {
      const r = createCashRecordSchema.safeParse({
        driverId: "drv-1",
        date: "2026-04-11",
        salesAmount: -1,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("createTalabatSessionSchema", () => {
    test("accepts minimal session", () => {
      const r = createTalabatSessionSchema.safeParse({
        driverId: "drv-1",
        date: "2026-04-11",
      });
      expect(r.success).toBe(true);
    });

    test("rejects unknown status", () => {
      const r = createTalabatSessionSchema.safeParse({
        driverId: "drv-1",
        date: "2026-04-11",
        status: "QUEUED",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("createOrderSchema", () => {
    test("accepts valid order", () => {
      const r = createOrderSchema.safeParse({
        driverId: "drv-1",
        platform: "KEETA",
        date: "2026-04-11",
        orderCount: 12,
      });
      expect(r.success).toBe(true);
    });

    test("rejects fractional orderCount", () => {
      const r = createOrderSchema.safeParse({
        driverId: "drv-1",
        platform: "KEETA",
        date: "2026-04-11",
        orderCount: 2.5,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("createLeaveRequestSchema", () => {
    test("rejects end before start", () => {
      const r = createLeaveRequestSchema.safeParse({
        driverId: "drv-1",
        startDate: "2026-04-15",
        endDate: "2026-04-10",
        type: "ANNUAL",
      });
      expect(r.success).toBe(false);
    });

    test("accepts equal start and end", () => {
      const r = createLeaveRequestSchema.safeParse({
        driverId: "drv-1",
        startDate: "2026-04-11",
        endDate: "2026-04-11",
        type: "SICK",
      });
      expect(r.success).toBe(true);
    });
  });

  describe("createKpiRecordSchema", () => {
    test("rejects non-positive target", () => {
      const r = createKpiRecordSchema.safeParse({
        driverId: "drv-1",
        kpiDefinitionId: "k-1",
        date: "2026-04-11",
        value: 10,
        target: 0,
      });
      expect(r.success).toBe(false);
    });
  });
});
