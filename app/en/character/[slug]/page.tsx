import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Palette,
  Shirt,
  Quote,
} from "lucide-react";
import { CHARACTERS, getCharacter, type CharacterSlug } from "@/lib/characters/registry";
import { breadcrumbLd, characterPersonLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export function generateStaticParams(): Array<{ slug: CharacterSlug }> {
  return CHARACTERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = getCharacter(slug);
  if (!character) return { title: "Character — Virtual Agency" };

  const title = `${character.name} — ${character.tagline} · Virtual Agency`;
  const description = `${character.name}: ${character.persona} K-aesthetic AI virtual talent built for ${character.targetVerticals.join(", ")}.`;
  const ogImage = `${SITE_URL}/api/og?en_character=${character.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/character/${character.slug}`,
    },
    openGraph: {
      title: `${character.name} — Virtual Agency`,
      description,
      url: `${SITE_URL}/en/character/${character.slug}`,
      locale: "en_US",
      type: "profile",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${character.name} — Virtual Agency`,
      description,
      images: [ogImage],
    },
  };
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = getCharacter(slug);
  if (!character) notFound();

  const otherCharacters = CHARACTERS.filter((c) => c.slug !== character.slug);

  const personLd = characterPersonLd(character);
  const crumbsLd = breadcrumbLd([
    { name: "Home", url: `${SITE_URL}/en` },
    { name: "Characters", url: `${SITE_URL}/en/character` },
    { name: character.name, url: `${SITE_URL}/en/character/${character.slug}` },
  ]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbsLd) }}
      />
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/en"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Home
        </Link>

        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Character · K-aesthetic synthetic talent
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            {character.name}
          </h1>
          <p className="text-xl text-zinc-400 mt-2">{character.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              Age {character.age}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {character.gender}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
              «AI Synthetic»
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              Introduced {character.introducedAt}
            </span>
          </div>
        </header>

        <section className="mb-16">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-3">
            Lore
          </h2>
          <p className="text-zinc-300 leading-relaxed text-base md:text-lg">
            {character.lore}
          </p>
        </section>

        <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Persona
              </p>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {character.persona}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Lighting recipe
              </p>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {character.aesthetic.lighting}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Palette anchors
              </p>
            </div>
            <ul className="text-sm text-zinc-300 space-y-1">
              {character.aesthetic.palette.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-950/40">
            <div className="flex items-center gap-2 mb-3">
              <Shirt className="w-4 h-4 text-zinc-500" />
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Wardrobe register
              </p>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {character.aesthetic.wardrobe}
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-3">
            Built for
          </h2>
          <div className="flex flex-wrap gap-2">
            {character.targetVerticals.map((v) => (
              <Link
                key={v}
                href={`/en/explore/${v}`}
                className="px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40 mb-12">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Licensing
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {character.licensingNote}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/en/rfp?campaign=${encodeURIComponent(character.name + " campaign")}&exclusive=true`}
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
            >
              Submit an RFP <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href={`/en/match?industries=${character.targetVerticals[0] ?? ""}&moods=${character.defaultMoods[0] ?? ""}`}
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              Match similar models
            </Link>
            <Link
              href="/en/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              Pricing
            </Link>
          </div>
        </section>

        {otherCharacters.length > 0 && (
          <section className="border-t border-zinc-900 pt-8">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
              Other characters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherCharacters.map((c) => (
                <Link
                  key={c.slug}
                  href={`/en/character/${c.slug}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600 transition-colors"
                >
                  <p className="text-lg font-semibold">{c.name}</p>
                  <p className="text-sm text-zinc-400 mt-1">{c.tagline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-[11px] text-zinc-600 leading-relaxed">
          {character.name} is an AI-generated synthetic talent. See the{" "}
          <Link
            href="/en/legal/ai-disclosure"
            className="underline hover:text-zinc-300"
          >
            compliance disclosure
          </Link>{" "}
          for per-market labeling requirements.
        </p>
      </main>
    </div>
  );
}
