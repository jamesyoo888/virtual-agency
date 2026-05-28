import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Users, Calendar, Calculator } from "lucide-react";
import { listCharacters } from "@/lib/characters/registry";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Character brand kits — multi-face campaigns · Virtual Agency",
  description:
    "Yuna + Ren packaged together for couple, paired, and multi-face brand campaigns. Locked styling DNA across an entire season, category-exclusive licensing optional.",
  alternates: {
    canonical: `${SITE_URL}/en/character/brand-kits`,
  },
  openGraph: {
    title: "Character brand kits — multi-face campaigns",
    description:
      "Yuna + Ren bundled for paired campaigns. One brand kit covers your season.",
    url: `${SITE_URL}/en/character/brand-kits`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_character_brand_kits=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Character brand kits — multi-face campaigns",
    description: "Yuna + Ren bundled. Locked styling DNA across a season.",
    images: [`${SITE_URL}/api/og?en_character_brand_kits=1`],
  },
};

interface KitTier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  highlights: string[];
  characters: string;
  exclusivity: string;
  bestFor: string;
}

const KITS: KitTier[] = [
  {
    name: "Paired editorial",
    price: "$8,500",
    cadence: "per quarter",
    description:
      "Both characters posed together for editorial-style campaigns. Single styling concept, two faces.",
    highlights: [
      "10 paired hero stills (Yuna + Ren in frame)",
      "10 solo stills (5 per character)",
      "1 short paired video (15s)",
      "Locked palette + wardrobe across the kit",
    ],
    characters: "Yuna + Ren",
    exclusivity: "Non-exclusive — paired only",
    bestFor: "K-beauty couple narratives, fragrance launches, fashion editorials.",
  },
  {
    name: "Season anchor (couple)",
    price: "$22,000",
    cadence: "per quarter",
    description:
      "A full season anchored by the couple. Both characters licensed exclusively in your category, across all deliverables.",
    highlights: [
      "40 paired + solo stills",
      "3 hero videos (15–30s each)",
      "1 fitting day with our team",
      "Persona Instagram for one character (90 days)",
      "Quarterly concept refresh",
    ],
    characters: "Yuna + Ren",
    exclusivity: "Category-exclusive (your industry, locked competitor-out)",
    bestFor:
      "Beauty house ambassador-style programs, fashion lookbook series, luxury menswear / womenswear pairings.",
  },
  {
    name: "Custom multi-face program",
    price: "From $50,000",
    cadence: "per quarter",
    description:
      "Yuna + Ren + an additional character built to spec. Designed when you want a recognizable cast over multi-season campaigns.",
    highlights: [
      "Original third character built from your brand DNA",
      "Multi-character narrative scenes (3+ faces in frame)",
      "Quarterly refresh + concept consult",
      "Optional cross-market regional adaptations",
      "Full IP transfer of the custom character optional",
    ],
    characters: "Yuna + Ren + custom",
    exclusivity: "Fully exclusive in your category, all markets",
    bestFor:
      "Brand-defining campaigns where the cast itself is the campaign — recurring talent across two or more seasons.",
  },
];

const USE_CASES = [
  {
    title: "Couple narrative",
    body:
      "Fragrance, jewelry, and lifestyle brands that lean on a paired aesthetic. Yuna's editorial restraint pairs cleanly with Ren's quietly cinematic register.",
  },
  {
    title: "Cross-gender brand kit",
    body:
      "Fashion houses launching menswear and womenswear in the same season. One styling concept, two faces, no continuity drift between the lines.",
  },
  {
    title: "Series casting",
    body:
      "Short-form video series, lookbook chapters, or campaign films where the same cast recurs across episodes. Both characters are designed to share a styling DNA so they read as a believable cast.",
  },
];

export default function CharacterBrandKitsPage() {
  const characters = listCharacters();
  const ld = itemListLd(
    "Virtual Agency character brand kits",
    KITS.map((k, i) => ({
      name: k.name,
      url: `${SITE_URL}/en/character/brand-kits#kit-${i + 1}`,
    }))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Brand kits · multi-face campaigns
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Bundle the cast.
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Most global brands want more than one face in a season. Our owned
            characters are designed to share a styling DNA so a single brand
            kit covers couple narratives, cross-gender launches, and series
            casting — without paying for the continuity work twice.
          </p>
        </header>

        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((c) => (
              <Link
                key={c.slug}
                href={`/en/character/${c.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600 transition-colors"
              >
                <p className="text-xl font-bold group-hover:underline">
                  {c.name}
                </p>
                <p className="text-sm text-zinc-400 mt-1">{c.tagline}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mt-3">
                  Pairs in this kit
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-2">
            Three tiers
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            All prices illustrative USD. Quoted in 24 hours; paid via Stripe
            or wire.
          </p>
          <Link
            href="/en/pricing-calculator?utm_source=character&utm_campaign=brand_kit_calc_anchor"
            className="block mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-colors p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-1.5 mt-0.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-200" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 mb-0.5">
                  Which tier fits my scope?
                </p>
                <p className="text-sm font-semibold text-zinc-100">
                  Map your campaign to the right tier first →{" "}
                  <span className="text-emerald-300">Cost estimator</span>
                </p>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Enter assets, weeks, markets, exclusivity → the calculator
                  recommends paired / season / custom and gives a USD + KRW
                  range. Free pre-tier check.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/en/blog/license-vs-brand-kit-break-even-worked-example"
            className="block mb-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.03] hover:border-amber-400/50 hover:bg-amber-500/[0.07] transition-colors p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-1.5 mt-0.5 text-amber-200 font-bold text-[10px] leading-none flex items-center justify-center w-6 h-6">
                ÷
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300 mb-0.5">
                  License vs paired — where the line is
                </p>
                <p className="text-sm font-semibold text-zinc-100">
                  Break-even sits at ≈14 hero assets — 3 worked examples
                </p>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  12 / 24 / 48-asset campaigns walked through the actual
                  math. Where per-day license still looks cheaper, and where
                  paired starts winning.
                </p>
              </div>
            </div>
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KITS.map((k, i) => (
              <article
                key={k.name}
                id={`kit-${i + 1}`}
                className={`rounded-2xl border p-6 flex flex-col scroll-mt-24 ${
                  i === 1
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-zinc-800 bg-zinc-950/40"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  {k.characters}
                </p>
                <h3 className="text-lg font-semibold mb-2">{k.name}</h3>
                <p className="text-3xl font-bold text-white mb-1 tabular-nums">
                  {k.price}
                </p>
                <p className="text-xs text-zinc-500 mb-4">{k.cadence}</p>
                <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
                  {k.description}
                </p>
                <ul className="text-sm text-zinc-300 space-y-1.5 mb-5 flex-1">
                  {k.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span className="text-zinc-600">·</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-zinc-900 pt-3 text-xs text-zinc-500 space-y-1">
                  <p>
                    <span className="text-zinc-400">Exclusivity:</span>{" "}
                    {k.exclusivity}
                  </p>
                  <p>
                    <span className="text-zinc-400">Best for:</span>{" "}
                    {k.bestFor}
                  </p>
                </div>
                <Link
                  href={`/en/rfp?campaign=${encodeURIComponent(k.name)}&exclusive=${i >= 1 ? "true" : "false"}&budget_band=${i === 0 ? "5k_15k" : i === 1 ? "15k_50k" : "over_50k"}&utm_source=character&utm_campaign=brand_kit_${i === 0 ? "paired" : i === 1 ? "season" : "custom"}`}
                  className={`mt-5 inline-flex items-center justify-center gap-1 text-sm rounded-md px-3 py-2 ${
                    i === 1
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "border border-zinc-700 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  Quote this kit <ArrowRight className="w-3 h-3" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-xl font-semibold tracking-tight mb-6">
            Where the paired kits fit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {USE_CASES.map((u, i) => (
              <div
                key={u.title}
                className="rounded-xl border border-zinc-900 p-5"
              >
                <div className="flex items-center gap-2 mb-3 text-zinc-500">
                  {i === 0 ? (
                    <Sparkles className="w-4 h-4" />
                  ) : i === 1 ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  <p className="text-[10px] uppercase tracking-wider">
                    Use case {i + 1}
                  </p>
                </div>
                <p className="font-semibold text-zinc-100 mb-2">{u.title}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Compliance
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Every character in every kit ships with the synthetic-content
            disclosure metadata required for EU AI Act Article 50, US FTC
            Endorsement Guides, UK ASA / CAP Code, and Korea KCSC guidance.
            See the full posture on the{" "}
            <Link
              href="/en/legal/ai-disclosure"
              className="underline hover:text-white"
            >
              compliance page
            </Link>
            .
          </p>
        </section>

        <footer className="mt-12 pt-8 border-t border-zinc-900 flex flex-wrap gap-3">
          <Link
            href="/en/rfp?campaign=Character+brand+kit&utm_source=character&utm_campaign=brand_kit_index"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            Pitch a brand kit
          </Link>
          <Link
            href="/en/character"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            See individual characters
          </Link>
          <Link
            href="/en/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Standard pricing
          </Link>
        </footer>
      </main>
    </div>
  );
}
