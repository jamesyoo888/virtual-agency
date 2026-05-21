import { describe, it, expect } from "vitest";
import {
  EXPERIMENTS,
  VARIANT_LABELS,
  pickBucket,
  resolveVariant,
  labelFor,
} from "@/lib/experiments";

describe("hero_subtitle experiment", () => {
  const def = EXPERIMENTS.hero_subtitle;

  it("declares three variants", () => {
    expect(def.variants).toEqual(["bundle", "speed", "cost"]);
  });

  it("has a Korean label for every variant", () => {
    for (const v of def.variants) {
      expect(VARIANT_LABELS[`hero_subtitle.${v}`]).toBeTruthy();
      expect(labelFor("hero_subtitle", v)).not.toBe(v);
    }
  });

  it("pickBucket returns a declared variant for any random seed", () => {
    for (let i = 0; i < 30; i++) {
      const r = pickBucket(def, i / 30);
      expect(def.variants).toContain(r);
    }
  });

  it("resolveVariant rejects unknown values", () => {
    expect(resolveVariant(def, "speed")).toBe("speed");
    expect(resolveVariant(def, "moonshot")).toBe(null);
    expect(resolveVariant(def, undefined)).toBe(null);
  });
});
