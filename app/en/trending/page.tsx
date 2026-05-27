import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import ModelCard from "@/components/model-card";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import {
  INDUSTRY_LABELS_EN,
  INDUSTRY_OPTIONS_EN,
  MOOD_LABELS_EN,
  MOOD_OPTIONS_EN,
} from "@/lib/tags";
import { listCharacters, getCharacter } from "@/lib/characters/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Trending K-Aesthetic Models — Virtual Agency",
  description:
    "The K-aesthetic AI virtual models global brands viewed most over the last 30 days. Live momentum from the catalog.",
  alternates: {
    canonical: `${SITE_URL}/en/trending`,
    languages: {
      en: `${SITE_URL}/en/trending`,
      ko: `${SITE_URL}/trending`,
    },
  },
  openGraph: {
    title: "Trending K-Aesthetic Models — Virtual Agency",
    description: "Top 12 K-aesthetic AI virtual models by 30-day momentum.",
    url: `${SITE_URL}/en/trending`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?trending=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trending K-Aesthetic Models — Virtual Agency",
    description: "Top 12 K-aesthetic AI virtual models by 30-day momentum.",
    images: [`${SITE_URL}/api/og?trending=1`],
  },
};

type PopularRow = Model & {
  view_count_30d: number;
  popularity_score: number;
};

async function loadTrending(
  limit: number,
  industry: string | null,
  mood: string | null,
  characterSlug: string | null
): Promise<PopularRow[]> {
  const character = characterSlug ? getCharacter(characterSlug) : undefined;
  const characterVerticals = character?.targetVerticals ?? null;
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[])
      .filter((m) => {
        if (m.status !== "active") return false;
        if (industry && !(m.industry_tags ?? []).includes(industry as never))
          return false;
        if (mood && !(m.mood_tags ?? []).includes(mood as never)) return false;
        if (
          characterVerticals &&
          !(m.industry_tags ?? []).some((t) =>
            characterVerticals.includes(t as string)
          )
        )
          return false;
        return true;
      })
      .slice(0, limit)
      .map((m) => ({ ...m, view_count_30d: 0, popularity_score: 0 }));
  }
  const supabase = await createClient();
  const fetchLimit = characterVerticals ? Math.max(limit * 5, 60) : limit;
  let query = supabase
    .from("models_with_popularity")
    .select("*")
    .eq("status", "active")
    .order("view_count_30d", { ascending: false })
    .gt("view_count_30d", 0);
  if (industry) query = query.contains("industry_tags", [industry]);
  if (mood) query = query.contains("mood_tags", [mood]);
  const { data } = await query.limit(fetchLimit);
  let rows = (data as PopularRow[]) ?? [];
  if (characterVerticals) {
    rows = rows.filter((m) =>
      (m.industry_tags ?? []).some((t) =>
        characterVerticals.includes(t as string)
      )
    );
  }
  return rows.slice(0, limit);
}

export default async function EnTrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string; mood?: string; character?: string }>;
}) {
  const sp = await searchParams;
  const industry =
    sp.industry && INDUSTRY_LABELS_EN[sp.industry] ? sp.industry : null;
  const mood = sp.mood && MOOD_LABELS_EN[sp.mood] ? sp.mood : null;
  const characterSlug = sp.character && getCharacter(sp.character) ? sp.character : null;
  const activeCharacter = characterSlug ? getCharacter(characterSlug) : undefined;
  const models = await loadTrending(12, industry, mood, characterSlug);

  const buildHref = (next: {
    industry?: string | null;
    mood?: string | null;
    character?: string | null;
  }) => {
    const params = new URLSearchParams();
    const nextIndustry = "industry" in next ? next.industry : industry;
    const nextMood = "mood" in next ? next.mood : mood;
    const nextCharacter = "character" in next ? next.character : characterSlug;
    if (nextIndustry) params.set("industry", nextIndustry);
    if (nextMood) params.set("mood", nextMood);
    if (nextCharacter) params.set("character", nextCharacter);
    const qs = params.toString();
    return qs ? `/en/trending?${qs}` : "/en/trending";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <Link
          href="/en"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link href="/en" className="hover:text-white">
            Home
          </Link>
          <Link href="/en/match" className="hover:text-white">
            Match
          </Link>
          <Link href="/en/rfp" className="hover:text-white">
            RFP
          </Link>
        </nav>
      </header>

      <section className="px-5 md:px-8 py-12 md:py-16 border-b border-zinc-900">
        <div className="max-w-3xl flex items-start gap-4">
          <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0 mt-1.5" />
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-3">
              Trending — 30 days
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              The K-aesthetic models brands viewed most this month
            </h1>
            <p className="text-zinc-400 leading-relaxed">
              Top {models.length} by 30-day page views. Live catalog momentum
              — brands are evaluating these in real time.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 md:px-8 py-4 border-b border-zinc-900">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mr-2">
            Industry
          </span>
          <Link
            href={buildHref({ industry: null })}
            className={`px-2.5 py-1 rounded-full border ${
              !industry
                ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            All
          </Link>
          {INDUSTRY_OPTIONS_EN.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref({ industry: opt.value })}
              className={`px-2.5 py-1 rounded-full border ${
                industry === opt.value
                  ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mr-2">
            Mood
          </span>
          <Link
            href={buildHref({ mood: null })}
            className={`px-2.5 py-1 rounded-full border ${
              !mood
                ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            All
          </Link>
          {MOOD_OPTIONS_EN.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref({ mood: opt.value })}
              className={`px-2.5 py-1 rounded-full border ${
                mood === opt.value
                  ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 mr-2 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Character pick
          </span>
          <Link
            href={buildHref({ character: null })}
            className={`px-2.5 py-1 rounded-full border ${
              !characterSlug
                ? "border-violet-400/50 text-violet-300 bg-violet-500/10"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
            }`}
          >
            All
          </Link>
          {listCharacters().map((c) => (
            <Link
              key={c.slug}
              href={buildHref({ character: c.slug })}
              className={`px-2.5 py-1 rounded-full border ${
                characterSlug === c.slug
                  ? "border-violet-400/50 text-violet-300 bg-violet-500/10"
                  : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
              title={c.targetVerticals.join(" · ")}
            >
              Picks for {c.name}
            </Link>
          ))}
        </div>
        {activeCharacter && (
          <p className="mt-3 text-[11px] text-violet-300/80 leading-relaxed">
            Showing models whose industry tags ({activeCharacter.targetVerticals.join(", ")}) overlap with {activeCharacter.name}&rsquo;s register. Try the other character if the fit feels weak.
          </p>
        )}
      </section>

      <section className="px-5 md:px-8 py-12">
        {models.length === 0 ? (
          <div className="max-w-3xl mx-auto rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm text-zinc-500">
              Not enough trending data yet. Browsing the catalog feeds the
              next refresh.
            </p>
            <Link
              href="/en"
              className="inline-flex items-center gap-2 mt-4 text-sm text-zinc-300 hover:text-white"
            >
              Browse the catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {models.map((m, idx) => (
              <div key={m.id} className="relative">
                <span className="absolute z-10 -top-2 -left-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/90 text-black text-[10px] font-bold tracking-wider">
                  #{idx + 1}
                </span>
                <ModelCard model={m} variant="showcase" />
                <p className="mt-1.5 text-[10px] text-zinc-600 tracking-wider">
                  30d views {m.view_count_30d.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-5 md:px-8 py-12 border-t border-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-zinc-400 leading-relaxed">
            Not seeing your industry or mood?{" "}
            <Link
              href="/en/match"
              className="text-zinc-200 underline underline-offset-4 hover:text-white"
            >
              Match a model
            </Link>{" "}
            from a one-line brief — we return matched models in 24 business
            hours.
          </p>
        </div>
      </section>
    </div>
  );
}
