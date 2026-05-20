import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

// Per-sitemap entry cap (Google: 50,000 URLs / 50 MB).
// Keep modest — 1000 is plenty for a model agency and avoids overlong files.
const PAGE_SIZE = 1000;
const MAX_SHARDS = 50;

export const revalidate = 3600;

export async function generateSitemaps(): Promise<{ id: number }[]> {
  if (!SUPABASE_CONFIGURED) return [{ id: 0 }];
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("models")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    const total = count ?? 0;
    const shards = Math.max(1, Math.min(MAX_SHARDS, Math.ceil(total / PAGE_SIZE)));
    return Array.from({ length: shards }, (_, id) => ({ id }));
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Shard 0 includes the static landing page; later shards are model-only.
  const staticRoutes: MetadataRoute.Sitemap =
    id === 0
      ? [
          {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1.0,
          },
          {
            url: `${SITE_URL}/match`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          },
          {
            url: `${SITE_URL}/rfp`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          },
          {
            url: `${SITE_URL}/faq`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.4,
          },
          {
            url: `${SITE_URL}/pricing`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.6,
          },
          {
            url: `${SITE_URL}/legal/terms`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.2,
          },
          {
            url: `${SITE_URL}/legal/privacy`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.2,
          },
        ]
      : [];

  if (!SUPABASE_CONFIGURED) return staticRoutes;

  try {
    const supabase = await createClient();
    const from = id * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: models } = await supabase
      .from("models")
      .select("id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .range(from, to);

    const ids = (models ?? []).map((m) => m.id);

    // Models with approved reviews carry social proof → boost priority and
    // changefreq. Single round-trip, no per-row lookup. We pull only the
    // distinct model_ids in the current shard's slice; the count itself
    // isn't needed — presence is enough to lift the bucket.
    let boostedSet = new Set<string>();
    if (ids.length > 0) {
      const { data: reviewed } = await supabase
        .from("reviews")
        .select("model_id")
        .in("model_id", ids)
        .eq("status", "approved");
      boostedSet = new Set((reviewed ?? []).map((r) => r.model_id as string));
    }

    const modelRoutes: MetadataRoute.Sitemap = (models ?? []).map((m) => {
      const boosted = boostedSet.has(m.id);
      return {
        url: `${SITE_URL}/models/${m.id}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        // Reviewed models are crawled more aggressively — fresh social proof
        // earns the URL more attention from search engines.
        changeFrequency: boosted ? ("daily" as const) : ("weekly" as const),
        priority: boosted ? 1.0 : 0.8,
      };
    });

    return [...staticRoutes, ...modelRoutes];
  } catch {
    return staticRoutes;
  }
}
