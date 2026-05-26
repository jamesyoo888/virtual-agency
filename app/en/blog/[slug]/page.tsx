import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listPosts,
  getPostBySlug,
  listRelatedPosts,
} from "@/lib/blog/posts";
import { ArrowLeft } from "lucide-react";
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

  const related = listRelatedPosts(post.slug, 3);

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
