import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, TrendingUp } from "lucide-react";
import { loadBlogPostDetail } from "@/lib/analytics/blog-views";
import { getPostBySlug } from "@/lib/blog/posts";
import { getSeriesForPost } from "@/lib/blog/series";

export const dynamic = "force-dynamic";

const WINDOWS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const post =
    getPostBySlug(decoded, "ko") ?? getPostBySlug(decoded, "en");
  return {
    title: `${post?.title ?? decoded} — Blog analytics`,
  };
}

/**
 * Per-post blog analytics drill-down.
 *
 * Shows KR/EN split, daily sparkline, and the referrer breakdown so an
 * admin can decide whether a post is being found via search, social, or
 * cross-link from another page on the site. Pairs with the index view at
 * /admin/blog-analytics.
 */
export default async function BlogAnalyticsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ window?: string }>;
}) {
  const [{ slug: rawSlug }, sp] = await Promise.all([params, searchParams]);
  const slug = decodeURIComponent(rawSlug);
  const windowDays = WINDOWS[sp.window ?? ""] ?? 30;

  const post =
    getPostBySlug(slug, "ko") ?? getPostBySlug(slug, "en");
  if (!post) {
    // Allow analytics view even when post was removed, but show slug only.
    // Skip notFound here — orphaned data is still useful to spot.
  }

  const detail = await loadBlogPostDetail(slug, windowDays);
  if (detail.total === 0 && !post) {
    notFound();
  }

  const dailyPeak = Math.max(1, ...detail.daily.map((d) => d.count));
  const maxReferrer = Math.max(1, ...detail.topReferrers.map((r) => r.count));
  const title = post?.title ?? slug;
  const locale = post?.locale === "en" ? "en" : "ko";
  const publicHref =
    locale === "en" ? `/en/blog/${slug}` : `/blog/${slug}`;
  const seriesKo = getSeriesForPost(slug, "ko");
  const seriesEn = getSeriesForPost(slug, "en");
  const series = seriesKo ?? seriesEn;

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
        <BookOpen className="w-5 h-5 text-zinc-400 mt-1" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight break-words">
            {title}
          </h1>
          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-zinc-500">
            <span className="font-mono">{slug}</span>
            <Link
              href={publicHref}
              target="_blank"
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-white"
            >
              {publicHref}
              <ExternalLink className="w-3 h-3" />
            </Link>
            {series && (
              <Link
                href={
                  series.series.locale === "en"
                    ? `/en/blog/series/${series.series.id}`
                    : `/blog/series/${series.series.id}`
                }
                className="px-2 py-0.5 rounded border border-violet-900 text-violet-300 hover:border-violet-700"
              >
                {series.series.title} · {series.part}/{series.total}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {(["7", "30", "90"] as const).map((w) => {
            const active = windowDays === Number(w);
            const href =
              w === "30"
                ? `/admin/blog-analytics/${encodeURIComponent(slug)}`
                : `/admin/blog-analytics/${encodeURIComponent(slug)}?window=${w}`;
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

      <section className="grid grid-cols-3 gap-4">
        <Card label={`${windowDays}일 조회`} value={detail.total.toLocaleString()} />
        <Card label="KR" value={detail.ko.toLocaleString()} />
        <Card label="EN" value={detail.en.toLocaleString()} />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            일별 추세 ({windowDays}일)
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
                      ? "bg-emerald-500/70 group-hover:bg-emerald-400"
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          Top 유입 referrer ({windowDays}일)
        </h2>
        {detail.topReferrers.length === 0 ? (
          <p className="text-sm text-zinc-600">아직 유입 데이터가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {detail.topReferrers.map((r) => {
              const widthPct = (r.count / maxReferrer) * 100;
              const pct =
                detail.total > 0
                  ? Math.round((r.count / detail.total) * 100)
                  : 0;
              return (
                <li
                  key={r.source}
                  className="grid grid-cols-12 gap-3 items-center text-sm"
                >
                  <span
                    className="col-span-3 text-zinc-200 truncate"
                    title={r.source}
                  >
                    {r.source}
                  </span>
                  <div className="col-span-7 h-2 rounded bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="col-span-2 text-right text-xs text-zinc-300 tabular-nums">
                    {r.count} ·{" "}
                    <span className="text-zinc-500">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-zinc-600">
          referrer 헤더에서 host 만 추출 — (direct) = 헤더 없음, (internal) = aihubs.uk
          내부 링크 클릭, 검색엔진은 canonical 이름으로 묶음.
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
