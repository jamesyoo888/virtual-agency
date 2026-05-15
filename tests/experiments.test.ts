import { describe, it, expect } from "vitest";

import {
  EXPERIMENTS,
  cookieNameFor,
  pickBucket,
  resolveVariant,
  EXPERIMENT_COOKIE_PREFIX,
} from "@/lib/experiments";

describe("experiments", () => {
  it("cookieNameFor prefixes the key", () => {
    expect(cookieNameFor("hero_cta")).toBe(`${EXPERIMENT_COOKIE_PREFIX}hero_cta`);
  });

  it("resolveVariant returns the value when it matches a declared variant", () => {
    expect(resolveVariant(EXPERIMENTS.hero_cta, "match")).toBe("match");
    expect(resolveVariant(EXPERIMENTS.hero_cta, "browse")).toBe("browse");
  });

  it("resolveVariant returns null for unknown / missing values", () => {
    expect(resolveVariant(EXPERIMENTS.hero_cta, "other")).toBeNull();
    expect(resolveVariant(EXPERIMENTS.hero_cta, "")).toBeNull();
    expect(resolveVariant(EXPERIMENTS.hero_cta, undefined)).toBeNull();
  });

  it("pickBucket honors deterministic random input across the unit interval", () => {
    // Equal weights, two variants → boundary at 0.5
    const def = EXPERIMENTS.hero_cta;
    expect(pickBucket(def, 0.0)).toBe(def.variants[0]);
    expect(pickBucket(def, 0.49)).toBe(def.variants[0]);
    expect(pickBucket(def, 0.51)).toBe(def.variants[1]);
    expect(pickBucket(def, 0.99)).toBe(def.variants[1]);
  });

  it("pickBucket distributes roughly evenly with default weights", () => {
    const def = EXPERIMENTS.hero_cta;
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const b = pickBucket(def, i / 1000);
      counts[b] = (counts[b] ?? 0) + 1;
    }
    expect(counts.match).toBeGreaterThan(400);
    expect(counts.browse).toBeGreaterThan(400);
  });

  it("pickBucket respects explicit weights", () => {
    const def = {
      key: "weighted",
      variants: ["a", "b"] as const,
      weights: [9, 1] as const,
    };
    let aCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickBucket(def, i / 1000) === "a") aCount++;
    }
    // Expect ~900; tolerate jitter
    expect(aCount).toBeGreaterThan(850);
    expect(aCount).toBeLessThan(950);
  });

  it("rejects mismatched weights/variants length at runtime", () => {
    expect(() =>
      pickBucket({
        key: "bad",
        variants: ["a", "b"] as const,
        weights: [1] as const,
      })
    ).toThrow();
  });
});
