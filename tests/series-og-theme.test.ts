import { describe, it, expect } from "vitest";
import { BLOG_SERIES } from "@/lib/blog/series";
import {
  SERIES_OG_THEMES,
  getSeriesOgTheme,
} from "@/lib/blog/series-og-theme";

describe("series OG theme registry", () => {
  it("every BLOG_SERIES id has a registered theme — adding a series without a theme should fail this assertion", () => {
    const ids = new Set(BLOG_SERIES.map((s) => s.id));
    for (const id of ids) {
      expect(
        getSeriesOgTheme(id),
        `series id "${id}" is missing from SERIES_OG_THEMES`
      ).toBeDefined();
    }
  });

  it("each theme has the four required fields", () => {
    for (const [id, theme] of Object.entries(SERIES_OG_THEMES)) {
      expect(theme.gradient, `${id} gradient`).toMatch(/linear-gradient/);
      expect(theme.accent, `${id} accent`).toMatch(/^#[0-9a-f]{3,8}$/i);
      expect(theme.chipBg, `${id} chipBg`).toMatch(/rgba?\(/);
      expect(theme.chipBorder, `${id} chipBorder`).toMatch(/rgba?\(/);
    }
  });

  it("getSeriesOgTheme returns undefined for unknown ids (graceful fallback)", () => {
    expect(getSeriesOgTheme("not-a-real-series")).toBeUndefined();
  });

  it("accent colors are unique enough that the cards don't look identical (5 distinct accents for 5 series)", () => {
    const accents = new Set(
      Object.values(SERIES_OG_THEMES).map((t) => t.accent)
    );
    expect(accents.size).toBeGreaterThanOrEqual(5);
  });
});
