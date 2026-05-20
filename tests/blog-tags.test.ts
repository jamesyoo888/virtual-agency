import { describe, it, expect } from "vitest";
import {
  listTags,
  listPostsByTag,
  tagSlug,
  decodeTagSlug,
  BLOG_POSTS,
} from "@/lib/blog/posts";

describe("blog tag helpers", () => {
  it("listTags returns tags sorted by count desc", () => {
    const tags = listTags();
    expect(tags.length).toBeGreaterThan(0);
    for (let i = 0; i + 1 < tags.length; i++) {
      // sorted by count desc, then alphabetically
      if (tags[i].count === tags[i + 1].count) continue;
      expect(tags[i].count).toBeGreaterThanOrEqual(tags[i + 1].count);
    }
  });

  it("listTags counts match raw posts", () => {
    const tags = listTags();
    for (const { tag, count } of tags) {
      const expected = BLOG_POSTS.filter((p) => p.tags.includes(tag)).length;
      expect(count).toBe(expected);
    }
  });

  it("listPostsByTag returns only matching posts", () => {
    const tags = listTags();
    const sample = tags[0]?.tag;
    if (!sample) return;
    const posts = listPostsByTag(sample);
    for (const post of posts) {
      expect(post.tags).toContain(sample);
    }
  });

  it("tagSlug round-trips through decodeTagSlug", () => {
    for (const tag of ["전략", "비용", "캠페인", "ascii-tag"]) {
      expect(decodeTagSlug(tagSlug(tag))).toBe(tag);
    }
  });
});
