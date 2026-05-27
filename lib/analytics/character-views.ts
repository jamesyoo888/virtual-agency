import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Aggregate character page views recorded via `track-character-view.ts`.
 *
 * Reads `usage_log` rows where route='character.view' and groups by the
 * character slug stored in the `model` column (`character:<slug>` prefix).
 * Locale lives in metadata.locale for finer drilldown later.
 *
 * Returns counts per slug + per locale within the rolling window. The
 * admin analytics page surfaces this as a compact card.
 */

export interface CharacterViewStat {
  slug: string;
  total: number;
  ko: number;
  en: number;
}

export interface CharacterViewDailyBucket {
  /** YYYY-MM-DD in UTC. */
  date: string;
  count: number;
}

export interface CharacterViewSummary {
  total: number;
  totalKo: number;
  totalEn: number;
  bySlug: CharacterViewStat[];
  daily: CharacterViewDailyBucket[];
}

export async function loadCharacterViews(
  windowDays: number
): Promise<CharacterViewSummary> {
  if (!SUPABASE_CONFIGURED) {
    return {
      total: 0,
      totalKo: 0,
      totalEn: 0,
      bySlug: [],
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
    .eq("route", "character.view")
    .gte("created_at", since)
    .limit(5000);

  return aggregateCharacterViews(data ?? [], windowDays);
}

interface RawRow {
  model: string | null;
  metadata: { locale?: string } | null;
  created_at?: string;
}

function emptyDailySeries(windowDays: number): CharacterViewDailyBucket[] {
  const days: CharacterViewDailyBucket[] = [];
  const now = new Date();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, count: 0 });
  }
  return days;
}

/**
 * Pure aggregator — exposed for tests, also called by loader.
 *
 * `windowDays` shapes the daily series so the sparkline is dense even
 * when no rows arrived for some days (zeros render as flat ground).
 */
export function aggregateCharacterViews(
  rows: RawRow[],
  windowDays = 30
): CharacterViewSummary {
  const bucket = new Map<string, CharacterViewStat>();
  const daily = emptyDailySeries(windowDays);
  const dayIndex = new Map(daily.map((d, i) => [d.date, i]));

  let totalKo = 0;
  let totalEn = 0;

  for (const row of rows) {
    const model = row.model ?? "";
    if (!model.startsWith("character:")) continue;
    const slug = model.slice("character:".length);
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
  return { total: totalKo + totalEn, totalKo, totalEn, bySlug, daily };
}
