import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Conversion funnel rollup. Reads the projects table and bins rows by their
 * *current* status — the simplest accurate model when we don't have a
 * cohort definition. A project that started as 'inquiry' and is now
 * 'delivered' counts in 'delivered' (and is treated as having passed every
 * earlier stage). This matches how operations actually report the funnel
 * ("how many of last month's inquiries closed?").
 *
 * Window: the `since` cutoff is applied to `created_at` so we count
 * inquiries born in the window, regardless of where they ended up.
 */

const STAGES = ["inquiry", "brief_received", "in_progress", "review", "delivered"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_ORDER: Record<Stage, number> = {
  inquiry: 0,
  brief_received: 1,
  in_progress: 2,
  review: 3,
  delivered: 4,
};

export interface FunnelStageCount {
  stage: Stage;
  /** Inquiries that reached this stage OR beyond (cumulative). */
  reached: number;
}

export interface FunnelReport {
  windowDays: number;
  total: number;
  stages: FunnelStageCount[];
}

export async function loadFunnel(windowDays: number = 30): Promise<FunnelReport> {
  const empty: FunnelReport = {
    windowDays,
    total: 0,
    stages: STAGES.map((stage) => ({ stage, reached: 0 })),
  };
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select("status")
    .gte("created_at", since)
    .limit(5000);

  if (error) {
    console.warn("[funnel] read failed:", error.message);
    return empty;
  }

  const counts: Record<Stage, number> = {
    inquiry: 0, brief_received: 0, in_progress: 0, review: 0, delivered: 0,
  };
  for (const row of (data ?? []) as { status: string }[]) {
    const stage = row.status as Stage;
    if (stage in counts) counts[stage] += 1;
  }

  // Cumulative: a project at stage N has passed stages 0..N.
  const stages: FunnelStageCount[] = STAGES.map((stage) => {
    const order = STAGE_ORDER[stage];
    let reached = 0;
    for (const s of STAGES) {
      if (STAGE_ORDER[s] >= order) reached += counts[s];
    }
    return { stage, reached };
  });

  return {
    windowDays,
    total: stages[0].reached, // every project entered at least 'inquiry'
    stages,
  };
}

/**
 * Conversion rate between adjacent stages: `next.reached / curr.reached`.
 * Returns null when the earlier stage is empty (undefined ratio).
 */
export function stageConversionRate(
  curr: FunnelStageCount,
  next: FunnelStageCount
): number | null {
  if (curr.reached <= 0) return null;
  return next.reached / curr.reached;
}

export const FUNNEL_STAGES = STAGES;

export interface SourceBreakdownRow {
  /** "(direct)" when both utm_source and referrer are null. */
  source: string;
  total: number;
  delivered: number;
  conversionRate: number;
}

/**
 * Per-source rollup of the same projects considered by `loadFunnel`. We
 * surface only the top-N sources by inquiry count — the long tail of
 * one-off referrers isn't actionable for a marketing decision. "Direct"
 * (no utm, no referrer) is grouped explicitly so it doesn't disappear.
 */
export async function loadFunnelBySource(
  windowDays: number = 30,
  topN: number = 6
): Promise<SourceBreakdownRow[]> {
  if (!SUPABASE_CONFIGURED) return [];
  const supabase = await createAdminClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select("status, utm_source, referrer")
    .gte("created_at", since)
    .limit(5000);
  if (error) {
    console.warn("[funnel:by-source] read failed:", error.message);
    return [];
  }

  type Row = { status: string; utm_source: string | null; referrer: string | null };
  const byKey = new Map<string, { total: number; delivered: number }>();
  for (const r of (data ?? []) as Row[]) {
    const key = r.utm_source ?? (r.referrer ? hostnameOf(r.referrer) : "(direct)");
    const entry = byKey.get(key) ?? { total: 0, delivered: 0 };
    entry.total += 1;
    if (r.status === "delivered") entry.delivered += 1;
    byKey.set(key, entry);
  }

  return [...byKey.entries()]
    .map(([source, c]) => ({
      source,
      total: c.total,
      delivered: c.delivered,
      conversionRate: c.total > 0 ? c.delivered / c.total : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Best-effort fallback for malformed referrer strings.
    return url.slice(0, 64);
  }
}
