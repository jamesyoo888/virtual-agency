import { NextResponse } from "next/server";
import { listPosts } from "@/lib/blog/posts";
import { renderNewsSitemap } from "@/lib/blog/news-window";

export const revalidate = 600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

/**
 * Google News sitemap (`<news:news>` extension) — separate from the regular
 * sitemap because the news sitemap MUST list only posts published in the last
 * 48 hours. Older entries trigger Google News compliance warnings and can get
 * the publication temporarily removed from News inclusion.
 */
export async function GET() {
  const xml = renderNewsSitemap({
    siteUrl: SITE_URL,
    publicationName: "Virtual Agency",
    posts: listPosts(),
  });
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
