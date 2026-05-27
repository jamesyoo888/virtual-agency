import { describe, it, expect } from "vitest";
import {
  BRAND_KIT_TIERS,
  getKitTier,
  formatKrw,
  formatUsd,
} from "@/lib/characters/brand-kits";

describe("character brand-kit tiers (single source of truth)", () => {
  it("exports the 3 published tiers in ascending price order", () => {
    expect(BRAND_KIT_TIERS).toHaveLength(3);
    const krw = BRAND_KIT_TIERS.map((t) => t.krw);
    expect(krw[0]).toBeLessThan(krw[1]);
    expect(krw[1]).toBeLessThan(krw[2]);
    const usd = BRAND_KIT_TIERS.map((t) => t.usd);
    expect(usd[0]).toBeLessThan(usd[1]);
    expect(usd[1]).toBeLessThan(usd[2]);
  });

  it("Paired Editorial tier matches the brand-kits page headline ($8.5K / ₩11M)", () => {
    const tier = getKitTier("paired");
    expect(tier?.usd).toBe(8500);
    expect(tier?.krw).toBe(11_000_000);
    expect(tier?.startingAt).toBe(false);
  });

  it("Season Anchor tier is the highlighted center tier ($22K / ₩28.5M)", () => {
    const tier = getKitTier("season");
    expect(tier?.usd).toBe(22_000);
    expect(tier?.krw).toBe(28_500_000);
    expect(tier?.startingAt).toBe(false);
  });

  it("Custom Multi-Face is a starting-at floor ($50K+ / ₩65M+)", () => {
    const tier = getKitTier("custom");
    expect(tier?.usd).toBe(50_000);
    expect(tier?.krw).toBe(65_000_000);
    expect(tier?.startingAt).toBe(true);
  });

  it("getKitTier returns undefined for unknown slugs", () => {
    // @ts-expect-error — runtime probe with an off-list slug
    expect(getKitTier("bogus")).toBeUndefined();
  });
});

describe("formatKrw / formatUsd display helpers", () => {
  it("formatKrw renders Korean thousands separators with ₩ prefix", () => {
    expect(formatKrw(11_000_000)).toBe("₩11,000,000");
  });

  it("formatKrw appends 부터 when startingAt is set (parity with brand-kits page copy)", () => {
    expect(formatKrw(65_000_000, true)).toBe("₩65,000,000부터");
  });

  it("formatUsd shortens to K notation for thousands", () => {
    expect(formatUsd(8500)).toBe("$8.5K");
    expect(formatUsd(22_000)).toBe("$22K");
  });

  it("formatUsd appends + when startingAt is set (matches the $50K+ label)", () => {
    expect(formatUsd(50_000, true)).toBe("$50K+");
  });

  it("formatUsd falls back to full digits below $1K", () => {
    expect(formatUsd(500)).toBe("$500");
  });
});
