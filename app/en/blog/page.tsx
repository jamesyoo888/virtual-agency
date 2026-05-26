import type { Metadata } from "next";
import Link from "next/link";
import { listPosts, listTags, tagSlug } from "@/lib/blog/posts";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";
import { ArrowRight } from "lucide-react";

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
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t.tag}
                  className="text-[11px] text-zinc-400 border border-zinc-800 rounded-full px-2.5 py-1"
                >
                  #{t.tag}
                  <span className="ml-1 text-zinc-600">{t.count}</span>
                </span>
              ))}
            </div>
          )}
        </header>

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
        {/* Avoid the unused-var warning for tagSlug while we keep the import
            ready for the future tag-page wiring. */}
        <span className="hidden" aria-hidden>
          {tagSlug("")}
        </span>
      </main>
    </div>
  );
}
