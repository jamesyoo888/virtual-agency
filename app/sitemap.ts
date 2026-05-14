import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  if (!SUPABASE_CONFIGURED) return staticRoutes;

  try {
    const supabase = await createClient();
    const { data: models } = await supabase
      .from("models")
      .select("id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1000);

    const modelRoutes: MetadataRoute.Sitemap = (models ?? []).map((m) => ({
      url: `${SITE_URL}/models/${m.id}`,
      lastModified: m.updated_at ? new Date(m.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...modelRoutes];
  } catch {
    return staticRoutes;
  }
}
