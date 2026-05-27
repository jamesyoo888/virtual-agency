import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, TrendingUp } from "lucide-react";
import { loadBlogSeriesDetail } from "@/lib/analytics/blog-views";
import { BLOG_SERIES, type BlogSeriesId } from "@/lib/blog/series";
import { getPostBySlug } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";

const WINDOWS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = BLOG_SERIES.find((s) => s.id === id);
  return {
    title: `${series?.title ?? id} — Blog series analytics`,
  };
}

/**
 * Per-series blog analytics drill-down.
 *
 * Renders a single curated series' performance: total views across all
 * posts in the series, per-post breakdown (which posts pull weight),
 * daily sparkline scoped to series posts, and KR/EN split. Complements the
 * per-post drill-down — series view answers "is this thread converting?",
 * the per-post view answers "which exact post pulls weight?".
 *
 * A series can exist as a KR variant + EN variant under the same id but
 * different `locale` fields. The page surfaces both variants if present and
 * lets the reader switch.
 */
export default async function BlogSeriesAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ window?: string; locale?: string }>;
}) {
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams]);
  const id = decodeURIComponent(rawId) as BlogSeriesId;
  const windowDays = WINDOWS[sp.window ?? ""] ?? 30;

  const variants = BLOG_SERIES.filter((s) => s.id === id);
  if (variants.length === 0) notFound();
  const requestedLocale = sp.locale === "en" ? "en" : sp.locale === "ko" ? "ko" : null;
  // Choose KR by default if present; else EN. Honors ?locale=… override.
  const series =
    variants.find((s) => s.locale === requestedLocale) ??
    variants.find((s) => s.locale === "ko") ??
    variants[0];
  const otherVariant = variants.find((s) => s.locale !== series.locale);

  const detail = await loadBlogSeriesDetail(series.slugs, windowDays);
  const dailyPeak = Math.max(1, ...detail.daily.map((d) => d.count));
  const maxSlugViews = Math.max(1, ...detail.bySlug.map((b) => b.total));
  // Posts that never appeared in usage_log within the window still belong on
  // the table so the operator can see "this post is dead, not just missing
  // from the rollup."
  const slugsWithStats = new Set(detail.bySlug.map((b) => b.slug));
  const orderedPosts = series.slugs.map((slug) => {
    const stat = detail.bySlug.find((b) => b.slug === slug);
    return {
      slug,
      total: stat?.total ?? 0,
      ko: stat?.ko ?? 0,
      en: stat?.en ?? 0,
      hasData: slugsWithStats.has(slug),
    };
  });
  const seriesPublicHref =
    series.locale === "en"
      ? `/en/blog/series/${series.id}`
      : `/blog/series/${series.id}`;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex items-start gap-3">
        <Link
          href={`/admin/blog-analytics?window=${windowDays}`}
          className="mt-1 text-zinc-500 hover:text-white"
          title="블로그 분석으로 돌아가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <BookOpen className="w-5 h-5 text-violet-300 mt-1" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight break-words">
            {series.title}
          </h1>
          <p className="text-sm text-zinc-500 mt-1 leading-snug">
            {series.description}
          </p>
          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-zinc-500">
            <span className="font-mono">{series.id}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800">
              {series.locale.toUpperCase()} · {series.slugs.length} posts
            </span>
            <Link
              href={seriesPublicHref}
              target="_blank"
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
            >
              {seriesPublicHref}
              <ExternalLink className="w-3 h-3" />
            </Link>
            {otherVariant && (
              <Link
                href={`/admin/blog-analytics/series/${series.id}?window=${windowDays}&locale=${otherVariant.locale}`}
                className="px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              >
                {otherVariant.locale.toUpperCase()} 변형 보기
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {(["7", "30", "90"] as const).map((w) => {
            const active = windowDays === Number(w);
            const localeParam =
              requestedLocale === series.locale ? `&locale=${series.locale}` : "";
            const href =
              w === "30" && !localeParam
                ? `/admin/blog-analytics/series/${series.id}`
                : `/admin/blog-analytics/series/${series.id}?window=${w}${localeParam}`;
            return (
              <Link
                key={w}
                href={href}
                className={`px-2 py-0.5 rounded border ${
                  active
                    ? "bg-zinc-100 text-black border-zinc-100"
                    : "text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {w}d
              </Link>
            );
          })}
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <Card label={`${windowDays}일 조회`} value={detail.total.toLocaleString()} />
        <Card label="KR" value={detail.totalKo.toLocaleString()} />
        <Card label="EN" value={detail.totalEn.toLocaleString()} />
        <Card
          label="조회된 글"
          value={`${detail.bySlug.length}/${series.slugs.length}`}
        />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            시리즈 일별 추세 ({windowDays}일)
          </h2>
          <span className="ml-auto text-[11px] text-zinc-600 tabular-nums">
            피크 {dailyPeak.toLocaleString()} 회
          </span>
        </div>
        <div className="flex items-end gap-px h-24">
          {detail.daily.map((d) => {
            const heightPct = (d.count / dailyPeak) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col justify-end group relative"
                title={`${d.date} — ${d.count}건`}
              >
                <div
                  className={`w-full rounded-sm transition-colors ${
                    d.count > 0
                      ? "bg-violet-500/70 group-hover:bg-violet-400"
                      : "bg-zinc-900"
                  }`}
                  style={{ height: `${Math.max(2, heightPct)}%` }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-1">
          시리즈 글별 ({windowDays}일)
        </h2>
        <p className="text-[11px] text-zinc-600 mb-4">
          순서는 시리즈에 정의된 Part 순서 — intro → advanced. 흐름이 끊긴
          파트가 약점이고, 보통 첫 번째 글이 funnel top이라 가장 큰 트래픽.
        </p>
        <ul className="space-y-1.5">
          {orderedPosts.map((p, i) => {
            const widthPct = (p.total / maxSlugViews) * 100;
            const post =
              getPostBySlug(p.slug, series.locale) ??
              getPostBySlug(p.slug, "ko") ??
              getPostBySlug(p.slug, "en");
            const title = post?.title ?? p.slug;
            return (
              <li
                key={p.slug}
                className="grid grid-cols-12 gap-3 items-center text-sm"
              >
                <Link
                  href={`/admin/blog-analytics/${encodeURIComponent(p.slug)}?window=${windowDays}`}
                  className="col-span-7 truncate text-zinc-200 hover:text-white"
                  title={title}
                >
                  <span className="mr-1.5 text-[10px] text-zinc-500 tabular-nums">
                    {i + 1}/{series.slugs.length}
                  </span>
                  {title}
                </Link>
                <div className="col-span-3 h-2 rounded bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-full ${
                      p.hasData ? "bg-violet-500" : "bg-zinc-700"
                    }`}
                    style={{ width: `${Math.max(2, widthPct)}%` }}
                  />
                </div>
                <span
                  className="col-span-2 text-right text-xs text-zinc-300 tabular-nums"
                  title={`KR ${p.ko} / EN ${p.en}`}
                >
                  {p.total.toLocaleString()}{" "}
                  <span className="text-zinc-600">
                    ({p.ko}/{p.en})
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[11px] text-zinc-600">
          글 제목 클릭 → 일별 추세 + 유입 referrer 분석.{" "}
          {series.relatedCharacterSlug && (
            <>
              관련 캐릭터:{" "}
              <Link
                href={
                  series.locale === "en"
                    ? `/en/character/${series.relatedCharacterSlug}`
                    : `/character/${series.relatedCharacterSlug}`
                }
                className="text-zinc-400 hover:text-white"
              >
                {series.relatedCharacterSlug}
              </Link>
              {" · "}
            </>
          )}
          {series.relatedService && (
            <>관련 서비스: {series.relatedService}</>
          )}
        </p>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
