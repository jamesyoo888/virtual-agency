import { describe, it, expect } from "vitest";
import { aggregateCharacterViews } from "@/lib/analytics/character-views";

describe("aggregateCharacterViews", () => {
  it("groups by slug and locale", () => {
    const summary = aggregateCharacterViews([
      { model: "character:yuna", metadata: { locale: "ko" } },
      { model: "character:yuna", metadata: { locale: "ko" } },
      { model: "character:yuna", metadata: { locale: "en" } },
      { model: "character:ren", metadata: { locale: "en" } },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.totalKo).toBe(2);
    expect(summary.totalEn).toBe(2);
    expect(summary.bySlug).toHaveLength(2);
    expect(summary.bySlug[0].slug).toBe("yuna"); // sorted by total desc
    expect(summary.bySlug[0].total).toBe(3);
    expect(summary.bySlug[0].ko).toBe(2);
    expect(summary.bySlug[0].en).toBe(1);
    expect(summary.bySlug[1].slug).toBe("ren");
    expect(summary.bySlug[1].total).toBe(1);
  });

  it("skips rows whose model column doesn't start with 'character:'", () => {
    const summary = aggregateCharacterViews([
      { model: "flux", metadata: { locale: "ko" } }, // generation row
      { model: "kling-v1.6-pro", metadata: null }, // video row
      { model: "character:yuna", metadata: { locale: "ko" } },
    ]);
    expect(summary.total).toBe(1);
    expect(summary.bySlug).toHaveLength(1);
  });

  it("defaults missing/invalid locale to ko (parity with tracker fallback)", () => {
    const summary = aggregateCharacterViews([
      { model: "character:yuna", metadata: null },
      { model: "character:yuna", metadata: { locale: undefined as unknown as string } },
      { model: "character:yuna", metadata: { locale: "ja" } }, // unsupported
    ]);
    expect(summary.totalKo).toBe(3);
    expect(summary.totalEn).toBe(0);
  });

  it("handles empty input cleanly (no-views state)", () => {
    const summary = aggregateCharacterViews([]);
    expect(summary.total).toBe(0);
    expect(summary.bySlug).toEqual([]);
  });

  it("ignores malformed slugs (model=character: with no slug)", () => {
    const summary = aggregateCharacterViews([
      { model: "character:", metadata: { locale: "ko" } },
      { model: "character:yuna", metadata: { locale: "ko" } },
    ]);
    expect(summary.total).toBe(1);
    expect(summary.bySlug[0].slug).toBe("yuna");
  });

  it("handles null model column (no row matches the prefix)", () => {
    const summary = aggregateCharacterViews([
      { model: null, metadata: { locale: "ko" } },
    ]);
    expect(summary.total).toBe(0);
  });
});
