import { describe, it, expect } from "vitest";
import {
  eligibleForNewsSitemap,
  renderNewsSitemap,
  NEWS_WINDOW_MS,
} from "@/lib/blog/news-window";
import type { BlogPost } from "@/lib/blog/posts";

function mkPost(slug: string, publishedAt: string, overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug,
    title: `Post ${slug}`,
    excerpt: "x",
    publishedAt,
    readingMinutes: 4,
    tags: ["전략"],
    sections: [{ heading: "h", body: "b" }],
    ...overrides,
  };
}

describe("eligibleForNewsSitemap", () => {
  const NOW = Date.parse("2026-05-21T10:00:00.000Z");

  it("includes posts within the last 48h", () => {
    const posts = [
      mkPost("fresh", "2026-05-21T08:00:00.000Z"),
      mkPost("borderline", new Date(NOW - NEWS_WINDOW_MS + 60_000).toISOString()),
    ];
    const out = eligibleForNewsSitemap(posts, NOW);
    expect(out.map((p) => p.slug)).toEqual(["fresh", "borderline"]);
  });

  it("excludes posts older than 48h", () => {
    const posts = [
      mkPost("old", "2026-05-15T08:00:00.000Z"),
      mkPost("just-old", new Date(NOW - NEWS_WINDOW_MS - 60_000).toISOString()),
    ];
    const out = eligibleForNewsSitemap(posts, NOW);
    expect(out).toEqual([]);
  });

  it("excludes posts dated in the future", () => {
    const posts = [mkPost("future", "2026-06-01T08:00:00.000Z")];
    const out = eligibleForNewsSitemap(posts, NOW);
    expect(out).toEqual([]);
  });

  it("excludes posts with invalid date strings", () => {
    const posts = [mkPost("bad", "not a date")];
    const out = eligibleForNewsSitemap(posts, NOW);
    expect(out).toEqual([]);
  });
});

describe("renderNewsSitemap", () => {
  const NOW = Date.parse("2026-05-21T10:00:00.000Z");

  it("emits valid xml with news namespace and escapes hostile titles", () => {
    const xml = renderNewsSitemap({
      siteUrl: "https://va.example.com",
      publicationName: "Virtual Agency",
      posts: [
        mkPost("safe", "2026-05-21T08:00:00.000Z", {
          title: "Safe & sound",
        }),
        mkPost("hostile", "2026-05-21T08:00:00.000Z", {
          title: "<script>alert(1)</script>",
        }),
      ],
      nowMs: NOW,
    });
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain("<news:language>ko</news:language>");
    expect(xml).toContain("https://va.example.com/blog/safe");
    expect(xml).toContain("Safe &amp; sound");
    expect(xml).not.toContain("<script>alert(1)</script>");
    expect(xml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("emits empty urlset (no <url>) when nothing is eligible", () => {
    const xml = renderNewsSitemap({
      siteUrl: "https://va.example.com",
      publicationName: "Virtual Agency",
      posts: [mkPost("old", "2026-05-01T08:00:00.000Z")],
      nowMs: NOW,
    });
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});
