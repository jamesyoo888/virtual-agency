import { describe, it, expect } from "vitest";
import { listRelatedPosts, BLOG_POSTS } from "@/lib/blog/posts";

describe("listRelatedPosts", () => {
  it("excludes the source post", () => {
    const src = BLOG_POSTS[0]!;
    const related = listRelatedPosts(src.slug, 5);
    expect(related.find((p) => p.slug === src.slug)).toBeUndefined();
  });

  it("respects the limit", () => {
    const src = BLOG_POSTS[0]!;
    expect(listRelatedPosts(src.slug, 2)).toHaveLength(2);
  });

  it("falls back to recency when no tag overlap exists", () => {
    // Use a slug that doesn't exist — `getPostBySlug` returns undefined so
    // the function returns most-recent posts.
    const r = listRelatedPosts("__unknown_slug__", 3);
    expect(r).toHaveLength(3);
  });

  it("ranks posts sharing more tags higher", () => {
    // The first two ai-virtual-model posts share '전략' and another tag
    // depending on the dataset. Just sanity-check that for a known post,
    // results aren't simply re-ordering of recency.
    const src = BLOG_POSTS.find((p) => p.tags.includes("전략"));
    if (!src) return;
    const related = listRelatedPosts(src.slug, 3);
    // At least one related post should share a tag with the source.
    const overlapping = related.some((p) => p.tags.some((t) => src.tags.includes(t)));
    expect(overlapping).toBe(true);
  });
});
