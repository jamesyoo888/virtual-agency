import { describe, it, expect } from "vitest";
import { estimate, pathLabel, rfpHrefFromInputs } from "@/lib/pricing/calculator";

describe("pricing calculator estimate", () => {
  it("recommends traditional when scope is tiny single-market burst", () => {
    const out = estimate({
      assetCount: 6,
      seasonWeeks: 3,
      marketCount: 1,
      needsExclusive: false,
    });
    expect(out.recommendedPath).toBe("traditional_competitive");
    // Traditional comp range is bounded, not absurd.
    expect(out.krwLow).toBeGreaterThan(0);
    expect(out.krwHigh).toBeLessThan(20_000_000);
  });

  it("recommends license_daily for medium scope without exclusivity", () => {
    const out = estimate({
      assetCount: 20,
      seasonWeeks: 6,
      marketCount: 1,
      needsExclusive: false,
    });
    expect(out.recommendedPath).toBe("license_daily");
    expect(out.anchorTier).toBeNull();
  });

  it("recommends paired editorial for mid quarterly launch", () => {
    const out = estimate({
      assetCount: 40,
      seasonWeeks: 8,
      marketCount: 1,
      needsExclusive: true,
    });
    expect(out.recommendedPath).toBe("paired_editorial");
    expect(out.anchorTier?.slug).toBe("paired");
    // Anchored above the brand-kit floor.
    expect(out.krwLow).toBeGreaterThanOrEqual(11_000_000);
  });

  it("recommends season anchor for cross-market or quarter+", () => {
    const out = estimate({
      assetCount: 60,
      seasonWeeks: 12,
      marketCount: 4,
      needsExclusive: true,
    });
    expect(out.recommendedPath).toBe("season_anchor");
    expect(out.anchorTier?.slug).toBe("season");
    // Extra-market localization adds visible cost.
    expect(out.krwLow).toBeGreaterThan(28_500_000);
  });

  it("recommends custom build for year-long heavy exclusivity scope", () => {
    const out = estimate({
      assetCount: 200,
      seasonWeeks: 36,
      marketCount: 4,
      needsExclusive: true,
    });
    expect(out.recommendedPath).toBe("custom_build");
    expect(out.anchorTier?.slug).toBe("custom");
    // Anchored above the custom floor.
    expect(out.krwLow).toBeGreaterThanOrEqual(65_000_000);
  });

  it("low estimate always ≤ high estimate", () => {
    const cases = [
      { assetCount: 5, seasonWeeks: 1, marketCount: 1, needsExclusive: false },
      { assetCount: 30, seasonWeeks: 8, marketCount: 2, needsExclusive: true },
      { assetCount: 60, seasonWeeks: 12, marketCount: 4, needsExclusive: true },
      { assetCount: 200, seasonWeeks: 52, marketCount: 4, needsExclusive: true },
    ];
    for (const c of cases) {
      const out = estimate(c);
      expect(out.krwLow).toBeLessThanOrEqual(out.krwHigh);
      expect(out.usdLow).toBeLessThanOrEqual(out.usdHigh);
    }
  });

  it("traditional benchmark scales with market count", () => {
    const single = estimate({
      assetCount: 30,
      seasonWeeks: 8,
      marketCount: 1,
      needsExclusive: false,
    });
    const four = estimate({
      assetCount: 30,
      seasonWeeks: 8,
      marketCount: 4,
      needsExclusive: false,
    });
    expect(single.traditionalKrwHigh).not.toBeNull();
    expect(four.traditionalKrwHigh).not.toBeNull();
    // Cross-market should cost meaningfully more on traditional.
    expect(four.traditionalKrwHigh!).toBeGreaterThan(single.traditionalKrwHigh!);
  });

  it("exclusivity uplifts license tier KRW", () => {
    const base = estimate({
      assetCount: 18,
      seasonWeeks: 5,
      marketCount: 1,
      needsExclusive: false,
    });
    const exclusive = estimate({
      assetCount: 18,
      seasonWeeks: 5,
      marketCount: 1,
      needsExclusive: true,
    });
    // Same path, but exclusivity should push the range up.
    expect(base.recommendedPath).toBe("license_daily");
    expect(exclusive.krwHigh).toBeGreaterThan(base.krwHigh);
  });

  it("rfp href encodes inputs and recommended path as utm_campaign", () => {
    const input = {
      assetCount: 40,
      seasonWeeks: 12,
      marketCount: 2,
      needsExclusive: true,
    };
    const out = estimate(input);
    const href = rfpHrefFromInputs(input, out, "ko");
    expect(href).toContain("/rfp?");
    expect(href).toContain("utm_source=pricing-calculator");
    expect(href).toContain(`utm_campaign=${out.recommendedPath}`);
    expect(href).toContain("assets=40");
    expect(href).toContain("weeks=12");
    expect(href).toContain("markets=2");
    expect(href).toContain("exclusive=1");
  });

  it("path labels are locale-aware and non-empty", () => {
    // Pick a path whose KR/EN labels are intentionally different — paired
    // editorial uses the same brand-kit name in both languages so it isn't
    // a useful comparison case.
    const ko = pathLabel("license_daily", "ko");
    const en = pathLabel("license_daily", "en");
    expect(ko.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
    expect(ko).not.toBe(en);
  });

  it("rationale and caveats are present for non-trivial outputs", () => {
    const out = estimate({
      assetCount: 40,
      seasonWeeks: 8,
      marketCount: 1,
      needsExclusive: true,
    });
    expect(out.rationale.length).toBeGreaterThan(0);
    // Universal caveats (media budget, legal review) always included.
    expect(out.caveats.length).toBeGreaterThanOrEqual(2);
  });
});
