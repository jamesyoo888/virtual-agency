import { listPosts } from "@/lib/blog/posts";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://virtual-agency-murex.vercel.app";

const FEED_TITLE = "Virtual Agency Blog";
const FEED_DESCRIPTION =
  "Notes on K-aesthetic, synthetic talent, and global brand campaigns.";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = listPosts("en");
  const lastBuildDate = new Date(
    posts[0]?.publishedAt ?? new Date().toISOString()
  ).toUTCString();

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/en/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt).toUTCString();
      const categories = post.tags
        .map((t) => `      <category>${escapeXml(t)}</category>`)
        .join("\n");
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
${categories}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/en/blog</link>
    <atom:link href="${SITE_URL}/en/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-US</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
