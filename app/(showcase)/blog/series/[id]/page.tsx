import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ArrowRight } from "lucide-react";
import { BLOG_SERIES, listSeries, type BlogSeriesId } from "@/lib/blog/series";
import { getPostBySlug } from "@/lib/blog/posts";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export function generateStaticParams(): Array<{ id: string }> {
  return listSeries("ko").map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const series = listSeries("ko").find((s) => s.id === id);
  if (!series) return { title: "블로그 시리즈 — Virtual Agency" };
  const ogImage = `${SITE_URL}/api/og?series=${series.id}`;
  return {
    title: `${series.title} — Virtual Agency 블로그`,
    description: series.description,
    alternates: {
      canonical: `${SITE_URL}/blog/series/${series.id}`,
      languages: {
        ko: `${SITE_URL}/blog/series/${series.id}`,
        en: `${SITE_URL}/en/blog/series/${series.id}`,
      },
    },
    openGraph: {
      title: `${series.title} — Virtual Agency`,
      description: series.description,
      url: `${SITE_URL}/blog/series/${series.id}`,
      locale: "ko_KR",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: series.title,
      description: series.description,
      images: [ogImage],
    },
  };
}

export default async function BlogSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = listSeries("ko").find((s) => s.id === id);
  if (!series) notFound();

  const posts = series.slugs
    .map((slug) => getPostBySlug(slug, "ko"))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const crumbsLd = breadcrumbLd([
    { name: "Home", url: SITE_URL },
    { name: "블로그", url: `${SITE_URL}/blog` },
    { name: series.title, url: `${SITE_URL}/blog/series/${series.id}` },
  ]);
  const listLd = itemListLd(
    series.title,
    posts.map((p) => ({
      name: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      image: `${SITE_URL}/api/og?blog=${encodeURIComponent(p.slug)}`,
    }))
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(crumbsLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldScript(listLd) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> 블로그 전체
        </Link>

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300 mb-3 inline-flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            블로그 시리즈 · {posts.length}편
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {series.title}
          </h1>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            {series.description}
          </p>
        </header>

        <ol className="space-y-6">
          {posts.map((p, idx) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="group block">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-violet-300 tabular-nums shrink-0">
                    Part {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums">
                    {p.publishedAt} · {p.readingMinutes}분
                  </span>
                </div>
                <h2 className="text-lg font-semibold group-hover:underline">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  {p.excerpt}
                </p>
                <p className="mt-2 text-xs text-violet-300 inline-flex items-center gap-1">
                  읽기 <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
