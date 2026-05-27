import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listPosts,
  getPostBySlug,
  listRelatedPosts,
} from "@/lib/blog/posts";
import { getSeriesForPost } from "@/lib/blog/series";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { trackBlogView } from "@/lib/analytics/track-blog-view";
import {
  blogPostingLd,
  breadcrumbLd,
  ldScript,
} from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export async function generateStaticParams() {
  return listPosts("en").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug, "en");
  if (!post) return { title: "Post not found — Virtual Agency" };
  const ogImage = `${SITE_URL}/api/og?blog=${encodeURIComponent(post.slug)}`;
  return {
    title: `${post.title} — Virtual Agency`,
    description: post.excerpt,
    alternates: {
      canonical: `${SITE_URL}/en/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      locale: "en_US",
      publishedTime: post.publishedAt,
      tags: post.tags,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

export default async function EnBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug, "en");
  if (!post) notFound();

  void trackBlogView(post.slug, "en");
  const related = listRelatedPosts(post.slug, 3);
  const seriesPos = getSeriesForPost(post.slug, "en");
  const prevPost = seriesPos?.prevSlug ? getPostBySlug(seriesPos.prevSlug, "en") : null;
  const nextPost = seriesPos?.nextSlug ? getPostBySlug(seriesPos.nextSlug, "en") : null;

  const articleLd = blogPostingLd({
    title: post.title,
    description: post.excerpt,
    slug: post.slug,
    publishedAt: post.publishedAt,
    tags: post.tags,
    readingMinutes: post.readingMinutes,
  });
  const crumbsLd = breadcrumbLd([
    { name: "Home", url: `${SITE_URL}/en` },
    { name: "Blog", url: `${SITE_URL}/en/blog` },
    { name: post.title, url: `${SITE_URL}/en/blog/${post.slug}` },
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
      <article className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/en/blog"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> Blog
        </Link>

        <header className="mb-10">
          <div className="flex gap-1.5 mb-3">
            {post.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5"
              >
                #{t}
              </span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {post.title}
          </h1>
          <p className="text-zinc-400 mt-3">{post.excerpt}</p>
          <p className="text-xs text-zinc-500 mt-4 tabular-nums">
            {post.publishedAt} · {post.readingMinutes} min read
          </p>
        </header>

        {seriesPos && (
          <div className="mb-10 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-violet-300">
              <BookOpen className="w-3.5 h-3.5" />
              {seriesPos.series.title}
              <span className="ml-auto text-violet-200/80 tabular-nums">
                Part {seriesPos.part} / {seriesPos.total}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              {seriesPos.series.description}
            </p>
          </div>
        )}

        <div className="space-y-10 prose-invert">
          {post.sections.map((section) => (
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
              Ready to start a campaign?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/en/rfp"
                className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
              >
                Send a brief
              </Link>
              <Link
                href="/en/match"
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                Match a model
              </Link>
              <Link
                href="/en/character"
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                Meet the characters
              </Link>
              <Link
                href="/en/pricing"
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                See pricing
              </Link>
            </div>
          </div>

          {seriesPos && (prevPost || nextPost) && (
            <section className="mt-12">
              <h3 className="text-xs uppercase tracking-wider text-violet-300 mb-4 inline-flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                Next in series
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prevPost && (
                  <Link
                    href={`/en/blog/${prevPost.slug}`}
                    className="rounded-lg border border-zinc-800 hover:border-violet-500/40 hover:bg-violet-500/5 p-4 transition-colors"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 inline-flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" />
                      Prev (Part {seriesPos.part - 1})
                    </p>
                    <p className="text-sm font-medium text-zinc-200">
                      {prevPost.title}
                    </p>
                  </Link>
                )}
                {nextPost && (
                  <Link
                    href={`/en/blog/${nextPost.slug}`}
                    className="rounded-lg border border-zinc-800 hover:border-violet-500/40 hover:bg-violet-500/5 p-4 transition-colors md:text-right"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 inline-flex items-center gap-1 md:flex-row-reverse">
                      <ArrowRight className="w-3 h-3" />
                      Next (Part {seriesPos.part + 1})
                    </p>
                    <p className="text-sm font-medium text-zinc-200">
                      {nextPost.title}
                    </p>
                  </Link>
                )}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-12">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
                Related
              </h3>
              <ul className="space-y-4">
                {related.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/en/blog/${o.slug}`}
                      className="group block"
                    >
                      <p className="text-sm text-zinc-200 group-hover:underline">
                        {o.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1 truncate">
                        {o.excerpt}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </footer>
      </article>
    </div>
  );
}
