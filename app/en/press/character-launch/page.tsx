import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 86400;

const PUBLISHED_AT = "2026-05-27T00:00:00+09:00";
const HEADLINE =
  "Virtual Agency Launches Owned K-Aesthetic Synthetic Talent Lineup «Yuna» and «Ren» for Global Brands";

export const metadata: Metadata = {
  title: "Press Release — Virtual Agency Character Lineup Launch",
  description:
    "Owned K-aesthetic AI synthetic talent — Yuna and Ren — launches for global beauty, fragrance, fashion, and luxury campaigns. Quarterly paired brand kits with category exclusivity available.",
  alternates: {
    canonical: `${SITE_URL}/en/press/character-launch`,
  },
  openGraph: {
    title: "Virtual Agency Launches Yuna + Ren — Owned K-Aesthetic Synthetic Talent",
    description:
      "Owned K-aesthetic IP for global brand campaigns. Quarterly paired brand kits launch alongside the character roster.",
    url: `${SITE_URL}/en/press/character-launch`,
    locale: "en_US",
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [`${SITE_URL}/api/og?en_characters=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: HEADLINE,
    description: "Yuna + Ren — owned K-aesthetic synthetic talent for global brands.",
    images: [`${SITE_URL}/api/og?en_characters=1`],
  },
};

export default function EnCharacterLaunchPress() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: HEADLINE,
    datePublished: PUBLISHED_AT,
    dateModified: PUBLISHED_AT,
    publisher: {
      "@type": "Organization",
      name: "Virtual Agency",
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/en/press/character-launch`,
    image: [`${SITE_URL}/api/og?en_characters=1`],
    articleSection: "Press",
    inLanguage: "en",
  };
  const crumbsLd = breadcrumbLd([
    { name: "Home", url: `${SITE_URL}/en` },
    { name: "Press", url: `${SITE_URL}/en/press` },
    {
      name: "Character lineup launch",
      url: `${SITE_URL}/en/press/character-launch`,
    },
  ]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbsLd) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/en/press"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-6"
        >
          ← Press
        </Link>

        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Press release · For immediate release
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {HEADLINE}
          </h1>
          <p className="mt-4 text-sm text-zinc-500">
            Seoul · May 27, 2026 — Virtual Agency
          </p>
        </header>

        <article className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed space-y-5">
          <p>
            <strong>Virtual Agency</strong>, the Korea-based global brand
            campaign infrastructure studio, today announced the launch of
            its owned K-aesthetic AI synthetic talent lineup — Yuna and Ren.
            The licensable character IP is built so global beauty, fashion,
            fragrance, and luxury brands can hold K-aesthetic credibility
            without re-casting every season.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            The consistency problem global brands face
          </h2>
          <p>
            K-pop, K-drama, and K-beauty turned K-aesthetic into a
            recognizable ad-category cue worldwide. But global brands have
            struggled with consistency — re-casting every season drifts the
            tone, and simultaneous launches across markets rarely keep the
            same face. Virtual Agency's character licensing infrastructure
            solves that problem.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            Yuna — Cool minimalist Seoul editorial
          </h2>
          <p>
            Yuna is a 24-year-old synthetic K-aesthetic female talent built
            for global beauty, fashion, tech, and lifestyle brands tapping
            the Seoul visual register — soft glass-skin lighting, cool-
            leaning palettes, restrained editorial. She reads naturally
            across New York, Berlin, and Singapore campaign rotations
            without feeling like a costume of any one market.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            Ren — K-pop visual register for fragrance and watches
          </h2>
          <p>
            Ren is a 26-year-old synthetic K-aesthetic male talent. He
            carries the K-pop visual register — strong jawline, sharp eye,
            editorial restraint — without being a literal K-pop reference.
            Built for global fragrance, watch, luxury menswear, and
            cinematic ad campaigns. He shares Yuna's styling DNA, enabling
            paired casting.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            License structure — solo, paired, multi-face
          </h2>
          <p>
            Three quarterly tiers launch alongside the characters. «Paired
            Editorial» ($8,500 / quarter) — both characters in one
            editorial campaign. «Season Anchor (couple)» ($22,000 /
            quarter) — category exclusivity plus paired and solo full sets
            and a 90-day persona Instagram for one character. «Custom
            Multi-Face» ($50,000+ / quarter) — Yuna, Ren, and an additional
            brand-built character.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            Compliance — 4-market disclosure metadata
          </h2>
          <p>
            Every character in every kit ships with synthetic-content
            disclosure metadata aligned to the EU AI Act Article 50, US FTC
            Endorsement Guides, UK ASA / CAP Code, and Korea KCSC / Fair
            Trade Commission guidance. C2PA provenance, per-market AI-
            synthetic strings, generator hash, and brand-side signature
            travel with every file.
          </p>

          <h2 className="text-lg font-semibold text-zinc-100 mt-8">
            About Virtual Agency
          </h2>
          <p>
            Virtual Agency is a brand-campaign studio operating synthetic
            talent infrastructure for global brands tapping K-aesthetic.
            The company runs its own GPU stack, self-hosted Supabase data
            layer, Stripe global billing, and a 4-market disclosure
            compliance pipeline end-to-end.
          </p>
        </article>

        <section className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Media contact
            </p>
            <p className="text-zinc-300">
              press@aihubs.uk
              <br />
              <span className="text-zinc-500 text-xs">
                Response SLA: 24 hours (KST weekdays)
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Assets
            </p>
            <ul className="text-zinc-300 space-y-1">
              <li>
                <Link
                  href="/en/character"
                  className="underline hover:text-white"
                >
                  Character roster
                </Link>
              </li>
              <li>
                <Link
                  href="/en/character/brand-kits"
                  className="underline hover:text-white"
                >
                  Brand kit tiers
                </Link>
              </li>
              <li>
                <Link
                  href="/en/character/compare"
                  className="underline hover:text-white"
                >
                  Yuna vs Ren comparison
                </Link>
              </li>
              <li>
                <Link
                  href="/en/press"
                  className="underline hover:text-white"
                >
                  Press kit
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <p className="mt-12 text-[11px] text-zinc-600 leading-relaxed">
          ###
          <br />
          Yuna and Ren are AI-generated synthetic talent. See the{" "}
          <Link
            href="/en/legal/ai-disclosure"
            className="underline hover:text-zinc-300"
          >
            AI synthetic content disclosure
          </Link>{" "}
          for per-market labeling requirements.
        </p>
      </main>
    </div>
  );
}
