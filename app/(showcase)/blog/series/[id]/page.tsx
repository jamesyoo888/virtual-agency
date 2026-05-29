import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { listSeries } from "@/lib/blog/series";
import { getPostBySlug } from "@/lib/blog/posts";
import { getCharacter } from "@/lib/characters/registry";
import { breadcrumbLd, itemListLd, ldScript } from "@/lib/seo/json-ld";

const SERVICE_HREF: Record<string, string> = {
  "brand-kit": "/character/brand-kits",
  lookbook: "/character",
  matching: "/match",
  rfp: "/rfp",
  "compliance-audit": "/legal/ai-disclosure",
};

const SERVICE_LABEL_KO: Record<string, string> = {
  "brand-kit": "Brand kit 티어 보기",
  lookbook: "캐릭터 룩북 보기",
  matching: "/match 매칭 시작",
  rfp: "RFP 보내기",
  "compliance-audit": "AI 표기 가이드",
};

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

        {(series.relatedCharacterSlug || series.relatedService) && (
          <aside className="mt-14 pt-8 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-3">
            {series.relatedCharacterSlug &&
              (() => {
                const character = getCharacter(series.relatedCharacterSlug);
                if (!character) return null;
                return (
                  <Link
                    href={`/character/${character.slug}`}
                    className="rounded-xl border border-violet-900/50 bg-violet-900/5 p-5 hover:border-violet-700 transition-colors"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-violet-300 mb-2 inline-flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> 관련 캐릭터
                    </p>
                    <p className="text-base font-semibold mb-1">
                      {character.name}
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
                      이 시리즈를 적용할 수 있는 자체 캐릭터 IP. 페르소나·라이팅 레시피·라이선스 옵션 확인.
                    </p>
                    <p className="mt-3 text-xs text-violet-300 inline-flex items-center gap-1">
                      {character.name} 프로필 <ArrowRight className="w-3 h-3" />
                    </p>
                  </Link>
                );
              })()}
            {series.relatedService && SERVICE_HREF[series.relatedService] && (
              <Link
                href={SERVICE_HREF[series.relatedService]}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-700 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">
                  관련 서비스
                </p>
                <p className="text-base font-semibold mb-1">
                  {SERVICE_LABEL_KO[series.relatedService] ??
                    series.relatedService}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  시리즈 학습 후 다음 단계 — 캠페인 실제 의뢰 또는 자세히 보기.
                </p>
                <p className="mt-3 text-xs text-zinc-200 inline-flex items-center gap-1">
                  이동 <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
