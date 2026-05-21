import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { GENRE_OPTIONS, GENRE_LABELS, INDUSTRY_LABELS } from "@/lib/tags";
import { GENRE_COPY } from "@/lib/explore/copy";
import type { GenreTag, Model } from "@/types";
import { ArrowRight } from "lucide-react";
import { relatedPostsForGenre } from "@/lib/blog/industry-map";

export const revalidate = 3600;

const VALID_GENRES = new Set<GenreTag>(GENRE_OPTIONS.map((o) => o.value));
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";

export async function generateStaticParams() {
  return GENRE_OPTIONS.map((o) => ({ genre: o.value }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre } = await params;
  if (!VALID_GENRES.has(genre as GenreTag)) {
    return { title: "탐색 — Virtual Agency" };
  }
  const tag = genre as GenreTag;
  const copy = GENRE_COPY[tag];
  const ogImage = `${SITE_URL}/api/og?explore_genre=${encodeURIComponent(tag)}`;
  return {
    title: `${copy.heroTitle} — Virtual Agency`,
    description: copy.seoDescription,
    alternates: { canonical: `${SITE_URL}/explore/genre/${tag}` },
    openGraph: {
      title: copy.heroTitle,
      description: copy.seoDescription,
      url: `${SITE_URL}/explore/genre/${tag}`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: copy.heroTitle,
      description: copy.seoDescription,
      images: [ogImage],
    },
  };
}

async function loadModels(tag: GenreTag): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter(
      (m) => m.status === "active" && m.genre_tags?.includes(tag)
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select(
      "id, name, concept_image, base_price, exclusive_price, is_exclusive_available, industry_tags, genre_tags, mood_tags, status, follower_count, bio, slug, debut_date, personality, instagram_handle, created_at, updated_at"
    )
    .eq("status", "active")
    .contains("genre_tags", [tag])
    .order("follower_count", { ascending: false })
    .limit(24);
  return (data as Model[]) ?? [];
}

const KRW = new Intl.NumberFormat("ko-KR");

export default async function ExploreGenrePage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre } = await params;
  if (!VALID_GENRES.has(genre as GenreTag)) notFound();

  const tag = genre as GenreTag;
  const copy = GENRE_COPY[tag];
  const models = await loadModels(tag);
  const related = relatedPostsForGenre(tag, 3);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 max-w-3xl">
          <Link
            href="/"
            className="inline-block text-xs text-zinc-500 hover:text-zinc-300 mb-4"
          >
            ← 전체 카탈로그
          </Link>
          <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-2">
            Genre · {GENRE_LABELS[tag]}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {copy.heroTitle}
          </h1>
          <p className="mt-4 text-zinc-400">{copy.heroLede}</p>
          <div className="mt-6 flex gap-2">
            <Link
              href="/match"
              className="inline-flex items-center gap-1 text-sm rounded-md bg-white text-black px-3 py-1.5 hover:bg-zinc-200"
            >
              AI 매칭 시작 <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              가격 보기
            </Link>
          </div>
        </header>

        {models.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
            이 장르의 활성 모델이 아직 없습니다.
          </div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {models.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/models/${m.id}`}
                  className="group block rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 transition-colors"
                >
                  <div className="aspect-[4/5] bg-zinc-900 relative">
                    {m.concept_image && (
                      <Image
                        src={m.concept_image}
                        alt={m.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate group-hover:underline">
                      {m.name}
                    </p>
                    {m.industry_tags && m.industry_tags.length > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                        {m.industry_tags
                          .map((t) => INDUSTRY_LABELS[t] ?? t)
                          .join(" · ")}
                      </p>
                    )}
                    {m.base_price && (
                      <p className="text-xs text-zinc-300 mt-1 tabular-nums">
                        ₩{KRW.format(m.base_price)}
                        <span className="text-zinc-500"> / 일</span>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-zinc-900">
            <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
              {GENRE_LABELS[tag]} 장르 캠페인 인사이트
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group block rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 hover:border-zinc-600"
                  >
                    <p className="text-[10px] tabular-nums text-zinc-600">
                      {p.publishedAt} · {p.readingMinutes}분 읽기
                    </p>
                    <p className="text-sm font-medium mt-1 text-zinc-100 group-hover:underline">
                      {p.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                      {p.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-16 pt-8 border-t border-zinc-900">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
            다른 장르도 둘러보기
          </h2>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.filter((o) => o.value !== tag).map((o) => (
              <Link
                key={o.value}
                href={`/explore/genre/${o.value}`}
                className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
