import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import {
  INDUSTRY_OPTIONS_EN,
  INDUSTRY_LABELS_EN,
  MOOD_LABELS_EN,
} from "@/lib/tags";
import type { IndustryTag, Model } from "@/types";
import { ArrowRight } from "lucide-react";
import { relatedPostsForIndustry } from "@/lib/blog/industry-map";

export const revalidate = 3600;

const VALID_INDUSTRIES = new Set<IndustryTag>(
  INDUSTRY_OPTIONS_EN.map((o) => o.value)
);

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";

// SEO copy hand-tuned per industry for global English-language search intent.
// Generic boilerplate hurts ranking vs specific, intent-matching language.
const INDUSTRY_COPY: Record<
  IndustryTag,
  { heroTitle: string; heroLede: string; seoDescription: string }
> = {
  beauty: {
    heroTitle: "AI Virtual Models for Beauty Campaigns",
    heroLede:
      "K-beauty-grade synthetic talent for skincare, makeup, and fragrance. Same face across seasons, no shoot logistics, glass-skin lighting native.",
    seoDescription:
      "AI virtual models for K-beauty and global beauty campaigns. Skincare, makeup, fragrance — licensed per day, delivered in days.",
  },
  tech: {
    heroTitle: "AI Virtual Models for Tech Brands",
    heroLede:
      "Device unboxings, keynotes, product demos. Minimalist editorial talent with K-aesthetic restraint, ready for global launches.",
    seoDescription:
      "AI virtual models for tech advertising — consumer electronics, SaaS, mobile launches. Cast in 24h, deliver in days.",
  },
  food: {
    heroTitle: "AI Virtual Models for Food & Beverage",
    heroLede:
      "Same model carries an entire menu across a campaign series. Tones from premium dining to casual lifestyle, K-aesthetic palette ready.",
    seoDescription:
      "AI virtual models for F&B advertising. Restaurant chains, packaged food, beverage launches — one face across the whole campaign.",
  },
  luxury: {
    heroTitle: "AI Virtual Models for Luxury Brands",
    heroLede:
      "Fashion houses, jewelry, watches, motorsport. Refined K-aesthetic editorial talent with category-exclusive licensing available.",
    seoDescription:
      "AI virtual models for luxury fashion, jewelry, and watch campaigns. Category exclusivity, multi-market consistency, K-aesthetic editorial.",
  },
  sports: {
    heroTitle: "AI Virtual Models for Sports & Activewear",
    heroLede:
      "Running, training, outdoor. Dynamic poses across environments with one consistent face — no scheduling, no reshoots.",
    seoDescription:
      "AI virtual models for sportswear, fitness, and outdoor advertising. Multi-environment consistency without travel.",
  },
  lifestyle: {
    heroTitle: "AI Virtual Models for Lifestyle Content",
    heroLede:
      "Instagram operating cadence, content marketing, lookbooks. One face across weekly drops — K-aesthetic visual language native.",
    seoDescription:
      "AI virtual models for lifestyle, social-first, and content-marketing campaigns. Sustainable weekly cadence at a fraction of human-shoot cost.",
  },
};

export async function generateStaticParams() {
  return INDUSTRY_OPTIONS_EN.map((o) => ({ industry: o.value }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  if (!VALID_INDUSTRIES.has(industry as IndustryTag)) {
    return { title: "Explore — Virtual Agency" };
  }
  const tag = industry as IndustryTag;
  const copy = INDUSTRY_COPY[tag];
  const ogImage = `${SITE_URL}/api/og?explore_industry=${encodeURIComponent(tag)}`;
  return {
    title: `${copy.heroTitle} — Virtual Agency`,
    description: copy.seoDescription,
    alternates: {
      canonical: `${SITE_URL}/en/explore/${tag}`,
      languages: {
        en: `${SITE_URL}/en/explore/${tag}`,
        ko: `${SITE_URL}/explore/${tag}`,
      },
    },
    openGraph: {
      title: copy.heroTitle,
      description: copy.seoDescription,
      url: `${SITE_URL}/en/explore/${tag}`,
      locale: "en_US",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: copy.heroTitle,
      description: copy.seoDescription,
      images: [ogImage],
    },
  };
}

async function loadModels(tag: IndustryTag): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter(
      (m) => m.status === "active" && m.industry_tags?.includes(tag)
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select(
      "id, name, concept_image, base_price, exclusive_price, is_exclusive_available, industry_tags, genre_tags, mood_tags, status, follower_count, bio, slug, debut_date, personality, instagram_handle, created_at, updated_at"
    )
    .eq("status", "active")
    .contains("industry_tags", [tag])
    .order("follower_count", { ascending: false })
    .limit(24);
  return (data as Model[]) ?? [];
}

interface TrendingRow {
  id: string;
  name: string;
  concept_image: string | null;
  view_count_30d: number;
}

async function loadTrendingInIndustry(
  tag: IndustryTag
): Promise<TrendingRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("models_with_popularity")
    .select("id, name, concept_image, view_count_30d")
    .eq("status", "active")
    .contains("industry_tags", [tag])
    .order("view_count_30d", { ascending: false })
    .gt("view_count_30d", 0)
    .limit(6);
  return (data as TrendingRow[]) ?? [];
}

const KRW = new Intl.NumberFormat("ko-KR");

export default async function EnExploreIndustryPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  if (!VALID_INDUSTRIES.has(industry as IndustryTag)) notFound();

  const tag = industry as IndustryTag;
  const copy = INDUSTRY_COPY[tag];
  const [models, trending] = await Promise.all([
    loadModels(tag),
    loadTrendingInIndustry(tag),
  ]);
  // Locale-aware — surfaces EN posts only (Wave 97).
  const related = relatedPostsForIndustry(tag, 3, "en");

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 max-w-3xl">
          <Link
            href="/en"
            className="inline-block text-xs text-zinc-500 hover:text-zinc-300 mb-4"
          >
            ← Home
          </Link>
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-2">
            {INDUSTRY_LABELS_EN[tag]} · Explore
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {copy.heroTitle}
          </h1>
          <p className="mt-4 text-zinc-400">{copy.heroLede}</p>
          <div className="mt-6 flex gap-2 flex-wrap">
            <Link
              href={`/en/match?industries=${tag}`}
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
            >
              Match a model <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href={`/en/rfp?industries=${tag}`}
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              Submit an RFP
            </Link>
            <Link
              href="/en/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              See pricing
            </Link>
          </div>
        </header>

        {trending.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">
                Trending
              </span>
              <span className="text-xs text-zinc-500">
                · Top {INDUSTRY_LABELS_EN[tag].toLowerCase()} momentum, last 30
                days
              </span>
            </div>
            <ul className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {trending.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/models/${t.id}`}
                    className="block rounded-md overflow-hidden border border-zinc-800 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="aspect-square bg-zinc-900 relative">
                      {t.concept_image && (
                        <Image
                          src={t.concept_image}
                          alt={t.name}
                          fill
                          className="object-cover"
                          sizes="(min-width: 768px) 16vw, 33vw"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="px-1.5 py-1.5 text-center">
                      <p className="text-[11px] font-medium truncate">
                        {t.name}
                      </p>
                      <p className="text-[9px] text-emerald-400 tabular-nums">
                        {t.view_count_30d.toLocaleString()} views
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {models.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
            No active models in this industry yet. Try{" "}
            <Link href="/en/match" className="underline hover:text-white">
              the matching engine
            </Link>{" "}
            for adjacent suggestions.
          </div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/models/${m.id}`}
                  className="group block rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 transition-colors"
                >
                  <div className="aspect-[4/5] bg-zinc-900 relative">
                    {m.concept_image && (
                      <Image
                        src={m.concept_image}
                        alt={m.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate group-hover:underline">
                      {m.name}
                    </p>
                    {m.mood_tags && m.mood_tags.length > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                        {m.mood_tags
                          .map((t) => MOOD_LABELS_EN[t] ?? t)
                          .join(" · ")}
                      </p>
                    )}
                    {m.base_price && (
                      <p className="text-xs text-zinc-300 mt-1 tabular-nums">
                        ₩{KRW.format(m.base_price)}
                        <span className="text-zinc-500"> / day</span>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-zinc-900">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
              {INDUSTRY_LABELS_EN[tag]} campaign insights
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/en/blog/${p.slug}`}
                    className="group block rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600"
                  >
                    <p className="text-[10px] tabular-nums text-zinc-600">
                      {p.publishedAt} · {p.readingMinutes} min read
                    </p>
                    <p className="text-sm font-medium mt-1 text-zinc-100 group-hover:underline">
                      {p.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                      {p.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-16 pt-8 border-t border-zinc-900">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
            Explore other industries
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS_EN.filter((o) => o.value !== tag).map((o) => (
              <Link
                key={o.value}
                href={`/en/explore/${o.value}`}
                className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
