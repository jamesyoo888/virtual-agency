import type { Metadata } from "next";
import Link from "next/link";
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORY_LABELS,
  groupByCategory,
} from "@/lib/glossary/terms";
import { hasCharacterContext } from "@/lib/glossary/character-context";
import { definedTermSetLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Glossary — K-aesthetic · Synthetic Talent · Licensing · Virtual Agency",
  description:
    "14 K-aesthetic, synthetic-talent, brand-kit, and licensing terms defined. Reference for buyers writing a brief, getting quoted, or doing compliance review.",
  alternates: {
    canonical: `${SITE_URL}/en/glossary`,
  },
  openGraph: {
    title: "Glossary · Virtual Agency",
    description: "K-aesthetic and synthetic-talent vocabulary, 14 terms.",
    url: `${SITE_URL}/en/glossary`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_glossary=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Glossary · Virtual Agency",
    description: "K-aesthetic and synthetic-talent vocabulary, 14 terms.",
    images: [`${SITE_URL}/api/og?en_glossary=1`],
  },
};

export default function EnGlossaryPage() {
  const ld = definedTermSetLd(
    "Virtual Agency glossary — K-aesthetic / synthetic talent",
    GLOSSARY_TERMS.map((t) => ({
      url: `${SITE_URL}/en/glossary#${t.slug}`,
      term: t.en.term,
      description: t.en.definition,
    }))
  );
  const groups = groupByCategory();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Reference
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Glossary
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl">
            Fourteen terms that come up across K-aesthetic advertising, AI
            synthetic talent, licensing, and operational workflow. Save it as
            a reference for the brief, the quote review, and the compliance
            sign-off.
          </p>
        </header>

        <nav className="mb-12 rounded-xl border border-zinc-900 bg-zinc-950/40 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Jump to category
          </p>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.category}>
                <p className="text-[11px] uppercase tracking-wider text-zinc-600 mb-1.5">
                  <a
                    href={`#cat-${g.category}`}
                    className="hover:text-zinc-400"
                  >
                    {GLOSSARY_CATEGORY_LABELS[g.category].en}
                  </a>{" "}
                  <span className="text-zinc-700">· {g.entries.length}</span>
                </p>
                <ul className="flex flex-wrap gap-1.5 text-sm">
                  {g.entries.map((t) => (
                    <li key={t.slug}>
                      <a
                        href={`#${t.slug}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                      >
                        {t.en.term}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="space-y-12">
          {groups.map((g) => (
            <section
              key={g.category}
              id={`cat-${g.category}`}
              className="scroll-mt-24"
            >
              <h2 className="text-xs uppercase tracking-[0.3em] text-zinc-600 mb-5">
                {GLOSSARY_CATEGORY_LABELS[g.category].en}
              </h2>
              <dl className="space-y-8">
                {g.entries.map((t) => (
                  <div
                    key={t.slug}
                    id={t.slug}
                    className="scroll-mt-24 border-l-2 border-zinc-800 pl-5"
                  >
                    <dt className="text-lg font-semibold text-zinc-100">
                      {t.en.term}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-400 leading-relaxed">
                      {t.en.definition}
                    </dd>
                    {t.relatedPostSlug && (
                      <Link
                        href={`/en/blog/${t.relatedPostSlug}`}
                        className="mt-2 inline-block text-xs text-zinc-500 hover:text-zinc-300 underline"
                      >
                        Read more →
                      </Link>
                    )}
                    {hasCharacterContext(t.slug) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        See in practice:{" "}
                        <Link
                          href="/en/character/yuna"
                          className="text-purple-300 hover:text-purple-200 underline"
                        >
                          Yuna
                        </Link>{" "}
                        ·{" "}
                        <Link
                          href="/en/character/ren"
                          className="text-purple-300 hover:text-purple-200 underline"
                        >
                          Ren
                        </Link>
                      </p>
                    )}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-zinc-900 flex flex-wrap gap-3">
          <Link
            href="/en/rfp"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
          >
            Submit an RFP
          </Link>
          <Link
            href="/en/character"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Character roster
          </Link>
          <Link
            href="/en/blog"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            Blog
          </Link>
        </footer>
      </main>
    </div>
  );
}
