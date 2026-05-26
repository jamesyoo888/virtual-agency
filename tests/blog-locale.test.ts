import { describe, it, expect } from "vitest";
import {
  listPosts,
  listTags,
  listPostsByTag,
  getPostBySlug,
  postLocale,
  BLOG_POSTS,
} from "@/lib/blog/posts";

describe("blog locale filtering", () => {
  it("listPosts defaults to ko and excludes en posts", () => {
    const ko = listPosts();
    expect(ko.length).toBeGreaterThan(0);
    for (const p of ko) {
      expect(postLocale(p)).toBe("ko");
    }
  });

  it("listPosts('en') returns only english posts", () => {
    const en = listPosts("en");
    expect(en.length).toBeGreaterThan(0);
    for (const p of en) {
      expect(p.locale).toBe("en");
    }
  });

  it("ko + en together equal the full catalog (no double-counting)", () => {
    const ko = listPosts("ko");
    const en = listPosts("en");
    expect(ko.length + en.length).toBe(BLOG_POSTS.length);
  });

  it("listTags filters by locale", () => {
    const koTags = listTags("ko").map((t) => t.tag);
    const enTags = listTags("en").map((t) => t.tag);
    // English tags use English words ('K-aesthetic', 'pricing'); the Korean
    // catalog uses Korean tag strings. The two sets must not bleed.
    expect(enTags).toContain("K-aesthetic");
    expect(koTags).not.toContain("K-aesthetic");
  });

  it("listPostsByTag respects the locale arg", () => {
    const enKAesthetic = listPostsByTag("K-aesthetic", "en");
    expect(enKAesthetic.length).toBeGreaterThan(0);
    for (const p of enKAesthetic) {
      expect(p.locale).toBe("en");
    }
    // Default (ko) should not surface en posts even if a tag string collided.
    const koHits = listPostsByTag("K-aesthetic");
    expect(koHits.length).toBe(0);
  });

  it("getPostBySlug enforces locale when supplied", () => {
    const enPost = listPosts("en")[0];
    expect(enPost).toBeTruthy();
    expect(getPostBySlug(enPost.slug, "en")).toBeTruthy();
    expect(getPostBySlug(enPost.slug, "ko")).toBeUndefined();
    // Without a locale, lookup is locale-agnostic for back-compat with
    // existing callers (RSS, sitemap, related-posts).
    expect(getPostBySlug(enPost.slug)).toBeTruthy();
  });
});
