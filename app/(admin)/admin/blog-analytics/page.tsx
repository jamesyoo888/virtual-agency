import Link from "next/link";
import { BookOpen, TrendingUp } from "lucide-react";
import { loadBlogViews } from "@/lib/analytics/blog-views";
import { getPostBySlug } from "@/lib/blog/posts";
import { listSeries } from "@/lib/blog/series";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog analytics — Virtual Agency" };

const WINDOWS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

/**
 * Dedicated /admin/blog-analytics page.
 *
 * Same data source as the inline card on /admin/analytics, but with a
 * time-window filter, daily sparkline, full per-post table, and a
 * per-post drill-down link (referrer breakdown lives on the [slug] page).
 *
 * Surfaces which content is converting — pairs with character-attribution
 * for total funnel visibility.
 */
export default async function BlogAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const sp = await searchParams;
  const windowDays = WINDOWS[sp.window ?? ""] ?? 30;
  const blogViews = await loadBlogViews(windowDays);

  const maxBlogViews = Math.max(1, ...blogViews.bySlug.map((b) => b.total));
  const maxSeriesViews = Math.max(1, ...blogViews.bySeries.map((s) => s.total));
  const dailyPeak = Math.max(1, ...blogViews.daily.map((d) => d.count));
  const postsViewed = blogViews.bySlug.length;
  const koSeriesIds = new Set(listSeries("ko").map((s) => s.id));
  const enSeriesIds = new Set(listSeries("en").map((s) => s.id));

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Blog analytics</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            usage_log route=blog.view · 1시간 dedup · bot 제외. 어떤 글이 트래픽을 견인하는지 + 어디에서 유입되는지.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {(["7", "30", "90"] as const).map((w) => {
            const active = windowDays === Number(w);
            const href =
              w === "30"
                ? "/admin/blog-analytics"
                : `/admin/blog-analytics?window=${w}`;
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
          <Link
            href={`/api/admin/exports/blog-engagement?window=${windowDays}`}
            className="ml-2 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
          >
            CSV
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <Card label={`${windowDays}일 총 조회`} value={blogViews.total.toLocaleString()} />
        <Card label="KR" value={blogViews.totalKo.toLocaleString()} />
        <Card label="EN" value={blogViews.totalEn.toLocaleString()} />
        <Card label="조회된 글 수" value={postsViewed.toLocaleString()} />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {windowDays}일 일별 조회 추세
          </h2>
          <span className="ml-auto text-[11px] text-zinc-600 tabular-nums">
            피크 {dailyPeak.toLocaleString()} 회 · 가장 왼쪽 = {windowDays}일 전, 오른쪽 = 오늘
          </span>
        </div>
        <div className="flex items-end gap-px h-24">
          {blogViews.daily.map((d) => {
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

      {blogViews.bySeries.some((s) => s.total > 0) && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
            시리즈별 ({windowDays}일)
          </h2>
          <ul className="space-y-2">
            {blogViews.bySeries.map((s) => {
              const widthPct = (s.total / maxSeriesViews) * 100;
              const locale: "ko" | "en" = koSeriesIds.has(s.seriesId)
                ? "ko"
                : enSeriesIds.has(s.seriesId)
                ? "en"
                : "ko";
              const publicHref =
                locale === "en"
                  ? `/en/blog/series/${s.seriesId}`
                  : `/blog/series/${s.seriesId}`;
              return (
                <li
                  key={s.seriesId}
                  className="grid grid-cols-12 gap-3 items-center text-sm"
                >
                  <Link
                    href={`/admin/blog-analytics/series/${s.seriesId}?window=${windowDays}`}
                    className="col-span-4 text-violet-200 truncate hover:text-white"
                    title={`${s.title} — admin drill-down`}
                  >
                    {s.title}
                  </Link>
                  <div className="col-span-6 h-2 rounded bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="col-span-2 text-right text-xs text-zinc-300 tabular-nums">
                    {s.total.toLocaleString()}{" "}
                    <Link
                      href={publicHref}
                      target="_blank"
                      className="text-zinc-600 hover:text-zinc-300"
                      title="공개 시리즈 페이지"
                    >
                      ↗
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          모든 글 · 조회 순 ({windowDays}일)
        </h2>
        {blogViews.bySlug.length === 0 ? (
          <p className="text-sm text-zinc-600">
            아직 조회 데이터가 없습니다. 캠페인 트래픽 시작 후 확인.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {blogViews.bySlug.map((b) => {
              const widthPct = (b.total / maxBlogViews) * 100;
              const post =
                getPostBySlug(b.slug, "ko") ?? getPostBySlug(b.slug, "en");
              const title = post?.title ?? b.slug;
              return (
                <li
                  key={b.slug}
                  className="grid grid-cols-12 gap-3 items-center text-sm"
                >
                  <Link
                    href={`/admin/blog-analytics/${encodeURIComponent(b.slug)}?window=${windowDays}`}
                    className="col-span-7 truncate text-zinc-200 hover:text-white"
                    title={title}
                  >
                    {title}
                  </Link>
                  <div className="col-span-3 h-2 rounded bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span
                    className="col-span-2 text-right text-xs text-zinc-300 tabular-nums"
                    title={`KR ${b.ko} / EN ${b.en}`}
                  >
                    {b.total.toLocaleString()}{" "}
                    <span className="text-zinc-600">
                      ({b.ko}/{b.en})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-[11px] text-zinc-600">
          글 제목 클릭 → 일별 추세 + 유입 referrer 분석 페이지로 이동.
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
