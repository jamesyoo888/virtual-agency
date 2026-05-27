import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { BarChart3, TrendingUp } from "lucide-react";
import { INDUSTRY_LABELS } from "@/lib/tags";
import { aggregateDaily, type DailyBucket } from "@/lib/analytics/daily";
import { loadCharacterViews } from "@/lib/analytics/character-views";
import { loadBlogViews } from "@/lib/analytics/blog-views";
import { getPostBySlug } from "@/lib/blog/posts";
import { loadCharacterAttribution } from "@/lib/analytics/character-attribution";
import { loadBlogAttribution } from "@/lib/analytics/blog-attribution";
import { getKitTier, type BrandKitTier } from "@/lib/characters/brand-kits";

function humanTierLabel(tier: string): string {
  const kit = getKitTier(tier as BrandKitTier["slug"]);
  if (kit) return kit.nameEn;
  if (tier === "index") return "Brand kits (index)";
  return tier;
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Virtual Agency" };

const WINDOWS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

interface ProjectAgg {
  model_id: string | null;
  status: string;
  utm_source?: string | null;
  model?: {
    name: string | null;
    concept_image: string | null;
    industry_tags: string[] | null;
  } | null;
}

interface TopModel {
  id: string;
  name: string;
  concept_image: string | null;
  inquiries: number;
  delivered: number;
}

interface IndustryStat {
  industry: string;
  inquiries: number;
}

interface SourceStat {
  source: string;
  inquiries: number;
  delivered: number;
}

async function loadAnalytics(windowDays: number): Promise<{
  totalInquiries: number;
  totalDelivered: number;
  conversionPct: number;
  topModels: TopModel[];
  byIndustry: IndustryStat[];
  bySource: SourceStat[];
  daily: DailyBucket[];
  windowDays: number;
}> {
  if (!SUPABASE_CONFIGURED) {
    return {
      totalInquiries: 0,
      totalDelivered: 0,
      conversionPct: 0,
      topModels: [],
      byIndustry: [],
      bySource: [],
      daily: aggregateDaily([], windowDays),
      windowDays,
    };
  }
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const dailyAgo = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const [{ data }, daily] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "model_id, status, utm_source, model:models(name, concept_image, industry_tags)"
      )
      .gte("created_at", since),
    supabase
      .from("projects")
      .select("created_at")
      .gte("created_at", dailyAgo),
  ]);

  const projects = (data as unknown as ProjectAgg[]) ?? [];
  const dailyRows = ((daily.data ?? []) as { created_at: string }[]);
  const dailySeries = aggregateDaily(dailyRows, windowDays);
  const totalInquiries = projects.length;
  const totalDelivered = projects.filter((p) => p.status === "delivered").length;
  const conversionPct =
    totalInquiries > 0 ? Math.round((totalDelivered / totalInquiries) * 100) : 0;

  const byModelMap = new Map<string, TopModel>();
  for (const p of projects) {
    if (!p.model_id || !p.model) continue;
    const entry = byModelMap.get(p.model_id) ?? {
      id: p.model_id,
      name: p.model.name ?? "—",
      concept_image: p.model.concept_image,
      inquiries: 0,
      delivered: 0,
    };
    entry.inquiries += 1;
    if (p.status === "delivered") entry.delivered += 1;
    byModelMap.set(p.model_id, entry);
  }
  const topModels = [...byModelMap.values()]
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  const industryMap = new Map<string, number>();
  for (const p of projects) {
    for (const ind of p.model?.industry_tags ?? []) {
      industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
    }
  }
  const byIndustry = [...industryMap.entries()]
    .map(([industry, inquiries]) => ({ industry, inquiries }))
    .sort((a, b) => b.inquiries - a.inquiries);

  // Source breakdown — buckets unknown/missing as "(direct)" so the row
  // is never lost. Same shape as funnel-by-source on the admin home but
  // includes delivered counts here for conversion comparison.
  const sourceMap = new Map<string, { inquiries: number; delivered: number }>();
  for (const p of projects) {
    const src = p.utm_source ?? "(direct)";
    const bucket = sourceMap.get(src) ?? { inquiries: 0, delivered: 0 };
    bucket.inquiries += 1;
    if (p.status === "delivered") bucket.delivered += 1;
    sourceMap.set(src, bucket);
  }
  const bySource: SourceStat[] = [...sourceMap.entries()]
    .map(([source, b]) => ({ source, ...b }))
    .sort((a, b) => b.inquiries - a.inquiries)
    .slice(0, 8);

  return {
    totalInquiries,
    totalDelivered,
    conversionPct,
    topModels,
    byIndustry,
    bySource,
    daily: dailySeries,
    windowDays,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const sp = await searchParams;
  const windowDays = WINDOWS[sp.window ?? ""] ?? 30;
  const [a, characterViews, characterAttribution, blogViews, blogAttribution] = await Promise.all([
    loadAnalytics(windowDays),
    loadCharacterViews(windowDays),
    loadCharacterAttribution(windowDays),
    loadBlogViews(windowDays),
    loadBlogAttribution(windowDays),
  ]);
  const maxBlogViews = Math.max(1, ...blogViews.bySlug.slice(0, 10).map((b) => b.total));
  const maxSeriesViews = Math.max(1, ...blogViews.bySeries.map((s) => s.total));
  const maxModelInquiries = Math.max(1, ...a.topModels.map((m) => m.inquiries));
  const maxIndustry = Math.max(1, ...a.byIndustry.map((i) => i.inquiries));
  const maxCharacterViews = Math.max(
    1,
    ...characterViews.bySlug.map((c) => c.total)
  );
  const maxCharacterInquiries = Math.max(
    1,
    ...characterAttribution.bySlug.map((c) => c.inquiries)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            최근 90일 프로젝트 흐름. 어떤 모델이 견인하고 어떤 산업이 활발한지.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Card label="총 문의" value={a.totalInquiries.toLocaleString()} />
        <Card label="납품 완료" value={a.totalDelivered.toLocaleString()} />
        <Card label="전환율" value={`${a.conversionPct}%`} />
      </section>

      {characterViews.total > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              캐릭터 페이지 조회 ({windowDays}일)
            </h2>
            <p className="text-xs text-zinc-500 tabular-nums">
              총 {characterViews.total.toLocaleString()} · KR{" "}
              {characterViews.totalKo.toLocaleString()} · EN{" "}
              {characterViews.totalEn.toLocaleString()}
            </p>
          </div>
          {(() => {
            const peak = Math.max(1, ...characterViews.daily.map((d) => d.count));
            return (
              <div className="flex items-end gap-px h-16 mb-5">
                {characterViews.daily.map((d) => {
                  const heightPct = (d.count / peak) * 100;
                  return (
                    <div
                      key={d.date}
                      title={`${d.date} — ${d.count}건`}
                      className="flex-1 flex flex-col justify-end"
                    >
                      <div
                        className={`w-full rounded-sm ${
                          d.count > 0 ? "bg-violet-500/70" : "bg-zinc-900"
                        }`}
                        style={{ height: `${Math.max(2, heightPct)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {characterViews.bySlug.length === 0 ? (
            <p className="text-xs text-zinc-500">
              아직 캐릭터 페이지 조회 데이터가 없습니다 (bot 제외 / 1시간 dedup).
            </p>
          ) : (
            <ul className="space-y-2">
              {characterViews.bySlug.map((c) => {
                const widthPct = (c.total / maxCharacterViews) * 100;
                return (
                  <li
                    key={c.slug}
                    className="grid grid-cols-12 gap-3 items-center text-sm"
                  >
                    <span className="col-span-2 text-zinc-300 capitalize">
                      {c.slug}
                    </span>
                    <div className="col-span-7 h-2 rounded bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-violet-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="col-span-3 text-right text-xs text-zinc-400 tabular-nums">
                      {c.total} · KR {c.ko} · EN {c.en}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {characterAttribution.totalInquiries > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          {(() => {
            const peak = Math.max(
              1,
              ...characterAttribution.daily.map((d) => d.count)
            );
            return (
              <div className="flex items-end gap-px h-12 mb-5">
                {characterAttribution.daily.map((d) => {
                  const heightPct = (d.count / peak) * 100;
                  return (
                    <div
                      key={d.date}
                      title={`${d.date} — ${d.count}건`}
                      className="flex-1 flex flex-col justify-end"
                    >
                      <div
                        className={`w-full rounded-sm ${
                          d.count > 0 ? "bg-fuchsia-500/70" : "bg-zinc-900"
                        }`}
                        style={{ height: `${Math.max(2, heightPct)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              캐릭터 페이지 → 문의 ({windowDays}일)
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <p className="text-zinc-500 tabular-nums">
                utm_source=character · 총 {characterAttribution.totalInquiries}건 ·
                납품 {characterAttribution.totalDelivered}건 ·{" "}
                <span className="text-emerald-300">
                  ₩{characterAttribution.totalRevenue.toLocaleString("ko-KR")}
                </span>
                {characterAttribution.unknown > 0 && (
                  <span className="ml-2 text-zinc-600">
                    · 미분류 {characterAttribution.unknown}
                  </span>
                )}
              </p>
              <Link
                href={`/api/admin/exports/character-attribution?window=${windowDays}`}
                className="px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              >
                CSV
              </Link>
            </div>
          </div>
          <ul className="space-y-2">
            {characterAttribution.bySlug.map((c) => {
              const widthPct = (c.inquiries / maxCharacterInquiries) * 100;
              return (
                <li
                  key={c.slug}
                  className="grid grid-cols-12 gap-3 items-center text-sm"
                >
                  <Link
                    href={`/character/${c.slug}`}
                    className="col-span-2 text-zinc-300 hover:text-white capitalize"
                  >
                    {c.slug}
                  </Link>
                  <div className="col-span-6 h-2 rounded bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-violet-400"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="col-span-4 text-right text-xs text-zinc-400 tabular-nums">
                    {c.inquiries} ·{" "}
                    <span
                      className={
                        c.conversionPct >= 30
                          ? "text-emerald-400"
                          : "text-zinc-500"
                      }
                    >
                      {c.conversionPct}%
                    </span>
                    {c.revenue > 0 && (
                      <span className="ml-2 text-emerald-300">
                        ₩{c.revenue.toLocaleString("ko-KR")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {characterAttribution.byTier.length > 0 &&
            (() => {
              const maxTier = Math.max(
                1,
                ...characterAttribution.byTier.map((t) => t.inquiries)
              );
              return (
                <>
                  <p className="mt-6 mb-2 text-[11px] uppercase tracking-wider text-zinc-500">
                    브랜드 키트 티어별
                  </p>
                  <ul className="space-y-2">
                    {characterAttribution.byTier.map((t) => {
                      const widthPct = (t.inquiries / maxTier) * 100;
                      return (
                        <li
                          key={t.tier}
                          className="grid grid-cols-12 gap-3 items-center text-sm"
                        >
                          <span
                            className="col-span-3 text-zinc-300 truncate"
                            title={humanTierLabel(t.tier)}
                          >
                            {humanTierLabel(t.tier)}
                          </span>
                          <div className="col-span-5 h-2 rounded bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="col-span-4 text-right text-xs text-zinc-400 tabular-nums">
                            {t.inquiries} ·{" "}
                            <span
                              className={
                                t.conversionPct >= 30
                                  ? "text-emerald-400"
                                  : "text-zinc-500"
                              }
                            >
                              {t.conversionPct}%
                            </span>
                            {t.revenue > 0 && (
                              <span className="ml-2 text-emerald-300">
                                ₩{t.revenue.toLocaleString("ko-KR")}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              );
            })()}
          <p className="mt-3 text-[11px] text-zinc-600">
            캐릭터 디테일 페이지 CTA 가 utm_source=character 로 attribut. 분기별 캐릭터 ROI 판단에 사용.
          </p>
        </section>
      )}

      {blogViews.total > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              블로그 글 조회 ({windowDays}일)
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <p className="text-zinc-500 tabular-nums">
                총 {blogViews.total.toLocaleString()} · KR{" "}
                {blogViews.totalKo.toLocaleString()} · EN{" "}
                {blogViews.totalEn.toLocaleString()}
              </p>
              <Link
                href={`/admin/blog-analytics?window=${windowDays}`}
                className="px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              >
                상세 →
              </Link>
              <Link
                href={`/api/admin/exports/blog-engagement?window=${windowDays}`}
                className="px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              >
                CSV
              </Link>
            </div>
          </div>
          {blogViews.bySeries.some((s) => s.total > 0) && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                시리즈별
              </p>
              <ul className="space-y-1.5">
                {blogViews.bySeries.map((s) => {
                  const widthPct = (s.total / maxSeriesViews) * 100;
                  return (
                    <li
                      key={s.seriesId}
                      className="grid grid-cols-12 gap-3 items-center text-sm"
                    >
                      <span className="col-span-4 text-violet-200 truncate">
                        {s.title}
                      </span>
                      <div className="col-span-6 h-2 rounded bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full bg-violet-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="col-span-2 text-right text-xs text-zinc-300 tabular-nums">
                        {s.total.toLocaleString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            Top 10 글
          </p>
          <ul className="space-y-1.5">
            {blogViews.bySlug.slice(0, 10).map((b) => {
              const widthPct = (b.total / maxBlogViews) * 100;
              // Locale agnostic title — try ko first, fall back to en. The
              // slug is the same across locales so either works.
              const post =
                getPostBySlug(b.slug, "ko") ?? getPostBySlug(b.slug, "en");
              const title = post?.title ?? b.slug;
              const href =
                post && post.locale === "en"
                  ? `/en/blog/${b.slug}`
                  : `/blog/${b.slug}`;
              return (
                <li
                  key={b.slug}
                  className="grid grid-cols-12 gap-3 items-center text-sm"
                >
                  <Link
                    href={href}
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
                    {b.total.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-zinc-600">
            usage_log route=blog.view · 1시간 dedup · bot 제외. 어떤 글이 트래픽을 견인하는지 판단.
          </p>
        </section>
      )}

      {blogAttribution.totalInquiries > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              블로그 글 → 인콰이어 ({windowDays}일)
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <p className="text-zinc-500 tabular-nums">
                referrer=/blog · {blogAttribution.totalInquiries}건 · 납품{" "}
                {blogAttribution.totalDelivered}건 ·{" "}
                <span className="text-emerald-300">
                  ₩{blogAttribution.totalRevenue.toLocaleString("ko-KR")}
                </span>
              </p>
            </div>
          </div>
          {(() => {
            const top = blogAttribution.bySlug.slice(0, 8);
            const maxInq = Math.max(1, ...top.map((b) => b.inquiries));
            return (
              <ul className="space-y-1.5">
                {top.map((b) => {
                  const post =
                    getPostBySlug(b.slug, b.locale) ??
                    getPostBySlug(b.slug, "ko") ??
                    getPostBySlug(b.slug, "en");
                  const title = post?.title ?? b.slug;
                  const widthPct = (b.inquiries / maxInq) * 100;
                  return (
                    <li
                      key={`${b.locale}:${b.slug}`}
                      className="grid grid-cols-12 gap-3 items-center text-sm"
                    >
                      <Link
                        href={`/admin/blog-analytics/${encodeURIComponent(b.slug)}?window=${windowDays}`}
                        className="col-span-6 truncate text-zinc-200 hover:text-white"
                        title={title}
                      >
                        <span className="mr-1.5 inline-block text-[9px] uppercase tracking-wider rounded px-1 py-0.5 bg-zinc-800 text-zinc-400">
                          {b.locale.toUpperCase()}
                        </span>
                        {title}
                      </Link>
                      <div className="col-span-3 h-2 rounded bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="col-span-3 text-right text-xs text-zinc-300 tabular-nums">
                        {b.inquiries}{" "}
                        <span
                          className={
                            b.conversionPct >= 30
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }
                        >
                          {b.conversionPct}%
                        </span>
                        {b.revenue > 0 && (
                          <span className="ml-2 text-emerald-300">
                            ₩{b.revenue.toLocaleString("ko-KR")}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
          <p className="mt-3 text-[11px] text-zinc-600">
            인콰이어 폼 직전 referrer 가 블로그 글이었던 케이스. 「조회」 카드와 다른 신호 — 조회는 트래픽, 이건 컨버전.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {a.windowDays}일 일별 문의 추세
          </h2>
          <div className="ml-auto flex items-center gap-1 text-[11px]">
            {(["7", "30", "90"] as const).map((w) => {
              const active = a.windowDays === Number(w);
              const href = w === "30" ? "/admin/analytics" : `/admin/analytics?window=${w}`;
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
            <span className="ml-2 text-zinc-600 tabular-nums">
              {a.daily.reduce((sum, d) => sum + d.count, 0)} 건 · KST
            </span>
          </div>
        </div>
        {(() => {
          const peak = Math.max(1, ...a.daily.map((d) => d.count));
          return (
            <div className="flex items-end gap-px h-32">
              {a.daily.map((d) => {
                const heightPct = (d.count / peak) * 100;
                const isWeekStart = d.date.endsWith("-01") || d.date.endsWith("01");
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col justify-end group relative"
                    title={`${d.date} — ${d.count}건`}
                  >
                    <div
                      className={`w-full rounded-sm transition-colors ${
                        d.count > 0
                          ? "bg-zinc-500 group-hover:bg-emerald-400"
                          : "bg-zinc-900"
                      }`}
                      style={{ height: `${Math.max(2, heightPct)}%` }}
                    />
                    {isWeekStart && (
                      <span className="absolute -bottom-4 left-0 text-[9px] text-zinc-700 tabular-nums">
                        {d.date.slice(5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        <p className="mt-6 text-[10px] text-zinc-600">
          가장 왼쪽 = {a.windowDays}일 전, 가장 오른쪽 = 오늘. 마우스 오버 시 일자·건수 표시.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          Top 모델 (문의 수)
        </h2>
        {a.topModels.length === 0 ? (
          <p className="text-sm text-zinc-600">데이터 없음</p>
        ) : (
          <ul className="space-y-2">
            {a.topModels.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Link
                  href={`/admin/models/${m.id}`}
                  className="text-sm font-medium w-40 truncate hover:text-zinc-300"
                >
                  {m.name}
                </Link>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-400 transition-all"
                    style={{
                      width: `${(m.inquiries / maxModelInquiries) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums w-24 text-right">
                  {m.inquiries} 문의 · {m.delivered} 납품
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          산업별 분포
        </h2>
        {a.byIndustry.length === 0 ? (
          <p className="text-sm text-zinc-600">데이터 없음</p>
        ) : (
          <ul className="space-y-2">
            {a.byIndustry.map((i) => (
              <li key={i.industry} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-zinc-300">
                  {INDUSTRY_LABELS[i.industry] ?? i.industry}
                </span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-400"
                    style={{ width: `${(i.inquiries / maxIndustry) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums w-16 text-right">
                  {i.inquiries}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          유입 채널 (utm_source · 90d)
        </h2>
        {a.bySource.length === 0 ? (
          <p className="text-sm text-zinc-600">데이터 없음</p>
        ) : (
          (() => {
            const maxSource = Math.max(1, ...a.bySource.map((s) => s.inquiries));
            return (
              <ul className="space-y-2">
                {a.bySource.map((s) => {
                  const convPct =
                    s.inquiries > 0
                      ? Math.round((s.delivered / s.inquiries) * 100)
                      : 0;
                  return (
                    <li
                      key={s.source}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-28 text-zinc-300 truncate" title={s.source}>
                        {s.source}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-zinc-400"
                          style={{
                            width: `${(s.inquiries / maxSource) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 tabular-nums w-32 text-right">
                        {s.inquiries} 문의 ·{" "}
                        <span
                          className={
                            convPct >= 30 ? "text-emerald-400" : "text-zinc-500"
                          }
                        >
                          {convPct}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          })()
        )}
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
