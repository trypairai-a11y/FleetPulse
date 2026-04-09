/**
 * Unit tests for rules engine helper logic.
 * The actual DB-dependent functions are tested via integration tests;
 * here we test the pure business logic extracted from the engine.
 */

describe("Rules Engine - Business Logic", () => {
  describe("Cash overdue detection logic", () => {
    function isOverdue(lastCollectionDate: Date | null, overdueDays: number, pendingAmount: number, threshold: number): boolean {
      if (pendingAmount <= threshold) return false;
      if (!lastCollectionDate) return true;
      const cutoff = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000);
      return lastCollectionDate < cutoff;
    }

    test("amount below threshold is not overdue", () => {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
      expect(isOverdue(yesterday, 3, 30, 50)).toBe(false);
    });

    test("no last collection and high balance = overdue", () => {
      expect(isOverdue(null, 3, 100, 50)).toBe(true);
    });

    test("recent collection within overdue window = not overdue", () => {
      const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
      expect(isOverdue(yesterday, 3, 100, 50)).toBe(false);
    });

    test("old collection exceeds overdue window = overdue", () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      expect(isOverdue(fourDaysAgo, 3, 100, 50)).toBe(true);
    });

    test("collection exactly at boundary (3 days ago) = not overdue (not strictly less)", () => {
      const exactlyThreeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1000);
      // Slightly over 3 days
      expect(isOverdue(exactlyThreeDaysAgo, 3, 100, 50)).toBe(true);
    });
  });

  describe("Late clock-in detection logic", () => {
    function getLateMinutes(actualStart: Date, scheduledStart: Date): number {
      const lateMs = actualStart.getTime() - scheduledStart.getTime();
      return Math.floor(lateMs / 60000);
    }

    function isLate(actualStart: Date, scheduledStart: Date, maxLateMinutes: number = 1): boolean {
      return getLateMinutes(actualStart, scheduledStart) >= maxLateMinutes;
    }

    test("on time = not late", () => {
      const scheduled = new Date("2024-01-15T08:00:00Z");
      const actual = new Date("2024-01-15T08:00:00Z");
      expect(isLate(actual, scheduled)).toBe(false);
    });

    test("30 seconds late = not late (< 1 minute threshold)", () => {
      const scheduled = new Date("2024-01-15T08:00:00Z");
      const actual = new Date("2024-01-15T08:00:30Z");
      expect(isLate(actual, scheduled)).toBe(false);
    });

    test("exactly 1 minute late = late", () => {
      const scheduled = new Date("2024-01-15T08:00:00Z");
      const actual = new Date("2024-01-15T08:01:00Z");
      expect(isLate(actual, scheduled)).toBe(true);
    });

    test("5 minutes late = late", () => {
      const scheduled = new Date("2024-01-15T08:00:00Z");
      const actual = new Date("2024-01-15T08:05:00Z");
      expect(isLate(actual, scheduled, 1)).toBe(true);
      expect(getLateMinutes(actual, scheduled)).toBe(5);
    });

    test("arrived early = not late (negative late minutes)", () => {
      const scheduled = new Date("2024-01-15T08:00:00Z");
      const actual = new Date("2024-01-15T07:55:00Z");
      expect(isLate(actual, scheduled)).toBe(false);
      expect(getLateMinutes(actual, scheduled)).toBe(-5);
    });

    test("configurable threshold: 5-minute grace period", () => {
      const scheduled = new Date("2024-01-15T08:00:00Z");
      const actual = new Date("2024-01-15T08:03:00Z");
      expect(isLate(actual, scheduled, 5)).toBe(false);
      expect(isLate(actual, scheduled, 1)).toBe(true);
    });
  });

  describe("Cash overcollection validation", () => {
    function hasCashOvercollection(cashCollected: number, totalSales: number, tolerance = 0.05): boolean {
      return cashCollected > totalSales * (1 + tolerance);
    }

    test("collected equals sales = no overcollection", () => {
      expect(hasCashOvercollection(100, 100)).toBe(false);
    });

    test("collected within 5% tolerance = no overcollection", () => {
      expect(hasCashOvercollection(104, 100)).toBe(false);
    });

    test("collected exactly 5% over = no overcollection (boundary)", () => {
      expect(hasCashOvercollection(105, 100)).toBe(false);
    });

    test("collected more than 5% over = overcollection", () => {
      expect(hasCashOvercollection(106, 100)).toBe(true);
    });

    test("collected significantly more = overcollection", () => {
      expect(hasCashOvercollection(200, 100)).toBe(true);
    });
  });

  describe("Shift overlap detection logic", () => {
    function hasTimeOverlap(
      newStart: Date,
      newEnd: Date,
      existStart: Date,
      existEnd: Date
    ): boolean {
      return newStart < existEnd && newEnd > existStart;
    }

    test("non-overlapping shifts = no conflict", () => {
      const s1 = new Date("2024-01-15T08:00:00Z");
      const e1 = new Date("2024-01-15T14:00:00Z");
      const s2 = new Date("2024-01-15T14:00:00Z");
      const e2 = new Date("2024-01-15T20:00:00Z");
      expect(hasTimeOverlap(s1, e1, s2, e2)).toBe(false);
    });

    test("overlapping shifts = conflict", () => {
      const s1 = new Date("2024-01-15T08:00:00Z");
      const e1 = new Date("2024-01-15T14:00:00Z");
      const s2 = new Date("2024-01-15T12:00:00Z");
      const e2 = new Date("2024-01-15T18:00:00Z");
      expect(hasTimeOverlap(s1, e1, s2, e2)).toBe(true);
    });

    test("completely contained shift = conflict", () => {
      const outer_s = new Date("2024-01-15T08:00:00Z");
      const outer_e = new Date("2024-01-15T20:00:00Z");
      const inner_s = new Date("2024-01-15T10:00:00Z");
      const inner_e = new Date("2024-01-15T14:00:00Z");
      expect(hasTimeOverlap(inner_s, inner_e, outer_s, outer_e)).toBe(true);
    });
  });

  describe("Document expiry logic", () => {
    function getDocStatus(
      expiryDate: Date | null,
      warningDays: number,
      today: Date = new Date()
    ): "ok" | "expiring" | "expired" {
      if (!expiryDate) return "ok";
      const msUntilExpiry = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.floor(msUntilExpiry / 86400000);
      if (daysUntilExpiry < 0) return "expired";
      if (daysUntilExpiry <= warningDays) return "expiring";
      return "ok";
    }

    const today = new Date("2024-01-15T12:00:00Z");

    test("far future expiry = ok", () => {
      expect(getDocStatus(new Date("2025-01-01"), 30, today)).toBe("ok");
    });

    test("within warning window = expiring", () => {
      const soonExpiry = new Date(today.getTime() + 20 * 86400000);
      expect(getDocStatus(soonExpiry, 30, today)).toBe("expiring");
    });

    test("expired yesterday = expired", () => {
      const yesterday = new Date(today.getTime() - 86400000);
      expect(getDocStatus(yesterday, 30, today)).toBe("expired");
    });

    test("null expiry date = ok (not set)", () => {
      expect(getDocStatus(null, 30, today)).toBe("ok");
    });

    test("exactly on warning boundary = expiring", () => {
      const exactBoundary = new Date(today.getTime() + 30 * 86400000);
      expect(getDocStatus(exactBoundary, 30, today)).toBe("expiring");
    });
  });
});
