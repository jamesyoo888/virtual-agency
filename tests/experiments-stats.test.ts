import { describe, it, expect } from "vitest";

import {
  rateString,
  wilsonLower,
  relativeLift,
  formatLift,
} from "@/lib/experiments-stats";

describe("experiments-stats", () => {
  describe("rateString", () => {
    it("formats percentage with 2 decimals", () => {
      expect(rateString(5, 100)).toBe("5.00%");
      expect(rateString(33, 100)).toBe("33.00%");
      expect(rateString(1, 3)).toBe("33.33%");
    });

    it("returns em dash when denominator is zero or negative", () => {
      expect(rateString(0, 0)).toBe("—");
      expect(rateString(5, 0)).toBe("—");
      expect(rateString(5, -1)).toBe("—");
    });
  });

  describe("wilsonLower", () => {
    it("returns 0 when total is zero", () => {
      expect(wilsonLower(0, 0)).toBe(0);
    });

    it("returns a positive lower bound for non-degenerate samples", () => {
      const w = wilsonLower(50, 100);
      expect(w).toBeGreaterThan(0.39);
      expect(w).toBeLessThan(0.5);
    });

    it("penalises small samples more strongly than large samples", () => {
      // 5/10 → very wide interval, low lower bound
      const small = wilsonLower(5, 10);
      // 50/100 → narrower interval, higher lower bound
      const large = wilsonLower(50, 100);
      expect(large).toBeGreaterThan(small);
    });

    it("approaches the rate as n grows", () => {
      const w = wilsonLower(5_000, 10_000);
      expect(Math.abs(w - 0.5)).toBeLessThan(0.02);
    });

    it("returns 0 (not negative) when the rate is zero", () => {
      expect(wilsonLower(0, 100)).toBe(0);
    });
  });

  describe("relativeLift", () => {
    it("returns null when baseline has no conversions", () => {
      expect(
        relativeLift(
          { impressions: 100, conversions: 5 },
          { impressions: 100, conversions: 0 }
        )
      ).toBeNull();
    });

    it("returns 0 when both rates match", () => {
      const lift = relativeLift(
        { impressions: 100, conversions: 10 },
        { impressions: 200, conversions: 20 }
      );
      expect(lift).toBe(0);
    });

    it("returns positive when variant beats baseline", () => {
      const lift = relativeLift(
        { impressions: 100, conversions: 20 },
        { impressions: 100, conversions: 10 }
      );
      // 0.20 vs 0.10 → +100%
      expect(lift).toBeCloseTo(1.0, 5);
    });

    it("returns negative when variant loses", () => {
      const lift = relativeLift(
        { impressions: 100, conversions: 5 },
        { impressions: 100, conversions: 10 }
      );
      // 0.05 vs 0.10 → -50%
      expect(lift).toBeCloseTo(-0.5, 5);
    });
  });

  describe("formatLift", () => {
    it("formats positive lift with + sign", () => {
      expect(formatLift(0.123)).toBe("+12.3%");
    });

    it("formats negative lift with - sign", () => {
      expect(formatLift(-0.123)).toBe("-12.3%");
    });

    it("returns em dash for null", () => {
      expect(formatLift(null)).toBe("—");
    });

    it("formats zero without a sign suffix that misleads", () => {
      expect(formatLift(0)).toBe("0.0%");
    });
  });
});
