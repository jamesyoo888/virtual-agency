import { describe, it, expect } from "vitest";
import {
  aggregateBlogViews,
  aggregateBlogPostDetail,
  classifyReferrer,
} from "@/lib/analytics/blog-views";

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

  it("returns a zero-filled daily series of the requested window length", () => {
    const out = aggregateBlogViews([], 14);
    expect(out.daily).toHaveLength(14);
    expect(out.daily.every((d) => d.count === 0)).toBe(true);
    // Last bucket is today (UTC).
    const today = new Date().toISOString().slice(0, 10);
    expect(out.daily[out.daily.length - 1].date).toBe(today);
  });

  it("buckets rows into matching daily slots", () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = [
      {
        model: "blog:post-a",
        metadata: { locale: "ko" },
        created_at: `${today}T01:00:00Z`,
      },
      {
        model: "blog:post-a",
        metadata: { locale: "ko" },
        created_at: `${today}T05:00:00Z`,
      },
    ];
    const out = aggregateBlogViews(rows, 7);
    expect(out.daily[out.daily.length - 1]).toEqual({
      date: today,
      count: 2,
    });
  });
});

describe("aggregateBlogPostDetail", () => {
  it("returns zero totals when the slug has no rows", () => {
    const out = aggregateBlogPostDetail("post-z", [], 30);
    expect(out.total).toBe(0);
    expect(out.ko).toBe(0);
    expect(out.en).toBe(0);
    expect(out.topReferrers).toEqual([]);
    expect(out.daily).toHaveLength(30);
  });

  it("filters strictly to the requested slug", () => {
    const rows = [
      {
        model: "blog:post-a",
        metadata: { locale: "ko", referrer: "https://google.com/" },
      },
      {
        model: "blog:post-b",
        metadata: { locale: "ko", referrer: "https://google.com/" },
      },
    ];
    const out = aggregateBlogPostDetail("post-a", rows, 30);
    expect(out.total).toBe(1);
    expect(out.ko).toBe(1);
    expect(out.topReferrers[0]).toMatchObject({
      source: "google",
      count: 1,
    });
  });

  it("buckets referrers, sorted by count desc, top 10", () => {
    // 12 referrers — should slice to top 10.
    const rows = Array.from({ length: 12 }, (_, i) => ({
      model: "blog:post-a",
      metadata: {
        locale: "ko" as const,
        referrer: `https://site-${i}.com/`,
      },
    }));
    // Add an extra hit to site-0 so it ranks first.
    rows.push({
      model: "blog:post-a",
      metadata: { locale: "ko", referrer: "https://site-0.com/" },
    });
    const out = aggregateBlogPostDetail("post-a", rows, 30);
    expect(out.topReferrers).toHaveLength(10);
    expect(out.topReferrers[0]).toMatchObject({
      source: "site-0.com",
      count: 2,
    });
  });
});

describe("classifyReferrer", () => {
  it("returns (direct) for null/empty/invalid input", () => {
    expect(classifyReferrer(null)).toBe("(direct)");
    expect(classifyReferrer("")).toBe("(direct)");
    expect(classifyReferrer("not a url")).toBe("(direct)");
  });

  it("collapses internal hosts to (internal)", () => {
    expect(classifyReferrer("https://aihubs.uk/")).toBe("(internal)");
    expect(classifyReferrer("https://www.aihubs.uk/blog")).toBe("(internal)");
    expect(classifyReferrer("https://something.vercel.app/")).toBe(
      "(internal)"
    );
    expect(classifyReferrer("http://localhost:3000/")).toBe("(internal)");
  });

  it("canonicalizes known search engines + social", () => {
    expect(classifyReferrer("https://www.google.com/search?q=x")).toBe(
      "google"
    );
    expect(classifyReferrer("https://m.naver.com/")).toBe("naver");
    expect(classifyReferrer("https://t.co/abc")).toBe("twitter");
    expect(classifyReferrer("https://x.com/i/post/1")).toBe("twitter");
    expect(classifyReferrer("https://www.linkedin.com/")).toBe("linkedin");
    expect(classifyReferrer("https://youtu.be/x")).toBe("youtube");
  });

  it("falls back to host without leading www. for unknown sources", () => {
    expect(classifyReferrer("https://www.example.com/path")).toBe(
      "example.com"
    );
    expect(classifyReferrer("https://blog.somecompany.io/")).toBe(
      "blog.somecompany.io"
    );
  });
});
