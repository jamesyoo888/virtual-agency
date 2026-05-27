import { describe, it, expect } from "vitest";
import {
  BLOG_SERIES,
  getSeriesForPost,
  listSeries,
} from "@/lib/blog/series";
import { getPostBySlug } from "@/lib/blog/posts";

describe("blog series registry", () => {
  it("declares at least one series per locale", () => {
    expect(listSeries("ko").length).toBeGreaterThan(0);
    expect(listSeries("en").length).toBeGreaterThan(0);
  });

  it("every declared slug resolves to a real post in its locale", () => {
    for (const series of BLOG_SERIES) {
      for (const slug of series.slugs) {
        const post = getPostBySlug(slug, series.locale);
        expect(
          post,
          `series ${series.id} (${series.locale}) lists missing slug: ${slug}`
        ).toBeDefined();
      }
    }
  });

  it("getSeriesForPost returns part / total / prev / next for an interior post", () => {
    const series = BLOG_SERIES.find((s) => s.slugs.length >= 3);
    if (!series) throw new Error("test setup needs a 3+ post series");
    const interiorSlug = series.slugs[1];
    const pos = getSeriesForPost(interiorSlug, series.locale);
    expect(pos).not.toBeNull();
    expect(pos?.part).toBe(2);
    expect(pos?.total).toBe(series.slugs.length);
    expect(pos?.prevSlug).toBe(series.slugs[0]);
    expect(pos?.nextSlug).toBe(series.slugs[2]);
  });

  it("first post in a series has no prevSlug; last post has no nextSlug", () => {
    const series = BLOG_SERIES.find((s) => s.slugs.length >= 2);
    if (!series) throw new Error("test setup needs a 2+ post series");
    const firstPos = getSeriesForPost(series.slugs[0], series.locale);
    expect(firstPos?.prevSlug).toBeNull();
    expect(firstPos?.nextSlug).toBe(series.slugs[1]);
    const lastPos = getSeriesForPost(
      series.slugs[series.slugs.length - 1],
      series.locale
    );
    expect(lastPos?.nextSlug).toBeNull();
  });

  it("getSeriesForPost returns null for a non-series post", () => {
    expect(getSeriesForPost("non-existent-slug", "en")).toBeNull();
  });

  it("returns null when the locale doesn't match the series", () => {
    // The character-ip series exists in both locales but with different slugs,
    // so picking a slug from one locale and querying the other should return null.
    const enSeries = BLOG_SERIES.find(
      (s) => s.id === "character-ip" && s.locale === "en"
    );
    expect(enSeries).toBeDefined();
    if (!enSeries) return;
    const enOnlySlug = enSeries.slugs.find(
      (s) =>
        !BLOG_SERIES.some(
          (other) => other.locale === "ko" && other.slugs.includes(s)
        )
    );
    if (!enOnlySlug) return;
    expect(getSeriesForPost(enOnlySlug, "ko")).toBeNull();
  });
});
