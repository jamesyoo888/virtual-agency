import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Explicitly allow the public trending JSON + page so crawlers find
        // them; /api/trending is the partner-embeddable feed and benefits
        // from search engine surface. /trending itself is allowed by the
        // catch-all "/" but listing it keeps intent obvious to operators.
        allow: ["/", "/api/og", "/api/trending", "/trending"],
        disallow: [
          "/admin/",
          "/client/",
          "/creator/",
          "/api/admin/",
          "/api/cron/",
          "/api/client/",
          "/api/creator/",
          "/api/generate/",
          "/api/meshy/",
          "/api/inquiries",
          "/api/reviews",
          "/api/experiments/",
          "/api/invite/",
          "/api/models/",
          "/api/search/",
          "/api/newsletter",
          "/login",
          "/auth/",
          "/invite/",
          "/ref/",
          "/quote/",
        ],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
      `${SITE_URL}/en/news-sitemap.xml`,
    ],
    host: SITE_URL,
  };
}
