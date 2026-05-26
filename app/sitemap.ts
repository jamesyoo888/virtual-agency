import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { listPosts, listTags, tagSlug } from "@/lib/blog/posts";
import { listAnchorCases } from "@/lib/cases/anchor-cases";
import { INDUSTRY_OPTIONS, MOOD_OPTIONS, GENRE_OPTIONS } from "@/lib/tags";

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

export default async function sitemap(
  args?: { id?: number | string }
): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Defensive: Next.js 16 has shipped a couple of param shapes here
  // (named `id`, named `__metadata_id__`, sometimes string, sometimes
  // undefined for a single-shard sitemap). Treat undefined / non-finite
  // values as shard 0 so the static-routes branch always fires at least
  // once and the sitemap is never blank.
  const raw = (args as unknown as Record<string, unknown> | undefined) ?? {};
  const candidate =
    (typeof raw.id === "number" || typeof raw.id === "string")
      ? raw.id
      : (raw.__metadata_id__ as number | string | undefined);
  const parsed = Number(candidate ?? 0);
  const shardId = Number.isFinite(parsed) ? parsed : 0;

  // Shard 0 includes the static landing page; later shards are model-only.
  const staticRoutes: MetadataRoute.Sitemap =
    shardId === 0
      ? [
          {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1.0,
            alternates: {
              languages: {
                ko: SITE_URL,
                en: `${SITE_URL}/en`,
              },
            },
          },
          // English-language scaffolding for global brands (Phase 0).
          {
            url: `${SITE_URL}/en`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
            alternates: {
              languages: {
                en: `${SITE_URL}/en`,
                ko: SITE_URL,
              },
            },
          },
          {
            url: `${SITE_URL}/en/pricing`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/pricing`,
                ko: `${SITE_URL}/pricing`,
              },
            },
          },
          {
            url: `${SITE_URL}/en/about`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/about`,
                ko: `${SITE_URL}/about`,
              },
            },
          },
          {
            url: `${SITE_URL}/en/services`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/services`,
                ko: `${SITE_URL}/services`,
              },
            },
          },
          {
            url: `${SITE_URL}/en/faq`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.4,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/faq`,
                ko: `${SITE_URL}/faq`,
              },
            },
          },
          {
            url: `${SITE_URL}/en/legal/ai-disclosure`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.4,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/legal/ai-disclosure`,
                ko: `${SITE_URL}/legal/ai-disclosure`,
              },
            },
          },
          {
            url: `${SITE_URL}/en/blog`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.6,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/blog`,
                ko: `${SITE_URL}/blog`,
              },
            },
          },
          ...listPosts("en").map((p) => ({
            url: `${SITE_URL}/en/blog/${p.slug}`,
            lastModified: new Date(p.publishedAt),
            changeFrequency: "monthly" as const,
            priority: 0.5,
          })),
          {
            url: `${SITE_URL}/en/cases`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.6,
            alternates: {
              languages: {
                en: `${SITE_URL}/en/cases`,
                ko: `${SITE_URL}/cases`,
              },
            },
          },
          ...listAnchorCases().map((c) => ({
            url: `${SITE_URL}/en/cases/${c.slug}`,
            lastModified: new Date(c.publishedAt),
            changeFrequency: "monthly" as const,
            priority: 0.5,
          })),
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
            url: `${SITE_URL}/press`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.3,
          },
          {
            url: `${SITE_URL}/careers`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
          },
          {
            url: `${SITE_URL}/services`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
          },
          {
            url: `${SITE_URL}/about`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.4,
          },
          {
            url: `${SITE_URL}/cases`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.6,
          },
          {
            url: `${SITE_URL}/brief-template`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
          },
          {
            url: `${SITE_URL}/trending`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
          },
          {
            url: `${SITE_URL}/blog`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.5,
          },
          ...listPosts().map((p) => ({
            url: `${SITE_URL}/blog/${p.slug}`,
            lastModified: new Date(p.publishedAt),
            changeFrequency: "monthly" as const,
            priority: 0.5,
          })),
          ...listTags().map((t) => ({
            url: `${SITE_URL}/blog/tag/${tagSlug(t.tag)}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.4,
          })),
          ...INDUSTRY_OPTIONS.map((o) => ({
            url: `${SITE_URL}/explore/${o.value}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          })),
          ...MOOD_OPTIONS.map((o) => ({
            url: `${SITE_URL}/explore/mood/${o.value}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          })),
          ...GENRE_OPTIONS.map((o) => ({
            url: `${SITE_URL}/explore/genre/${o.value}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          })),
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
          {
            url: `${SITE_URL}/legal/ai-disclosure`,
            lastModified: now,
            changeFrequency: "yearly",
            priority: 0.3,
          },
        ]
      : [];

  if (!SUPABASE_CONFIGURED) return staticRoutes;

  try {
    const supabase = await createClient();
    const from = shardId * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: models } = await supabase
      .from("models")
      .select("id, updated_at, concept_image, name")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .range(from, to);

    const ids = (models ?? []).map((m) => m.id);

    // Two boost signals applied in parallel:
    //   - Models with approved reviews carry social proof.
    //   - Models in the 30d trending top contribute fresh momentum.
    // Both are inspected once via the popularity view and the reviews table.
    // Fall through cleanly if either query fails — sitemap should never block
    // on a missing signal.
    let reviewedSet = new Set<string>();
    let trendingSet = new Set<string>();
    if (ids.length > 0) {
      const [reviewedRes, trendingRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("model_id")
          .in("model_id", ids)
          .eq("status", "approved"),
        supabase
          .from("models_with_popularity")
          .select("id")
          .in("id", ids)
          .order("view_count_30d", { ascending: false })
          .gt("view_count_30d", 0)
          .limit(24),
      ]);
      reviewedSet = new Set(
        (reviewedRes.data ?? []).map((r) => r.model_id as string)
      );
      trendingSet = new Set(
        (trendingRes.data ?? []).map((r) => r.id as string)
      );
    }

    const modelRoutes: MetadataRoute.Sitemap = (models ?? []).map((m) => {
      const reviewed = reviewedSet.has(m.id);
      const trending = trendingSet.has(m.id);
      // Google Image sitemap extension — passes the concept image alongside
      // the page URL so Image Search can index the model card directly. The
      // `images` field is part of MetadataRoute.Sitemap in Next 16.
      const images =
        m.concept_image && /^https?:\/\//.test(m.concept_image)
          ? [m.concept_image]
          : undefined;
      // Trending overrides reviewed when both apply — hourly crawls capture
      // momentum better than daily for a feed that genuinely changes.
      const changeFrequency = trending
        ? ("hourly" as const)
        : reviewed
        ? ("daily" as const)
        : ("weekly" as const);
      const priority = reviewed || trending ? 1.0 : 0.8;
      return {
        url: `${SITE_URL}/models/${m.id}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency,
        priority,
        ...(images ? { images } : {}),
      };
    });

    return [...staticRoutes, ...modelRoutes];
  } catch {
    return staticRoutes;
  }
}
