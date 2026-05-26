import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { rankModels, extractTagsFromText } from "@/lib/matching/score";
import { loadPersonaSignals } from "@/lib/matching/persona";
import {
  INDUSTRY_OPTIONS_EN,
  GENRE_OPTIONS_EN,
  MOOD_OPTIONS_EN,
} from "@/lib/tags";
import ModelCard from "@/components/model-card";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { recommendCharacters } from "@/lib/characters/recommend";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "AI Model Matching — Virtual Agency",
  description:
    "Describe your campaign — concept, industry, budget — and we surface the K-aesthetic AI models that fit. No agent calls, no shortlists by email.",
  alternates: {
    canonical: `${SITE_URL}/en/match`,
    languages: {
      en: `${SITE_URL}/en/match`,
      ko: `${SITE_URL}/match`,
    },
  },
  openGraph: {
    title: "AI Model Matching — Virtual Agency",
    description:
      "Describe your campaign and we surface the K-aesthetic AI models that fit.",
    url: `${SITE_URL}/en/match`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_match=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Model Matching — Virtual Agency",
    description: "Describe your campaign and we surface the models that fit.",
    images: [`${SITE_URL}/api/og?en_match=1`],
  },
};

interface PageProps {
  searchParams: Promise<{
    brief?: string;
    industries?: string;
    genres?: string;
    moods?: string;
    budget?: string;
    exclusive?: string;
  }>;
}

async function fetchActiveModels(): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter(
      (m) => m.status === "active"
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select("*")
    .eq("status", "active");
  return (data as Model[]) ?? [];
}

function parseList<T extends string>(
  raw: string | undefined,
  allowed: T[]
): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as string[]).includes(s));
}

export default async function EnMatchPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const brief = params.brief ?? "";
  const industries = parseList(
    params.industries,
    INDUSTRY_OPTIONS_EN.map((o) => o.value)
  );
  const genres = parseList(
    params.genres,
    GENRE_OPTIONS_EN.map((o) => o.value)
  );
  const moods = parseList(params.moods, MOOD_OPTIONS_EN.map((o) => o.value));
  // Day-rate budget — USD shown to user, stored as integer
  const budgetPerDay = params.budget
    ? Number.parseInt(params.budget, 10)
    : null;
  const needsExclusive = params.exclusive === "true";

  const fromText = extractTagsFromText(brief);
  const hasInput =
    brief.length > 0 ||
    industries.length > 0 ||
    fromText.industries.length > 0 ||
    genres.length > 0 ||
    fromText.genres.length > 0 ||
    moods.length > 0 ||
    fromText.moods.length > 0 ||
    !!budgetPerDay ||
    needsExclusive;

  const [models, persona] = hasInput
    ? await Promise.all([fetchActiveModels(), loadPersonaSignals()])
    : [
        [] as Model[],
        {
          inquiries: new Map<string, number>(),
          rfps: new Map<string, number>(),
        },
      ];

  // Approximate KRW conversion for the underlying scorer (it compares against
  // `base_price` stored in KRW). 1 USD ≈ 1,300 KRW — rough so day-rate signals
  // line up; the catalog still shows native KRW prices, so this is matching
  // only, not display.
  const budgetKrwApprox = budgetPerDay ? Math.round(budgetPerDay * 1300) : null;

  const mergedBrief = {
    industries: [...new Set([...industries, ...fromText.industries])],
    genres: [...new Set([...genres, ...fromText.genres])],
    moods: [...new Set([...moods, ...fromText.moods])],
    budgetPerDay: budgetKrwApprox,
    needsExclusive,
    freeText: brief,
    personaInquiries: persona.inquiries,
    personaRfps: persona.rfps,
  };

  const ranked = hasInput ? rankModels(models, mergedBrief).slice(0, 12) : [];

  // Surface owned characters above the catalog when the brief intersects
  // with their targetVerticals or defaultMoods. See lib/characters/recommend.
  const characterMatches = hasInput
    ? recommendCharacters({
        industries: mergedBrief.industries,
        moods: mergedBrief.moods,
      })
    : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <Link
          href="/en"
          className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300"
        >
          Virtual Agency
        </Link>
        <Link
          href="/en"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Home
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-zinc-400" />
          <h1 className="text-3xl font-bold">AI Model Matching</h1>
        </div>
        <p className="text-sm text-zinc-500 mb-8">
          Describe your campaign — industry, mood, day-rate budget — and we
          surface the K-aesthetic models that fit. No shortlist emails.
        </p>

        <form
          method="GET"
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5 mb-8"
        >
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-400">
              Campaign brief (free text)
            </label>
            <textarea
              name="brief"
              defaultValue={brief}
              rows={3}
              placeholder="e.g. Fall luxury beauty campaign, cool and refined mood"
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <p className="text-[10px] text-zinc-600">
              Industry, genre, and mood keywords are auto-detected from the
              text.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FilterCheckboxes
              name="industries"
              label="Industry"
              selected={industries}
              options={INDUSTRY_OPTIONS_EN}
            />
            <FilterCheckboxes
              name="genres"
              label="Genre"
              selected={genres}
              options={GENRE_OPTIONS_EN}
            />
            <FilterCheckboxes
              name="moods"
              label="Mood"
              selected={moods}
              options={MOOD_OPTIONS_EN}
            />
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400">
                Day rate ($/day)
              </label>
              <input
                type="number"
                name="budget"
                defaultValue={budgetPerDay ?? ""}
                placeholder="400"
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                <input
                  type="checkbox"
                  name="exclusive"
                  value="true"
                  defaultChecked={needsExclusive}
                  className="accent-white"
                />
                Only models open to category exclusivity
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-white text-black font-medium hover:bg-zinc-200 text-sm"
          >
            Find matches
          </button>
        </form>

        {hasInput && characterMatches.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400">
                Owned character match
              </h2>
              <Link
                href="/en/character"
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                See all characters →
              </Link>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Your brief intersects with a character built for this register.
              Brand-kit licensing (paired, exclusive, season-long) starts
              from here rather than the catalog.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {characterMatches.map(({ character: c }) => (
                <li key={c.slug}>
                  <Link
                    href={`/en/character/${c.slug}`}
                    className="group block rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 hover:border-violet-400/50 transition-colors"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-lg font-bold group-hover:underline">
                        {c.name}
                      </p>
                      <span className="text-[10px] uppercase tracking-wider text-violet-300/80">
                        Owned IP
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{c.tagline}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-300 group-hover:text-white">
                      View character <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasInput && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-wider text-zinc-400">
                Top matches {ranked.length > 0 && `(${ranked.length})`}
              </h2>
              <Link
                href="/en/rfp"
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Build a full RFP →
              </Link>
            </div>
            {ranked.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-500">
                No models matched. Try fewer keywords or remove the budget
                cap.
              </div>
            ) : (
              <div className="space-y-3">
                {ranked.map((r) => (
                  <div
                    key={r.model.id}
                    className="flex items-stretch gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="w-24 shrink-0">
                      <ModelCard model={r.model} variant="showcase" />
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/models/${r.model.id}`}
                          className="font-semibold text-base hover:text-zinc-300"
                        >
                          {r.model.name}
                        </Link>
                        <div className="flex items-baseline gap-1 shrink-0">
                          <span className="text-xs text-zinc-500">match</span>
                          <span className="text-xl font-bold tabular-nums">
                            {Math.round(r.score)}
                          </span>
                        </div>
                      </div>
                      {r.model.bio && (
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-2">
                          {r.model.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function FilterCheckboxes<T extends string>({
  name,
  label,
  selected,
  options,
}: {
  name: string;
  label: string;
  selected: T[];
  options: { value: T; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input type="hidden" name={name} value={selected.join(",")} />
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              data-active={active}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
              }`}
              data-name={name}
              data-value={o.value}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <noscript>
        <p className="text-[10px] text-zinc-600">
          Chip selection requires JavaScript. Use the free-text brief instead.
        </p>
      </noscript>
      <FilterScript name={name} />
    </div>
  );
}

function FilterScript({ name }: { name: string }) {
  const code = `
    (function(){
      var nameAttr=${JSON.stringify(name)};
      var input=document.querySelector('input[type=hidden][name="'+nameAttr+'"]');
      if(!input) return;
      document.querySelectorAll('button[data-name="'+nameAttr+'"]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var values=(input.value||'').split(',').filter(Boolean);
          var v=btn.getAttribute('data-value');
          var i=values.indexOf(v);
          if(i>=0){ values.splice(i,1); btn.setAttribute('data-active','false'); btn.className=btn.className.replace('bg-white text-black border-white','bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'); }
          else { values.push(v); btn.setAttribute('data-active','true'); btn.className=btn.className.replace('bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500','bg-white text-black border-white'); }
          input.value=values.join(',');
        });
      });
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
