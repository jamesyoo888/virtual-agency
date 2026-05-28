import { describe, it, expect } from "vitest";
import { applyCalculatorPrefills } from "@/lib/rfp/calculator-prefill";

describe("applyCalculatorPrefills", () => {
  it("returns empty / non-calculator state when no calculator params", () => {
    const r = applyCalculatorPrefills({});
    expect(r.durationDays).toBe("");
    expect(r.message).toBe("");
    expect(r.needsExclusive).toBe(false);
    expect(r.fromCalculator).toBe(false);
  });

  it("maps weeks → duration_days (×7) when duration_days not already set", () => {
    const r = applyCalculatorPrefills({ weeks: "12" });
    expect(r.durationDays).toBe("84");
    expect(r.fromCalculator).toBe(true);
  });

  it("does NOT overwrite explicit duration_days", () => {
    const r = applyCalculatorPrefills({ weeks: "12", duration_days: "30" });
    expect(r.durationDays).toBe("30");
  });

  it("composes message hint from assets/weeks/markets when message empty (ko)", () => {
    const r = applyCalculatorPrefills(
      { assets: "40", weeks: "12", markets: "2", exclusive: "1" },
      "ko"
    );
    expect(r.message).toContain("40 어셋");
    expect(r.message).toContain("12주");
    expect(r.message).toContain("2 시장");
    expect(r.message).toContain("카테고리 독점");
    expect(r.needsExclusive).toBe(true);
    expect(r.fromCalculator).toBe(true);
  });

  it("composes message hint in English when locale=en", () => {
    const r = applyCalculatorPrefills(
      { assets: "40", weeks: "12", markets: "2", exclusive: "1" },
      "en"
    );
    expect(r.message).toContain("40 assets");
    expect(r.message).toContain("12 weeks");
    expect(r.message).toContain("2 markets");
    expect(r.message).toContain("category-exclusive");
  });

  it("uses singular `market` for markets=1", () => {
    const r = applyCalculatorPrefills(
      { assets: "10", weeks: "4", markets: "1" },
      "en"
    );
    expect(r.message).toContain("1 market");
    expect(r.message).not.toContain("1 markets");
  });

  it("does NOT overwrite explicit message", () => {
    const r = applyCalculatorPrefills({
      assets: "40",
      message: "buyer-supplied message",
    });
    expect(r.message).toBe("buyer-supplied message");
  });

  it("accepts exclusive=1 OR exclusive=true", () => {
    expect(applyCalculatorPrefills({ exclusive: "1" }).needsExclusive).toBe(
      true
    );
    expect(applyCalculatorPrefills({ exclusive: "true" }).needsExclusive).toBe(
      true
    );
    expect(applyCalculatorPrefills({ exclusive: "false" }).needsExclusive).toBe(
      false
    );
    expect(applyCalculatorPrefills({}).needsExclusive).toBe(false);
  });

  it("rejects non-positive integers", () => {
    const r = applyCalculatorPrefills({
      assets: "-5",
      weeks: "0",
      markets: "abc",
    });
    expect(r.fromCalculator).toBe(false);
    expect(r.durationDays).toBe("");
    expect(r.message).toBe("");
  });

  it("fromCalculator=true even when only exclusive flag is set (no integers)", () => {
    // exclusive alone doesn't trigger the message hint — buyer might have
    // toggled it manually on a /rfp visit. fromCalculator stays false.
    const r = applyCalculatorPrefills({ exclusive: "1" });
    expect(r.fromCalculator).toBe(false);
    expect(r.needsExclusive).toBe(true);
  });
});
