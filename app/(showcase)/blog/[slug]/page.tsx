import Link from "next/link";
import { notFound } from "next/navigation";
import { listPosts, getPostBySlug, tagSlug } from "@/lib/blog/posts";
import { ArrowLeft } from "lucide-react";
import { blogPostingLd, breadcrumbLd, ldScript } from "@/lib/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";

export const revalidate = 3600;

export async function generateStaticParams() {
  return listPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "글을 찾을 수 없습니다 — Virtual Agency" };
  const ogImage = `${SITE_URL}/api/og?blog=${encodeURIComponent(post.slug)}`;
  return {
    title: `${post.title} — Virtual Agency`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const others = listPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  const articleLd = blogPostingLd({
    title: post.title,
    description: post.excerpt,
    slug: post.slug,
    publishedAt: post.publishedAt,
    tags: post.tags,
  });
  const crumbsLd = breadcrumbLd([
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
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
          href="/blog"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-3 h-3" /> 블로그 목록
        </Link>

        <header className="mb-10">
          <div className="flex gap-1.5 mb-3">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog/tag/${tagSlug(t)}`}
                className="text-[10px] text-zinc-500 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 rounded px-1.5 py-0.5"
              >
                #{t}
              </Link>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {post.title}
          </h1>
          <p className="text-zinc-400 mt-3">{post.excerpt}</p>
          <p className="text-xs text-zinc-500 mt-4 tabular-nums">
            {post.publishedAt} · {post.readingMinutes}분 읽기
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
              실제 캠페인을 시작할 준비가 되셨나요?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/match"
                className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
              >
                AI 매칭 시작
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                가격 보기
              </Link>
            </div>
          </div>

          {others.length > 0 && (
            <section className="mt-12">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
                다른 글
              </h3>
              <ul className="space-y-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      href={`/blog/${o.slug}`}
                      className="text-sm text-zinc-300 hover:underline"
                    >
                      {o.title}
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
