import Link from "next/link";
import { listPosts, listTags, tagSlug } from "@/lib/blog/posts";
import { itemListLd, ldScript } from "@/lib/seo/json-ld";
import { ArrowRight, Rss } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "블로그 — Virtual Agency",
  description:
    "AI 버추얼 모델 시장 분석, 캠페인 가이드, 라이선스 해설. Virtual Agency 의 인사이트.",
};

export default function BlogIndexPage() {
  const posts = listPosts();
  const tags = listTags();

  const ld = itemListLd(
    "Virtual Agency 블로그",
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
        dangerouslySetInnerHTML={{ __html: ldScript(ld) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12">
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
            Insights
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            블로그
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            AI 버추얼 모델 시장의 변화, 광고주 의사결정 가이드, 라이선스
            해설. Virtual Agency 가 직접 운영하며 얻은 인사이트만 정리합니다.
          </p>
          <a
            href="/blog/rss.xml"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mt-4"
          >
            <Rss className="w-3 h-3" /> RSS 구독
          </a>
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link
                  key={t.tag}
                  href={`/blog/tag/${tagSlug(t.tag)}`}
                  className="text-[11px] text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 rounded-full px-2.5 py-1"
                >
                  #{t.tag}
                  <span className="ml-1 text-zinc-600">{t.count}</span>
                </Link>
              ))}
            </div>
          )}
        </header>

        <ul className="space-y-8 border-t border-zinc-900">
          {posts.map((post) => (
            <li key={post.slug} className="pt-8">
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <p className="text-xs text-zinc-500 tabular-nums">
                    {post.publishedAt} · {post.readingMinutes}분 읽기
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
                  계속 읽기 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
