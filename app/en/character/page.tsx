import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCharacters } from "@/lib/characters/registry";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Characters — Virtual Agency",
  description:
    "Owned K-aesthetic synthetic talent — Yuna, Ren, and the growing character roster built for global brand consistency.",
  alternates: {
    canonical: `${SITE_URL}/en/character`,
  },
  openGraph: {
    title: "Characters — Virtual Agency",
    description:
      "Owned K-aesthetic synthetic talent — Yuna, Ren, and the character roster.",
    url: `${SITE_URL}/en/character`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Characters — Virtual Agency",
    description:
      "Owned K-aesthetic synthetic talent — Yuna, Ren, and the character roster.",
    images: [`${SITE_URL}/api/og?en=1`],
  },
};

export default function CharactersIndex() {
  const characters = listCharacters();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 max-w-2xl">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Owned K-aesthetic talent
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Characters
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Named synthetic talent built for cross-season brand consistency.
            One face across markets, palettes locked across quarters,
            disclosure baked into every asset. These are the characters
            global brands license to anchor a campaign program.
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {characters.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/en/character/${c.slug}`}
                className="group block rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 hover:border-zinc-600 transition-colors"
              >
                <p className="text-2xl font-bold text-zinc-100 group-hover:underline">
                  {c.name}
                </p>
                <p className="text-sm text-zinc-400 mt-1">{c.tagline}</p>
                <p className="text-xs text-zinc-500 mt-4 leading-relaxed line-clamp-3">
                  {c.lore}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
                  {c.targetVerticals.slice(0, 4).map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-400 group-hover:text-white">
                  View character <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs text-zinc-500">
          All characters are AI-generated synthetic talent. See the{" "}
          <Link
            href="/en/legal/ai-disclosure"
            className="underline hover:text-zinc-300"
          >
            compliance disclosure
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
