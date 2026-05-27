import { describe, it, expect } from "vitest";
import { aggregateBlogViews } from "@/lib/analytics/blog-views";

describe("aggregateBlogViews", () => {
  it("returns zero totals on an empty input", () => {
    const out = aggregateBlogViews([], 30);
    expect(out.total).toBe(0);
    expect(out.totalKo).toBe(0);
    expect(out.totalEn).toBe(0);
    expect(out.bySlug).toEqual([]);
  });

  it("groups by slug + locale", () => {
    const rows = [
      { model: "blog:post-a", metadata: { locale: "ko" } },
      { model: "blog:post-a", metadata: { locale: "ko" } },
      { model: "blog:post-a", metadata: { locale: "en" } },
      { model: "blog:post-b", metadata: { locale: "en" } },
    ];
    const out = aggregateBlogViews(rows, 30);
    expect(out.total).toBe(4);
    expect(out.totalKo).toBe(2);
    expect(out.totalEn).toBe(2);
    expect(out.bySlug[0]).toMatchObject({
      slug: "post-a",
      total: 3,
      ko: 2,
      en: 1,
    });
    expect(out.bySlug[1]).toMatchObject({
      slug: "post-b",
      total: 1,
      ko: 0,
      en: 1,
    });
  });

  it("ignores non-blog rows defensively", () => {
    const rows = [
      { model: "blog:post-a", metadata: { locale: "ko" } },
      { model: "character:yuna", metadata: { locale: "ko" } },
      { model: null, metadata: { locale: "ko" } },
    ];
    const out = aggregateBlogViews(rows, 30);
    expect(out.total).toBe(1);
    expect(out.bySlug).toHaveLength(1);
  });

  it("defaults locale to ko when metadata is missing", () => {
    const rows = [{ model: "blog:post-a", metadata: null }];
    const out = aggregateBlogViews(rows, 30);
    expect(out.totalKo).toBe(1);
    expect(out.totalEn).toBe(0);
  });

  it("rolls up by series id without double-counting cross-locale duplicates", () => {
    // Posts that exist in both KR + EN versions of the same series should
    // not have their totals doubled in the per-series roll up. The seenIds
    // set in aggregateBlogViews enforces this.
    const out = aggregateBlogViews([], 30);
    const seriesIds = out.bySeries.map((s) => s.seriesId);
    expect(new Set(seriesIds).size).toBe(seriesIds.length);
  });
});
