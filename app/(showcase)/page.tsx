import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { Model } from "@/types";
import ModelCard from "@/components/model-card";
import CatalogFilters from "@/components/catalog-filters";
import CatalogSearch from "@/components/catalog-search";
import CompareDrawer from "@/components/compare-drawer";
import CatalogPagination from "@/components/catalog-pagination";
import CatalogViewToggle, { type CatalogView } from "@/components/catalog-view-toggle";
import RecentlyViewedStrip from "@/components/recently-viewed-strip";
import { devModelStore } from "@/lib/dev-store";
import {
  CATALOG_PAGE_SIZE,
  filterModelsForCatalog,
  normalizePage,
  normalizeSort,
  paginate,
  type CatalogQueryParams,
} from "@/lib/catalog/filter";
import { getBucket } from "@/lib/experiments";
import { trackImpression } from "@/lib/experiments-track";
import { loadSocialProof } from "@/lib/social-proof";
import { loadTopTestimonials } from "@/lib/testimonials";
import HomeTestimonials from "@/components/home-testimonials";
import { logCatalogSearch } from "@/lib/analytics/search-log";

function Value({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-900 p-5">
      <p className="text-[10px] tracking-[0.3em] text-zinc-600 mb-3">{n}</p>
      <p className="font-semibold text-zinc-100 mb-1.5">{title}</p>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}


interface PageProps {
  searchParams: Promise<CatalogQueryParams>;
}

export const metadata = {
  title: "Virtual Agency — Model Catalog",
  description: "AI 기반 버추얼 모델 에이전시",
};

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const requestedPage = normalizePage(params.page);
  const view: CatalogView = params.view === "list" ? "list" : "grid";
  const [heroCtaVariant, heroSubtitleVariant, socialProof, testimonials] = await Promise.all([
    getBucket("hero_cta"),
    getBucket("hero_subtitle"),
    loadSocialProof(),
    loadTopTestimonials(3),
  ]);
  void trackImpression("hero_cta", { surface: "catalog_hero" });
  void trackImpression("hero_subtitle", { surface: "catalog_hero" });

  const heroSubtitle: string =
    heroSubtitleVariant === "speed"
      ? "컨셉 컨펌부터 1차 컷까지 24~72시간. 광고 캠페인 일정에 모델 일정이 끌려다니지 않습니다."
      : heroSubtitleVariant === "cost"
      ? "전통 모델 캠페인의 1/10 가격으로 같은 컨셉 5컷 — 같은 예산으로 A/B 테스트 횟수를 10배 늘리세요."
      : "일관된 외모, 다양한 산업·분위기, 즉시 견적. 광고·SNS·영상 콘텐츠에 필요한 모델을 카탈로그에서 찾거나 컨셉으로 매칭하세요.";

  let userRole: "admin" | "client" | null = null;
  let userId: string | null = null;
  let bookmarkedIds = new Set<string>();
  let trendingIds = new Set<string>();
  let models: Model[] = [];
  let totalCount = 0;
  let totalPages = 1;
  let page = requestedPage;

  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();

    // Top-6 30-day view leaders — surfaced as a 🔥 badge on the matching
    // cards. Pulled once per request from the existing popularity view so the
    // catalog page makes one extra small query.
    try {
      const { data: trending } = await supabase
        .from("models_with_popularity")
        .select("id, view_count_30d")
        .eq("status", "active")
        .order("view_count_30d", { ascending: false })
        .gt("view_count_30d", 0)
        .limit(6);
      trendingIds = new Set(
        ((trending ?? []) as { id: string }[]).map((m) => m.id)
      );
    } catch {
      // models_with_popularity view may be missing in a partially-migrated
      // env — fall through with an empty set so badges just don't render.
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const [{ data: clientRow }, { data: bookmarks }] = await Promise.all([
        supabase.from("clients").select("role").eq("id", user.id).single(),
        supabase.from("model_bookmarks").select("model_id").eq("client_id", user.id),
      ]);
      userRole = (clientRow?.role as "admin" | "client") ?? "client";
      bookmarkedIds = new Set(
        ((bookmarks ?? []) as { model_id: string }[]).map((b) => b.model_id)
      );
    }

    const sort = normalizeSort(params.sort);
    const order: { column: string; ascending: boolean } = (() => {
      switch (sort) {
        case "recent":
          return { column: "created_at", ascending: false };
        case "price-asc":
          return { column: "base_price", ascending: true };
        case "price-desc":
          return { column: "base_price", ascending: false };
        case "name":
          return { column: "name", ascending: true };
        case "popular":
        default:
          // Falls back to follower_count if the popularity_score view
          // hasn't been migrated yet — see catch block below.
          return { column: "popularity_score", ascending: false };
      }
    })();

    const from = (requestedPage - 1) * CATALOG_PAGE_SIZE;
    const to = from + CATALOG_PAGE_SIZE - 1;

    // Popular sort goes through the `models_with_popularity` view which
    // joins in last-30d view counts. All other sorts work on the base
    // `models` table for cheaper queries.
    const source = sort === "popular" ? "models_with_popularity" : "models";

    let query = supabase
      .from(source)
      .select("*", { count: "exact" })
      .eq("status", "active")
      .order(order.column, { ascending: order.ascending })
      .range(from, to);

    if (params.q) {
      // Search name + bio. PostgREST `or` strings — escape ilike wildcards so
      // the raw query is a literal substring match against either column.
      const term = `%${params.q.replace(/[%_]/g, "\\$&")}%`;
      query = query.or(`name.ilike.${term},bio.ilike.${term}`);
    }
    if (params.industry) query = query.contains("industry_tags", [params.industry]);
    if (params.genre) query = query.contains("genre_tags", [params.genre]);
    if (params.mood) query = query.contains("mood_tags", [params.mood]);
    if (params.price_max) query = query.lte("base_price", parseInt(params.price_max));
    if (params.exclusive === "true") query = query.eq("is_exclusive_available", true);

    const initial = await query;
    let data = initial.data;
    let count = initial.count;
    // If the popularity view hasn't been applied yet (migration 006), fall
    // back to the base models table so the catalog still renders. Detected
    // by the PostgREST "PGRST205" / "relation does not exist" pattern.
    if (initial.error && sort === "popular") {
      console.warn("[catalog] popularity view unavailable, falling back to follower_count:", initial.error.message);
      const fallback = await supabase
        .from("models")
        .select("*", { count: "exact" })
        .eq("status", "active")
        .order("follower_count", { ascending: false })
        .range(from, to);
      data = fallback.data;
      count = fallback.count;
    }
    models = (data as Model[] | null) ?? [];
    totalCount = count ?? models.length;
    totalPages = Math.max(1, Math.ceil(totalCount / CATALOG_PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);

    // Search analytics: log only when there's a user query (avoids one row per
    // catalog page-view) and only on shard 1 of the result set so refreshing
    // the same query through pagination doesn't double-count it.
    if (params.q && requestedPage === 1) {
      void logCatalogSearch({
        q: params.q,
        results: totalCount,
        industry: params.industry ?? null,
        mood: params.mood ?? null,
        genre: params.genre ?? null,
      });
    }
  } else {
    // Dev fallback — no Supabase configured.
    const filtered = filterModelsForCatalog(devModelStore.list() as Model[], params);
    const paged = paginate(filtered, requestedPage);
    models = paged.items;
    totalCount = paged.totalCount;
    totalPages = paged.totalPages;
    page = paged.page;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-widest uppercase">
          Virtual Agency
        </h1>
        <nav className="flex gap-4 text-sm text-zinc-400">
          {userRole === "admin" ? (
            <Link
              href="/admin/models"
              className="hover:text-white transition-colors"
            >
              Admin
            </Link>
          ) : userRole === "client" ? (
            <Link
              href="/client/dashboard"
              className="hover:text-white transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="hover:text-white transition-colors"
            >
              로그인
            </Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <div className="px-5 md:px-8 py-12 md:py-20 border-b border-zinc-900">
        <div className="max-w-2xl">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-4">
            AI Virtual Model Agency
          </p>
          <h2 className="text-3xl md:text-6xl font-bold tracking-tight mb-4">
            실제보다 완벽한 모델, <br />
            <span className="text-zinc-400">24시간 가용.</span>
          </h2>
          <p
            className="text-zinc-400 text-lg leading-relaxed"
            data-exp-hero-subtitle={heroSubtitleVariant}
          >
            {heroSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-6" data-exp-hero-cta={heroCtaVariant}>
          {heroCtaVariant === "match" ? (
            <Link
              href="/match"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
            >
              광고 컨셉으로 매칭 →
            </Link>
          ) : (
            <Link
              href="#catalog"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
            >
              모델 둘러보기 →
            </Link>
          )}
          <Link
            href="/rfp"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            RFP 작성 →
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            가격
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
          >
            FAQ
          </Link>
        </div>

        {(socialProof.deliveredCount > 0 ||
          socialProof.activeModels > 0 ||
          socialProof.averageRating !== null) && (
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            {socialProof.deliveredCount > 0 && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-zinc-100">
                  {socialProof.deliveredCount.toLocaleString()}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">납품 캠페인</span>
              </div>
            )}
            {socialProof.activeModels > 0 && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-zinc-100">
                  {socialProof.activeModels.toLocaleString()}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">활성 모델</span>
              </div>
            )}
            {socialProof.averageRating !== null && socialProof.reviewCount > 0 && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-zinc-100">
                  ★ {socialProof.averageRating.toFixed(1)}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  평균 평점 ({socialProof.reviewCount}건)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Value props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-5xl">
          <Value
            n="01"
            title="브랜드 일관성"
            desc="동일 모델로 시즌·캠페인을 횡단해도 외모·톤이 흔들리지 않습니다."
          />
          <Value
            n="02"
            title="유연한 라이선스"
            desc="일일·다일 단가, 독점/비독점, 산업 한정까지 — 정책을 카탈로그에서 즉시 확인."
          />
          <Value
            n="03"
            title="빠른 제작 사이클"
            desc="이미지 2~3일, 영상 3~5일. 클라이언트 대시보드에서 단계별 진행률을 추적."
          />
        </div>
      </div>

      <HomeTestimonials testimonials={testimonials} />

      <div className="flex flex-col md:flex-row">
        {/* Filters sidebar — collapses to top accordion on mobile */}
        <aside className="md:w-64 shrink-0 md:p-6 px-5 py-4 md:border-r border-b md:border-b-0 border-zinc-900 md:sticky md:top-0 md:h-screen md:overflow-auto">
          <details className="md:hidden">
            <summary className="cursor-pointer text-sm text-zinc-300 font-medium py-1">
              필터·정렬
            </summary>
            <div className="mt-3">
              <CatalogFilters current={params} />
            </div>
          </details>
          <div className="hidden md:block">
            <CatalogFilters current={params} />
          </div>
        </aside>

        {/* Grid */}
        <main id="catalog" className="flex-1 px-5 py-6 md:p-8">
          <RecentlyViewedStrip />
          <div className="mb-6">
            <CatalogSearch />
          </div>
          {models.length === 0 ? (
            <div className="py-16 max-w-xl mx-auto text-center">
              <p className="text-zinc-300 font-medium">
                해당 조건의 모델이 없습니다.
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                필터를 조금 풀거나, 아래 인기 카테고리에서 시작해 보세요.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link
                  href="/"
                  className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  필터 초기화
                </Link>
                <Link
                  href="/explore/beauty"
                  className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  뷰티
                </Link>
                <Link
                  href="/explore/tech"
                  className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  테크
                </Link>
                <Link
                  href="/explore/luxury"
                  className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  럭셔리
                </Link>
                <Link
                  href="/explore/mood/cold"
                  className="text-xs border border-zinc-800 hover:border-zinc-600 rounded-md px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  차가운 무드
                </Link>
                <Link
                  href="/match"
                  className="text-xs bg-white text-black rounded-md px-3 py-1.5 hover:bg-zinc-200"
                >
                  AI 매칭으로 찾기
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 gap-3">
                <p className="text-sm text-zinc-500">
                  {totalCount > models.length
                    ? `${totalCount}명 중 ${(page - 1) * CATALOG_PAGE_SIZE + 1}–${
                        (page - 1) * CATALOG_PAGE_SIZE + models.length
                      }명 표시`
                    : `${totalCount}명의 모델`}
                </p>
                <CatalogViewToggle current={view} />
              </div>
              {view === "list" ? (
                <div className="space-y-2.5">
                  {models.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      variant="showcase"
                      layout="list"
                      bookmarked={bookmarkedIds.has(model.id)}
                      bookmarkUnauthenticated={!userId}
                      trending={trendingIds.has(model.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {models.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      variant="showcase"
                      layout="card"
                      bookmarked={bookmarkedIds.has(model.id)}
                      bookmarkUnauthenticated={!userId}
                      trending={trendingIds.has(model.id)}
                    />
                  ))}
                </div>
              )}
              <CatalogPagination page={page} totalPages={totalPages} />
            </>
          )}
        </main>
      </div>

      <CompareDrawer
        models={models.map((m) => ({
          id: m.id,
          name: m.name,
          concept_image: m.concept_image,
        }))}
      />
    </div>
  );
}
