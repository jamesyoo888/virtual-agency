import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCharacters } from "@/lib/characters/registry";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Yuna vs Ren — Character Comparison · Virtual Agency",
  description:
    "Compare Yuna and Ren side by side — persona, lighting, palette, target verticals. The reference for deciding between solo casting and a paired brand kit.",
  alternates: {
    canonical: `${SITE_URL}/en/character/compare`,
  },
  openGraph: {
    title: "Yuna vs Ren — Character Comparison",
    description:
      "Two K-aesthetic characters compared side by side. Decide between solo and paired casting.",
    url: `${SITE_URL}/en/character/compare`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_characters=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yuna vs Ren — Character Comparison",
    description: "Two K-aesthetic characters compared side by side.",
    images: [`${SITE_URL}/api/og?en_characters=1`],
  },
};

const EN_BEST_FOR: Record<string, string> = {
  yuna: "Beauty PDP, fashion editorial, luxury fragrance, tech lifestyle",
  ren: "Fragrance & watches, luxury menswear, motorsport, cinematic ads",
};

export default function EnCharacterComparePage() {
  const characters = listCharacters();
  const ld = itemListLd(
    "Virtual Agency character comparison",
    characters.map((c) => ({
      name: c.name,
      url: `${SITE_URL}/en/character/${c.slug}`,
    }))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/en/character"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          ← Character roster
        </Link>

        <header className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Character comparison
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {characters.map((c) => c.name).join(" vs ")}
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            When you're deciding between solo casting and a paired brand kit,
            this page collapses the trade-off into one screen. The pair shares
            a styling DNA but targets different verticals, moods, and lighting
            registers.
          </p>
        </header>

        <section className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40 mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-zinc-500 font-normal w-32">
                  Attribute
                </th>
                {characters.map((c) => (
                  <th
                    key={c.slug}
                    className="text-left p-4 font-semibold text-zinc-100"
                  >
                    <Link
                      href={`/en/character/${c.slug}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs font-normal text-zinc-500 mt-0.5">
                      {c.tagline}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              <tr>
                <td className="p-4 text-zinc-500 align-top">Basics</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    Age {c.age} · {c.gender} · introduced {c.introducedAt}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Persona</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.persona}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Lighting</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.aesthetic.lighting}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Palette</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.aesthetic.palette.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Wardrobe</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.aesthetic.wardrobe}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Verticals</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.targetVerticals.map((v) => (
                        <Link
                          key={v}
                          href={`/en/explore/${v}`}
                          className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white"
                        >
                          {v}
                        </Link>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Moods</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.defaultMoods.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Best for</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {EN_BEST_FOR[c.slug] ?? c.targetVerticals.join(", ")}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-zinc-500 align-top">Licensing</td>
                {characters.map((c) => (
                  <td key={c.slug} className="p-4 text-zinc-300 align-top">
                    {c.licensingNote}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-300 mb-2">
            Paired brand kit
          </p>
          <p className="text-zinc-200 font-semibold mb-1">
            Both characters share the same styling DNA.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Brands that need both faces in one season get better per-asset
            economics on a paired kit — designed for couple narratives, paired
            line launches, and recurring cast across drops.
          </p>
          <Link
            href="/en/character/brand-kits"
            className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
          >
            See paired kit pricing <ArrowRight className="w-3 h-3" />
          </Link>
        </section>

        <footer className="flex flex-wrap gap-3 pt-6 border-t border-zinc-900">
          <Link
            href="/en/rfp?campaign=Character campaign"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            Submit an RFP
          </Link>
          <Link
            href="/en/character"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Back to roster
          </Link>
          <Link
            href="/en/match"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Matching engine
          </Link>
        </footer>
      </main>
    </div>
  );
}
