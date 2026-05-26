import type { BlogPost, BlogLocale } from "@/lib/blog/posts";

/**
 * Google News sitemap eligibility: only posts published within the last 48
 * hours. Older posts must be dropped — the news sitemap is a freshness signal
 * and submitting stale entries is a violation per Google's guidelines.
 *
 * Pure for testability — pass `nowMs` so the test can pin the clock.
 */
export const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

export function eligibleForNewsSitemap(
  posts: BlogPost[],
  nowMs: number = Date.now()
): BlogPost[] {
  return posts.filter((p) => {
    const t = Date.parse(p.publishedAt);
    if (!Number.isFinite(t)) return false;
    return nowMs - t <= NEWS_WINDOW_MS && nowMs - t >= 0;
  });
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface NewsSitemapInput {
  siteUrl: string;
  publicationName: string;
  posts: BlogPost[];
  /** Override clock for tests. */
  nowMs?: number;
  /**
   * Locale of the posts being rendered. Controls:
   *  - URL prefix ("/blog/" for ko, "/en/blog/" for en)
   *  - <news:language> tag
   * Defaults to "ko" to preserve historical behavior.
   */
  locale?: BlogLocale;
}

export function renderNewsSitemap(input: NewsSitemapInput): string {
  const items = eligibleForNewsSitemap(input.posts, input.nowMs);
  const locale = input.locale ?? "ko";
  const pathPrefix = locale === "en" ? "/en/blog" : "/blog";
  const langTag = locale === "en" ? "en" : "ko";
  const urls = items
    .map((p) => {
      const loc = `${input.siteUrl}${pathPrefix}/${p.slug}`;
      const pubDate = new Date(p.publishedAt).toISOString();
      return [
        "  <url>",
        `    <loc>${xmlEscape(loc)}</loc>`,
        "    <news:news>",
        "      <news:publication>",
        `        <news:name>${xmlEscape(input.publicationName)}</news:name>`,
        `        <news:language>${langTag}</news:language>`,
        "      </news:publication>",
        `      <news:publication_date>${pubDate}</news:publication_date>`,
        `      <news:title>${xmlEscape(p.title)}</news:title>`,
        "    </news:news>",
        "  </url>",
      ].join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;
}
