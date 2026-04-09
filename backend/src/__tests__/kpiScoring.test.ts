/**
 * Unit tests for KPI score calculation logic.
 * Tests the core scoring formulas independently of the database.
 */

describe("KPI Score Calculation", () => {
  function calcScore(value: number, target: number, lowerIsBetter = false): number {
    if (target <= 0) return 0;
    const raw = (value / target) * 100;
    // For "lower is better" metrics, invert: 0 = 200%, target = 100%, 2x target = 0%
    if (lowerIsBetter) {
      return Math.max(0, Math.round((2 - value / target) * 100 * 100) / 100);
    }
    return Math.round(raw * 100) / 100;
  }

  describe("Standard (higher is better) KPIs", () => {
    test("100% of target = score 100", () => {
      expect(calcScore(18, 18)).toBe(100);
    });

    test("50% of target = score 50", () => {
      expect(calcScore(9, 18)).toBe(50);
    });

    test("150% of target = score 150 (over-performers allowed)", () => {
      expect(calcScore(27, 18)).toBe(150);
    });

    test("0 value = score 0", () => {
      expect(calcScore(0, 18)).toBe(0);
    });

    test("target 0 returns 0 (no division by zero)", () => {
      expect(calcScore(10, 0)).toBe(0);
    });
  });

  describe("Lower-is-better KPIs (e.g., Rejection Rate, Delivery Time)", () => {
    test("0 violations = max score (200)", () => {
      expect(calcScore(0, 5, true)).toBe(200);
    });

    test("Exactly at target = score 100", () => {
      expect(calcScore(5, 5, true)).toBe(100);
    });

    test("2x target = score 0", () => {
      expect(calcScore(10, 5, true)).toBe(0);
    });

    test("3x target = score clamped at 0 (not negative)", () => {
      expect(calcScore(15, 5, true)).toBe(0);
    });
  });

  describe("Weighted average aggregation", () => {
    function weightedAverage(scores: number[], weights: number[]): number {
      if (scores.length !== weights.length || weights.length === 0) return 0;
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      if (totalWeight === 0) return 0;
      const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
      return Math.round((weightedSum / totalWeight) * 100) / 100;
    }

    test("equal weights produces simple average", () => {
      expect(weightedAverage([100, 50], [1, 1])).toBe(75);
    });

    test("driver with 30 shifts outweighs driver with 1 shift", () => {
      // Driver A: 30 shifts, score 80. Driver B: 1 shift, score 20.
      // Simple avg = 50. Weighted avg should be closer to 80.
      const result = weightedAverage([80, 20], [30, 1]);
      expect(result).toBeGreaterThan(75);
    });

    test("zero weight drivers are excluded from calculation", () => {
      // A driver with no shifts (weight 0) should not affect the average
      expect(weightedAverage([100, 0], [5, 0])).toBe(100);
    });

    test("all zero weights returns 0", () => {
      expect(weightedAverage([100, 100], [0, 0])).toBe(0);
    });
  });

  describe("UTR calculation", () => {
    function calcUTR(totalOrders: number, workingHours: number): number {
      return workingHours > 0 ? Math.round((totalOrders / workingHours) * 100) / 100 : 0;
    }

    test("18 orders in 6 hours = UTR 3.0", () => {
      expect(calcUTR(18, 6)).toBe(3);
    });

    test("0 hours returns 0 (no division by zero)", () => {
      expect(calcUTR(10, 0)).toBe(0);
    });

    test("0 orders returns 0", () => {
      expect(calcUTR(0, 8)).toBe(0);
    });

    test("fractional UTR is rounded to 2 decimal places", () => {
      const utr = calcUTR(15, 7);
      expect(utr).toBe(2.14);
    });
  });
});
