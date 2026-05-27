import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { listSeries, type BlogSeriesId } from "@/lib/blog/series";

/**
 * Aggregate blog post views recorded via track-blog-view.ts.
 *
 * Reads usage_log rows where route='blog.view' and groups by slug
 * (model='blog:<slug>' prefix). Returns per-slug counts + per-series
 * rollups so /admin/analytics can show which content is converting.
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

export interface BlogViewSummary {
  windowDays: number;
  total: number;
  totalKo: number;
  totalEn: number;
  bySlug: BlogViewStat[];
  bySeries: BlogViewSeriesStat[];
}

interface RawRow {
  model: string | null;
  metadata: { locale?: string } | null;
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
    };
  }

  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("usage_log")
    .select("model, metadata")
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
  };
}
