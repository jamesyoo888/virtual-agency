import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og"],
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
          "/login",
          "/auth/",
          "/invite/",
          "/ref/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
