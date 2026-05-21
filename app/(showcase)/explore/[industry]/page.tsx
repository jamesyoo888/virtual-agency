import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import { INDUSTRY_OPTIONS, INDUSTRY_LABELS, MOOD_LABELS } from "@/lib/tags";
import type { IndustryTag, Model } from "@/types";
import { ArrowRight } from "lucide-react";
import { relatedPostsForIndustry } from "@/lib/blog/industry-map";

export const revalidate = 3600;

const VALID_INDUSTRIES = new Set<IndustryTag>(
  INDUSTRY_OPTIONS.map((o) => o.value)
);

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://virtual-agency-murex.vercel.app";

// SEO copy is hand-tuned per industry — generic boilerplate hurts ranking
// vs. specific, intent-matching language ("뷰티 광고 모델" beats "AI 모델").
const INDUSTRY_COPY: Record<
  IndustryTag,
  { heroTitle: string; heroLede: string; seoDescription: string }
> = {
  beauty: {
    heroTitle: "뷰티 캠페인을 위한 AI 버추얼 모델",
    heroLede:
      "스킨케어·메이크업·향수 광고에 최적화된 모델. 같은 얼굴로 무한 컨셉 촬영, 시즌별 룩 일관성 유지.",
    seoDescription:
      "뷰티 광고용 AI 버추얼 모델 카탈로그. 스킨케어, 메이크업, 향수 캠페인에 적합한 모델을 일 단위로 라이선싱합니다.",
  },
  tech: {
    heroTitle: "테크 브랜드를 위한 AI 버추얼 모델",
    heroLede:
      "디바이스 언박싱, 키노트, 제품 데모. 미래지향적 분위기와 미니멀한 표현에 강한 모델들.",
    seoDescription:
      "테크 광고용 AI 버추얼 모델. 가전, 모바일, SaaS 제품 캠페인을 위한 모델 라이선싱.",
  },
  food: {
    heroTitle: "푸드 & F&B 광고용 AI 버추얼 모델",
    heroLede:
      "음식과 모델의 일관된 톤. 시리즈 광고에서 같은 모델로 메뉴 전체를 시연할 수 있습니다.",
    seoDescription:
      "푸드, 음료, 외식 브랜드 광고에 어울리는 AI 버추얼 모델. 캐주얼한 분위기부터 미식까지.",
  },
  luxury: {
    heroTitle: "럭셔리 브랜드를 위한 AI 버추얼 모델",
    heroLede:
      "패션 하우스, 주얼리, 시계, 모터스포츠. 정제된 무드와 일관된 캐스팅이 필요한 캠페인에.",
    seoDescription:
      "럭셔리 패션, 시계, 주얼리 캠페인용 AI 버추얼 모델. 독점 라이선스로 카테고리 보호 가능.",
  },
  sports: {
    heroTitle: "스포츠 & 액티브웨어를 위한 AI 버추얼 모델",
    heroLede:
      "런닝, 트레이닝, 아웃도어. 다이내믹한 포즈와 다양한 환경을 같은 모델로 촬영합니다.",
    seoDescription:
      "스포츠웨어, 아웃도어, 피트니스 광고용 AI 버추얼 모델 라이선싱.",
  },
  lifestyle: {
    heroTitle: "라이프스타일 콘텐츠를 위한 AI 버추얼 모델",
    heroLede:
      "SNS 피드, 콘텐츠 마케팅, 룩북. 매주 새 컷이 필요한 인스타그램 운영에 적합합니다.",
    seoDescription:
      "라이프스타일 브랜드, 인스타그램 콘텐츠 마케팅용 AI 버추얼 모델 카탈로그.",
  },
};

export async function generateStaticParams() {
  return INDUSTRY_OPTIONS.map((o) => ({ industry: o.value }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  if (!VALID_INDUSTRIES.has(industry as IndustryTag)) {
    return { title: "탐색 — Virtual Agency" };
  }
  const tag = industry as IndustryTag;
  const copy = INDUSTRY_COPY[tag];
  const ogImage = `${SITE_URL}/api/og?explore_industry=${encodeURIComponent(tag)}`;
  return {
    title: `${copy.heroTitle} — Virtual Agency`,
    description: copy.seoDescription,
    alternates: { canonical: `${SITE_URL}/explore/${tag}` },
    openGraph: {
      title: copy.heroTitle,
      description: copy.seoDescription,
      url: `${SITE_URL}/explore/${tag}`,
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

async function loadModels(tag: IndustryTag): Promise<Model[]> {
  if (!SUPABASE_CONFIGURED) {
    return (devModelStore.list() as Model[]).filter(
      (m) => m.status === "active" && m.industry_tags?.includes(tag)
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("models")
    .select(
      "id, name, concept_image, base_price, exclusive_price, is_exclusive_available, industry_tags, genre_tags, mood_tags, status, follower_count, bio, slug, debut_date, personality, instagram_handle, created_at, updated_at"
    )
    .eq("status", "active")
    .contains("industry_tags", [tag])
    .order("follower_count", { ascending: false })
    .limit(24);
  return (data as Model[]) ?? [];
}

interface TrendingRow {
  id: string;
  name: string;
  concept_image: string | null;
  view_count_30d: number;
}

async function loadTrendingInIndustry(
  tag: IndustryTag
): Promise<TrendingRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("models_with_popularity")
    .select("id, name, concept_image, view_count_30d")
    .eq("status", "active")
    .contains("industry_tags", [tag])
    .order("view_count_30d", { ascending: false })
    .gt("view_count_30d", 0)
    .limit(6);
  return (data as TrendingRow[]) ?? [];
}

const KRW = new Intl.NumberFormat("ko-KR");

export default async function ExploreIndustryPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  if (!VALID_INDUSTRIES.has(industry as IndustryTag)) notFound();

  const tag = industry as IndustryTag;
  const copy = INDUSTRY_COPY[tag];
  const [models, trending] = await Promise.all([
    loadModels(tag),
    loadTrendingInIndustry(tag),
  ]);
  const related = relatedPostsForIndustry(tag, 3);

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
            {INDUSTRY_LABELS[tag]} · Explore
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

        {trending.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">
                Trending
              </span>
              <span className="text-xs text-zinc-500">
                · 최근 30일 {INDUSTRY_LABELS[tag]} 카테고리 모멘텀 상위
              </span>
              <Link
                href={`/trending?industry=${tag}`}
                className="ml-auto text-xs text-zinc-500 hover:text-white"
              >
                전체 →
              </Link>
            </div>
            <ul className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {trending.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/models/${t.id}`}
                    className="block rounded-md overflow-hidden border border-zinc-800 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="aspect-square bg-zinc-900 relative">
                      {t.concept_image && (
                        <Image
                          src={t.concept_image}
                          alt={t.name}
                          fill
                          className="object-cover"
                          sizes="(min-width: 768px) 16vw, 33vw"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="px-1.5 py-1.5 text-center">
                      <p className="text-[11px] font-medium truncate">{t.name}</p>
                      <p className="text-[9px] text-emerald-400 tabular-nums">
                        {t.view_count_30d.toLocaleString()} views
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {models.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
            아직 이 산업의 활성 모델이 없습니다.
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
                    {m.mood_tags && m.mood_tags.length > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                        {m.mood_tags
                          .map((t) => MOOD_LABELS[t] ?? t)
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
              {INDUSTRY_LABELS[tag]} 캠페인 인사이트
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
            다른 산업도 둘러보기
          </h2>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS.filter((o) => o.value !== tag).map((o) => (
              <Link
                key={o.value}
                href={`/explore/${o.value}`}
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
