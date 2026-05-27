import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY_TERMS } from "@/lib/glossary/terms";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Glossary · Virtual Agency",
    description: "K-aesthetic and synthetic-talent vocabulary, 14 terms.",
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
            Jump to
          </p>
          <ul className="flex flex-wrap gap-1.5 text-sm">
            {GLOSSARY_TERMS.map((t) => (
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
        </nav>

        <dl className="space-y-8">
          {GLOSSARY_TERMS.map((t) => (
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
            </div>
          ))}
        </dl>

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
