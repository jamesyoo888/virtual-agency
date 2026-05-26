import { NextResponse } from "next/server";
import { listPosts } from "@/lib/blog/posts";
import { renderNewsSitemap } from "@/lib/blog/news-window";

export const revalidate = 600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

/**
 * English-language Google News sitemap. Mirrors /news-sitemap.xml but lists
 * only locale="en" posts under /en/blog/<slug> with <news:language>en</news:language>.
 * Same 48-hour eligibility window.
 */
export async function GET() {
  const xml = renderNewsSitemap({
    siteUrl: SITE_URL,
    publicationName: "Virtual Agency",
    posts: listPosts("en"),
    locale: "en",
  });
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
