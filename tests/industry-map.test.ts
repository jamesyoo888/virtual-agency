import { describe, it, expect } from "vitest";
import {
  relatedPostsForIndustry,
  relatedPostsForMood,
  relatedPostsForGenre,
} from "@/lib/blog/industry-map";

describe("relatedPostsForIndustry", () => {
  it("returns up to 3 posts for a known industry", () => {
    const posts = relatedPostsForIndustry("beauty", 3);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.length).toBeLessThanOrEqual(3);
  });

  it("limit caps the output", () => {
    expect(relatedPostsForIndustry("beauty", 1)).toHaveLength(1);
    expect(relatedPostsForIndustry("tech", 2)).toHaveLength(2);
  });

  it("luxury industry surfaces 독점/라이선스 posts first", () => {
    const posts = relatedPostsForIndustry("luxury", 5);
    const tagsUnion = posts.flatMap((p) => p.tags);
    // At least one of the top results should mention exclusivity/licensing.
    expect(
      tagsUnion.some((t) => ["독점", "라이선스", "브랜드 안전성"].includes(t))
    ).toBe(true);
  });

  it("unknown industry falls back to most recent posts", () => {
    const posts = relatedPostsForIndustry("unknown-industry", 2);
    expect(posts).toHaveLength(2);
    // Sorted by publishedAt desc
    expect(posts[0].publishedAt >= posts[1].publishedAt).toBe(true);
  });
});

describe("relatedPostsForMood", () => {
  it("known mood returns up to limit", () => {
    const out = relatedPostsForMood("cold", 3);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("unknown mood falls back to recency", () => {
    const out = relatedPostsForMood("nonexistent", 2);
    expect(out).toHaveLength(2);
  });
});

describe("relatedPostsForGenre", () => {
  it("noir surfaces 독점/라이선스 posts", () => {
    const out = relatedPostsForGenre("noir", 5);
    const allTags = out.flatMap((p) => p.tags);
    expect(allTags.some((t) => ["독점", "라이선스"].includes(t))).toBe(true);
  });

  it("respects limit", () => {
    expect(relatedPostsForGenre("ad", 1)).toHaveLength(1);
  });
});
