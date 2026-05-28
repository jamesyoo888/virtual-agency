import type { Metadata } from "next";
import Link from "next/link";
import { listPosts, listTags, tagSlug } from "@/lib/blog/posts";
import { listSeries } from "@/lib/blog/series";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";
import { ArrowRight, Rss, BookOpen, Calculator } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  title: "Blog — Virtual Agency",
  description:
    "Insights on K-aesthetic, synthetic talent, and global brand campaigns from the team building Virtual Agency.",
  alternates: {
    canonical: `${SITE_URL}/en/blog`,
    languages: {
      en: `${SITE_URL}/en/blog`,
      ko: `${SITE_URL}/blog`,
    },
  },
  openGraph: {
    title: "Blog — Virtual Agency",
    description: "Notes on K-aesthetic and synthetic talent.",
    url: `${SITE_URL}/en/blog`,
    locale: "en_US",
    type: "website",
    images: [`${SITE_URL}/api/og?en_blog=1`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Virtual Agency",
    description: "K-aesthetic, synthetic talent, brand strategy.",
    images: [`${SITE_URL}/api/og?en_blog=1`],
  },
};

export default function EnBlogIndexPage() {
  const posts = listPosts("en");
  const tags = listTags("en");
  const series = listSeries("en");

  const ld = itemListLd(
    "Virtual Agency Blog",
    posts.map((p) => ({
      name: p.title,
      url: `${SITE_URL}/en/blog/${p.slug}`,
      image: `${SITE_URL}/api/og?blog=${encodeURIComponent(p.slug)}`,
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
            Insights
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Blog
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            How K-aesthetic became a global brand language, what synthetic talent
            actually costs, and how to brief for it without sounding like a
            stereotype. Notes from running Virtual Agency.
          </p>
          <a
            href="/en/blog/rss.xml"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mt-4"
          >
            <Rss className="w-3 h-3" /> RSS
          </a>
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link
                  key={t.tag}
                  href={`/en/blog/tag/${tagSlug(t.tag)}`}
                  className="text-[11px] text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 rounded-full px-2.5 py-1"
                >
                  #{t.tag}
                  <span className="ml-1 text-zinc-600">{t.count}</span>
                </Link>
              ))}
            </div>
          )}
        </header>

        <Link
          href="/en/pricing-calculator?utm_source=blog&utm_campaign=blog_index_featured"
          className="block mb-10 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-colors p-5"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-2 mt-0.5">
              <Calculator className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 mb-1">
                Interactive tool
              </p>
              <p className="text-base font-semibold text-zinc-100">
                Check the budget before you read — Cost estimator
              </p>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                4 inputs (assets, season weeks, markets, exclusivity) → instant
                USD + KRW range and a recommended path. The working version of
                the ROI frameworks this blog covers.
              </p>
              <p className="mt-2 text-xs text-emerald-300 inline-flex items-center gap-1">
                Open the calculator <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          </div>
        </Link>

        {series.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-violet-300 mb-4 inline-flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              Curated series
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {series.map((s) => (
                <Link
                  key={s.id}
                  href={`/en/blog/series/${s.id}`}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 hover:border-violet-400/50 hover:bg-violet-500/10 transition-colors group"
                >
                  <p className="text-[10px] uppercase tracking-wider text-violet-300 tabular-nums">
                    {s.slugs.length} posts
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-100 group-hover:text-white">
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {s.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {posts.length === 0 ? (
          <p className="text-sm text-zinc-500 border-t border-zinc-900 pt-8">
            More posts publishing soon. In the meantime, see our{" "}
            <Link
              href="/en/legal/ai-disclosure"
              className="underline hover:text-white"
            >
              compliance disclosure
            </Link>{" "}
            or{" "}
            <Link href="/en/pricing" className="underline hover:text-white">
              pricing
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-8 border-t border-zinc-900">
            {posts.map((post) => (
              <li key={post.slug} className="pt-8">
                <Link href={`/en/blog/${post.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                    <p className="text-xs text-zinc-500 tabular-nums">
                      {post.publishedAt} · {post.readingMinutes} min read
                    </p>
                    <div className="flex gap-1.5">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold group-hover:underline">
                    {post.title}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-2">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 mt-3 group-hover:text-zinc-300">
                    Continue reading{" "}
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {/* Tag pill suppress — we deliberately don't link tags to /en/blog/tag/
           pages yet because the English catalog is small and per-tag pages
           would each show 1 post. Add when there are 10+ posts per tag. */}
        <p className="mt-12 text-xs text-zinc-600">
          Looking for the Korean catalog?{" "}
          <Link href="/blog" className="underline hover:text-zinc-400">
            /blog
          </Link>
        </p>
      </main>
    </div>
  );
}
