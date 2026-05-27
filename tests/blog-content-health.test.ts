import { describe, it, expect } from "vitest";
import { findStalePosts } from "@/app/api/cron/blog-content-health/route";
import type { BlogPost } from "@/lib/blog/posts";

function post(slug: string, daysOld: number, locale?: "ko" | "en"): BlogPost {
  const publishedAt = new Date(
    Date.now() - daysOld * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
  return {
    slug,
    title: `Post ${slug}`,
    excerpt: "",
    publishedAt,
    readingMinutes: 5,
    tags: [],
    sections: [{ heading: "h", body: "b" }],
    locale,
  };
}

describe("findStalePosts", () => {
  it("returns nothing when every post was viewed in the window", () => {
    const posts = [post("a", 30), post("b", 60)];
    const stale = findStalePosts(posts, new Set(["a", "b"]));
    expect(stale).toEqual([]);
  });

  it("flags posts older than the 14-day warm-up with zero views", () => {
    const posts = [post("old-cold", 30), post("old-warm", 60), post("new", 5)];
    const stale = findStalePosts(posts, new Set([]));
    const slugs = stale.map((s) => s.slug);
    expect(slugs).toContain("old-cold");
    expect(slugs).toContain("old-warm");
    // New post is still in warm-up — shouldn't be flagged.
    expect(slugs).not.toContain("new");
  });

  it("does not flag a viewed post even if it's older than warm-up", () => {
    const posts = [post("warmed", 30)];
    const stale = findStalePosts(posts, new Set(["warmed"]));
    expect(stale).toEqual([]);
  });

  it("sorts by age desc so the oldest stale post is first", () => {
    const posts = [post("a", 30), post("c", 60), post("b", 45)];
    const stale = findStalePosts(posts, new Set([]));
    expect(stale.map((s) => s.slug)).toEqual(["c", "b", "a"]);
    expect(stale[0].ageDays).toBeGreaterThanOrEqual(stale[1].ageDays);
  });

  it("ignores posts with unparseable publishedAt", () => {
    const broken: BlogPost = {
      ...post("broken", 30),
      publishedAt: "not-a-date",
    };
    const stale = findStalePosts([broken], new Set([]));
    expect(stale).toEqual([]);
  });

  it("preserves locale on each stale entry", () => {
    const stale = findStalePosts(
      [post("k", 30), post("e", 30, "en")],
      new Set([])
    );
    const k = stale.find((s) => s.slug === "k");
    const e = stale.find((s) => s.slug === "e");
    expect(k?.locale).toBe("ko"); // default
    expect(e?.locale).toBe("en");
  });
});
