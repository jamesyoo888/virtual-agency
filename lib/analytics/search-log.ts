import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Catalog search analytics. We piggyback usage_log (route='search.catalog') so
 * we don't need a dedicated migration for what is essentially a low-volume,
 * coarse-grained signal — same pattern as the audit log (Wave 33).
 *
 * Each row records:
 *   metadata.q          — sanitized query string (lower-cased, trimmed, ≤80 chars)
 *   metadata.results    — # of models returned (0 = zero-result candidate)
 *   metadata.industry   — filter applied at search time, if any
 *
 * Caller fires-and-forgets via `void logCatalogSearch(...)` — the render
 * doesn't await it and a DB hiccup never propagates to the user.
 */

const MAX_Q = 80;

export function sanitizeQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_Q);
}

export interface LogCatalogSearchInput {
  q: string;
  results: number;
  industry?: string | null;
  mood?: string | null;
  genre?: string | null;
}

export async function logCatalogSearch(input: LogCatalogSearchInput): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const q = sanitizeQuery(input.q);
  if (!q) return;
  try {
    const supabase = await createClient();
    await supabase.from("usage_log").insert({
      route: "search.catalog",
      model: "n/a",
      cost_usd: 0,
      metadata: {
        q,
        results: Math.max(0, input.results | 0),
        industry: input.industry || null,
        mood: input.mood || null,
        genre: input.genre || null,
      },
    });
  } catch (err) {
    // never let a logging failure leak into the catalog render
    console.warn("[search-log] insert failed:", err);
  }
}

export interface SearchAggregate {
  q: string;
  count: number;
  zeroResultCount: number;
  avgResults: number;
}

export interface LoadSearchAnalyticsInput {
  windowDays: number;
  limit: number;
}

interface SearchLogRow {
  metadata: {
    q?: string;
    results?: number;
  } | null;
}

export async function loadSearchAnalytics(
  input: LoadSearchAnalyticsInput
): Promise<{ top: SearchAggregate[]; zero: SearchAggregate[]; totalQueries: number }> {
  if (!SUPABASE_CONFIGURED) {
    return { top: [], zero: [], totalQueries: 0 };
  }
  const supabase = await createClient();
  const since = new Date(
    Date.now() - input.windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data } = await supabase
    .from("usage_log")
    .select("metadata")
    .eq("route", "search.catalog")
    .gte("created_at", since)
    .limit(5000);
  const rows = ((data ?? []) as SearchLogRow[]).map((r) => ({
    q: r.metadata?.q ?? "",
    results: typeof r.metadata?.results === "number" ? r.metadata.results : 0,
  }));
  return aggregateSearchRows(rows, input.limit);
}

export function aggregateSearchRows(
  rows: { q: string; results: number }[],
  limit: number
): { top: SearchAggregate[]; zero: SearchAggregate[]; totalQueries: number } {
  const acc = new Map<
    string,
    { count: number; zero: number; totalResults: number }
  >();
  for (const r of rows) {
    if (!r.q) continue;
    const cur = acc.get(r.q) ?? { count: 0, zero: 0, totalResults: 0 };
    cur.count += 1;
    cur.totalResults += r.results;
    if (r.results === 0) cur.zero += 1;
    acc.set(r.q, cur);
  }
  const all: SearchAggregate[] = [...acc.entries()].map(([q, v]) => ({
    q,
    count: v.count,
    zeroResultCount: v.zero,
    avgResults: v.count > 0 ? Math.round((v.totalResults / v.count) * 10) / 10 : 0,
  }));
  const top = [...all].sort((a, b) => b.count - a.count).slice(0, limit);
  const zero = all
    .filter((a) => a.zeroResultCount > 0)
    .sort((a, b) => b.zeroResultCount - a.zeroResultCount || b.count - a.count)
    .slice(0, limit);
  return { top, zero, totalQueries: rows.length };
}
