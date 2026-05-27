import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { listSeries, type BlogSeriesId } from "@/lib/blog/series";

/**
 * Aggregate blog post views recorded via track-blog-view.ts.
 *
 * Reads usage_log rows where route='blog.view' and groups by slug
 * (model='blog:<slug>' prefix). Returns per-slug counts + per-series
 * rollups + daily zero-filled series so the dedicated /admin/blog-analytics
 * page can show drift, drill-down, and content health.
 */

export interface BlogViewStat {
  slug: string;
  total: number;
  ko: number;
  en: number;
}

export interface BlogViewSeriesStat {
  seriesId: BlogSeriesId;
  title: string;
  total: number;
}

export interface BlogViewDailyBucket {
  /** YYYY-MM-DD in UTC. */
  date: string;
  count: number;
}

export interface BlogViewSummary {
  windowDays: number;
  total: number;
  totalKo: number;
  totalEn: number;
  bySlug: BlogViewStat[];
  bySeries: BlogViewSeriesStat[];
  daily: BlogViewDailyBucket[];
}

export interface BlogReferrerStat {
  /** Cleaned source label, e.g. "google", "(direct)", "twitter.com". */
  source: string;
  count: number;
}

export interface BlogPostDetail {
  slug: string;
  windowDays: number;
  total: number;
  ko: number;
  en: number;
  daily: BlogViewDailyBucket[];
  topReferrers: BlogReferrerStat[];
}

interface RawRow {
  model: string | null;
  metadata: { locale?: string; referrer?: string | null } | null;
  created_at?: string;
}

function emptyDailySeries(windowDays: number): BlogViewDailyBucket[] {
  const days: BlogViewDailyBucket[] = [];
  const now = new Date();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, count: 0 });
  }
  return days;
}

export async function loadBlogViews(
  windowDays = 30
): Promise<BlogViewSummary> {
  if (!SUPABASE_CONFIGURED) {
    return {
      windowDays,
      total: 0,
      totalKo: 0,
      totalEn: 0,
      bySlug: [],
      bySeries: [],
      daily: emptyDailySeries(windowDays),
    };
  }

  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("usage_log")
    .select("model, metadata, created_at")
    .eq("route", "blog.view")
    .gte("created_at", since)
    .limit(10_000);

  return aggregateBlogViews(data ?? [], windowDays);
}

export function aggregateBlogViews(
  rows: RawRow[],
  windowDays = 30
): BlogViewSummary {
  const bucket = new Map<string, BlogViewStat>();
  const daily = emptyDailySeries(windowDays);
  const dayIndex = new Map(daily.map((d, i) => [d.date, i]));
  let totalKo = 0;
  let totalEn = 0;

  for (const row of rows) {
    const model = row.model ?? "";
    if (!model.startsWith("blog:")) continue;
    const slug = model.slice("blog:".length);
    if (!slug) continue;
    const locale = row.metadata?.locale === "en" ? "en" : "ko";
    if (locale === "ko") totalKo += 1;
    else totalEn += 1;

    let entry = bucket.get(slug);
    if (!entry) {
      entry = { slug, total: 0, ko: 0, en: 0 };
      bucket.set(slug, entry);
    }
    entry.total += 1;
    entry[locale] += 1;

    if (row.created_at) {
      const date = row.created_at.slice(0, 10);
      const idx = dayIndex.get(date);
      if (idx !== undefined) daily[idx].count += 1;
    }
  }

  const bySlug = [...bucket.values()].sort((a, b) => b.total - a.total);

  // Roll up to per-series totals — a slug counts toward the first series
  // that lists it (matching getSeriesForPost behavior).
  const seriesIdToTotal = new Map<BlogSeriesId, number>();
  for (const series of [...listSeries("ko"), ...listSeries("en")]) {
    let total = seriesIdToTotal.get(series.id) ?? 0;
    for (const slug of series.slugs) {
      const stat = bucket.get(slug);
      if (stat) total += stat.total;
    }
    seriesIdToTotal.set(series.id, total);
  }

  const seenIds = new Set<BlogSeriesId>();
  const bySeries: BlogViewSeriesStat[] = [];
  for (const series of [...listSeries("ko"), ...listSeries("en")]) {
    if (seenIds.has(series.id)) continue;
    seenIds.add(series.id);
    bySeries.push({
      seriesId: series.id,
      title: series.title,
      total: seriesIdToTotal.get(series.id) ?? 0,
    });
  }
  bySeries.sort((a, b) => b.total - a.total);

  return {
    windowDays,
    total: totalKo + totalEn,
    totalKo,
    totalEn,
    bySlug,
    bySeries,
    daily,
  };
}

/**
 * Per-post drill-down with referrer breakdown.
 *
 * Same data source as loadBlogViews but filtered to a single slug and
 * grouped along the time axis + referrer axis instead.
 */
export async function loadBlogPostDetail(
  slug: string,
  windowDays = 30
): Promise<BlogPostDetail> {
  if (!SUPABASE_CONFIGURED) {
    return {
      slug,
      windowDays,
      total: 0,
      ko: 0,
      en: 0,
      daily: emptyDailySeries(windowDays),
      topReferrers: [],
    };
  }

  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("usage_log")
    .select("model, metadata, created_at")
    .eq("route", "blog.view")
    .eq("model", `blog:${slug}`)
    .gte("created_at", since)
    .limit(10_000);

  return aggregateBlogPostDetail(slug, data ?? [], windowDays);
}

export function aggregateBlogPostDetail(
  slug: string,
  rows: RawRow[],
  windowDays = 30
): BlogPostDetail {
  const daily = emptyDailySeries(windowDays);
  const dayIndex = new Map(daily.map((d, i) => [d.date, i]));
  const referrerMap = new Map<string, number>();
  let ko = 0;
  let en = 0;

  for (const row of rows) {
    const model = row.model ?? "";
    if (model !== `blog:${slug}`) continue;
    const locale = row.metadata?.locale === "en" ? "en" : "ko";
    if (locale === "ko") ko += 1;
    else en += 1;

    if (row.created_at) {
      const date = row.created_at.slice(0, 10);
      const idx = dayIndex.get(date);
      if (idx !== undefined) daily[idx].count += 1;
    }

    const source = classifyReferrer(row.metadata?.referrer ?? null);
    referrerMap.set(source, (referrerMap.get(source) ?? 0) + 1);
  }

  const topReferrers = [...referrerMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    slug,
    windowDays,
    total: ko + en,
    ko,
    en,
    daily,
    topReferrers,
  };
}

/**
 * Per-series drill-down. Filters usage_log to rows whose model is one of the
 * series' post slugs, then aggregates the same way loadBlogViews does. Used
 * by /admin/blog-analytics/series/[id] to surface which posts in a series are
 * pulling weight vs which are dead weight.
 *
 * Returns a BlogViewSummary scoped to the series — bySlug is naturally
 * already filtered, bySeries is omitted (one series, no rollup needed).
 */
export async function loadBlogSeriesDetail(
  slugs: string[],
  windowDays = 30
): Promise<BlogViewSummary> {
  if (!SUPABASE_CONFIGURED || slugs.length === 0) {
    return {
      windowDays,
      total: 0,
      totalKo: 0,
      totalEn: 0,
      bySlug: [],
      bySeries: [],
      daily: emptyDailySeries(windowDays),
    };
  }
  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const models = slugs.map((s) => `blog:${s}`);
  const { data } = await supabase
    .from("usage_log")
    .select("model, metadata, created_at")
    .eq("route", "blog.view")
    .in("model", models)
    .gte("created_at", since)
    .limit(10_000);
  // Reuse aggregateBlogViews — the series rollup section will see only
  // matching slugs so bySeries is naturally empty when the series isn't
  // listed (and a single-series rollup is redundant info on this page anyway).
  const summary = aggregateBlogViews(data ?? [], windowDays);
  return { ...summary, bySeries: [] };
}

/**
 * Reduce a raw Referer header to a coarse source bucket.
 *
 * - null/empty → "(direct)"
 * - same-origin (aihubs.uk or vercel.app or localhost) → "(internal)"
 * - known engines map to canonical names (google, naver, bing, duckduckgo, yandex)
 * - everything else → hostname without leading "www."
 *
 * Pure — exposed for tests.
 */
export function classifyReferrer(referrer: string | null | undefined): string {
  if (!referrer) return "(direct)";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "(direct)";
  }
  if (!host) return "(direct)";
  if (
    host.endsWith("aihubs.uk") ||
    host.endsWith("vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return "(internal)";
  }
  const stripped = host.startsWith("www.") ? host.slice(4) : host;
  if (stripped.endsWith("google.com") || stripped === "google.com")
    return "google";
  if (stripped.endsWith("naver.com")) return "naver";
  if (stripped.endsWith("bing.com")) return "bing";
  if (stripped.endsWith("duckduckgo.com")) return "duckduckgo";
  if (stripped.endsWith("yandex.com") || stripped.endsWith("yandex.ru"))
    return "yandex";
  if (stripped.endsWith("t.co") || stripped.endsWith("twitter.com") || stripped.endsWith("x.com"))
    return "twitter";
  if (stripped.endsWith("facebook.com") || stripped === "fb.com" || stripped.endsWith("fb.com"))
    return "facebook";
  if (stripped.endsWith("instagram.com")) return "instagram";
  if (stripped.endsWith("linkedin.com")) return "linkedin";
  if (stripped.endsWith("reddit.com")) return "reddit";
  if (stripped.endsWith("youtube.com") || stripped.endsWith("youtu.be"))
    return "youtube";
  if (stripped.endsWith("kakao.com")) return "kakao";
  return stripped;
}
