import type { Metadata } from "next";
import Link from "next/link";
import {
  ANCHOR_CATEGORIES,
  METHODOLOGY,
  listAnchorCases,
} from "@/lib/cases/anchor-cases";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Case studies — Virtual Agency",
  description:
    "Anchor case studies of global brands using K-aesthetic synthetic talent — and the categories we are actively recruiting next.",
  alternates: {
    canonical: `${SITE_URL}/en/cases`,
    languages: {
      en: `${SITE_URL}/en/cases`,
      ko: `${SITE_URL}/cases`,
    },
  },
  openGraph: {
    title: "Case studies — Virtual Agency",
    description:
      "Anchor case studies of global brands using K-aesthetic synthetic talent.",
    url: `${SITE_URL}/en/cases`,
    locale: "en_US",
    type: "website",
  },
};

export default function EnCasesPage() {
  const cases = listAnchorCases();
  const ld =
    cases.length > 0
      ? itemListLd(
          "Virtual Agency case studies",
          cases.map((c) => ({
            name: c.title,
            url: `${SITE_URL}/en/cases/${c.slug}`,
          }))
        )
      : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
        />
      )}
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Cases
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Anchor case studies
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            What we have shipped, with brands who are willing to let us write
            about it. Anonymized where the brand prefers; named when they
            opted into attribution.
          </p>
        </header>

        {cases.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 md:p-10 mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 mb-3">
              Recruiting · anchor slots open
            </p>
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              The first three cases publish here as soon as we ship them.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-6">
              We are taking on a small number of anchor engagements at
              discounted rates in exchange for the right to write up the work
              afterwards. If your brand fits one of the categories below, talk
              to us.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {ANCHOR_CATEGORIES.map((cat) => (
                <div
                  key={`${cat.vertical}-${cat.market}`}
                  className="rounded-xl border border-zinc-800 bg-black/40 p-5"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">
                    {cat.vertical} · {cat.market}
                  </p>
                  <p className="font-semibold text-zinc-100 mb-2">
                    {cat.title}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:hello@virtualagency.example.com?subject=Anchor%20case%20engagement"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
              >
                Pitch an anchor engagement →
              </a>
              <Link
                href="/en/pricing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
              >
                See pricing
              </Link>
            </div>
          </section>
        ) : (
          <ul className="space-y-6 mb-16">
            {cases.map((c) => (
              <li
                key={c.slug}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6"
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    {c.vertical} · {c.market}
                  </p>
                  <p className="text-xs text-zinc-500 tabular-nums">
                    {c.publishedAt} · {c.durationLabel}
                  </p>
                </div>
                <h2 className="text-xl font-semibold mb-1">
                  <Link
                    href={`/en/cases/${c.slug}`}
                    className="hover:underline"
                  >
                    {c.title}
                  </Link>
                </h2>
                <p className="text-sm text-zinc-400 mb-2">
                  {c.companyMask}
                </p>
                <p className="text-sm text-zinc-300">{c.pitch}</p>
                {c.metrics.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-4">
                    {c.metrics.slice(0, 4).map((m) => (
                      <div key={m.label} className="text-xs">
                        <p className="text-base font-semibold tabular-nums text-zinc-100">
                          {m.value}
                        </p>
                        <p className="text-zinc-500">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <section className="border-t border-zinc-900 pt-12">
          <h2 className="text-xl font-semibold tracking-tight mb-6">
            How we write a case study
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METHODOLOGY.map((m) => (
              <div
                key={m.heading}
                className="rounded-xl border border-zinc-900 p-5"
              >
                <p className="font-semibold text-zinc-100 mb-2">
                  {m.heading}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t border-zinc-900 text-center">
          <p className="text-sm text-zinc-300">
            Want to be one of the first three?
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <a
              href="mailto:hello@virtualagency.example.com?subject=Anchor%20engagement"
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-4 py-2 hover:bg-zinc-200"
            >
              Start the conversation
            </a>
            <Link
              href="/en/legal/ai-disclosure"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-900"
            >
              Compliance posture
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
