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

export interface CharacterViewSummary {
  total: number;
  totalKo: number;
  totalEn: number;
  bySlug: CharacterViewStat[];
}

export async function loadCharacterViews(
  windowDays: number
): Promise<CharacterViewSummary> {
  if (!SUPABASE_CONFIGURED) {
    return { total: 0, totalKo: 0, totalEn: 0, bySlug: [] };
  }

  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("usage_log")
    .select("model, metadata")
    .eq("route", "character.view")
    .gte("created_at", since)
    .limit(5000);

  return aggregateCharacterViews(data ?? []);
}

interface RawRow {
  model: string | null;
  metadata: { locale?: string } | null;
}

/** Pure aggregator — exposed for tests, also called by loader. */
export function aggregateCharacterViews(rows: RawRow[]): CharacterViewSummary {
  const bucket = new Map<string, CharacterViewStat>();
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
  }

  const bySlug = [...bucket.values()].sort((a, b) => b.total - a.total);
  return { total: totalKo + totalEn, totalKo, totalEn, bySlug };
}
