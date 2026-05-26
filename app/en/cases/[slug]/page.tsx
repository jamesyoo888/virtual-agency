import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAnchorCaseBySlug,
  listAnchorCases,
} from "@/lib/cases/anchor-cases";
import { ArrowLeft } from "lucide-react";
import { breadcrumbLd, ldScript } from "@/lib/seo/json-ld";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export async function generateStaticParams() {
  return listAnchorCases().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getAnchorCaseBySlug(slug);
  if (!c) return { title: "Case not found — Virtual Agency" };
  return {
    title: `${c.title} — Virtual Agency`,
    description: c.pitch,
    alternates: {
      canonical: `${SITE_URL}/en/cases/${c.slug}`,
    },
    openGraph: {
      title: c.title,
      description: c.pitch,
      type: "article",
      publishedTime: c.publishedAt,
      locale: "en_US",
    },
  };
}

export default async function EnCaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getAnchorCaseBySlug(slug);
  if (!c) notFound();

  const crumbs = breadcrumbLd([
    { name: "Home", url: `${SITE_URL}/en` },
    { name: "Cases", url: `${SITE_URL}/en/cases` },
    { name: c.title, url: `${SITE_URL}/en/cases/${c.slug}` },
  ]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbs) }}
      />
      <article className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/en/cases"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> Cases
        </Link>

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3">
            {c.vertical} · {c.market}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {c.title}
          </h1>
          <p className="text-zinc-400 mt-3">{c.pitch}</p>
          <p className="text-xs text-zinc-500 mt-4 tabular-nums">
            {c.publishedAt} · {c.durationLabel} · {c.companyMask}
          </p>
        </header>

        {c.metrics.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {c.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
              >
                <p className="text-xl md:text-2xl font-bold tabular-nums text-zinc-100">
                  {m.value}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{m.label}</p>
              </div>
            ))}
          </section>
        )}

        <div className="space-y-10">
          {c.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold mb-3">{section.heading}</h2>
              <p className="text-sm md:text-base text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-zinc-900">
          <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-950/40">
            <p className="text-sm text-zinc-300">
              Want a similar engagement for your brand?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="mailto:hello@virtualagency.example.com?subject=Campaign%20brief"
                className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
              >
                Send a brief
              </a>
              <Link
                href="/en/pricing"
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                See pricing
              </Link>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
