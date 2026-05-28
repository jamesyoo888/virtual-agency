import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { aggregateDaily, type DailyBucket } from "@/lib/analytics/daily";
import type { RecommendedPath } from "@/lib/pricing/calculator";

/**
 * Pricing-calculator-attributed inquiry funnel.
 *
 * /pricing-calculator (KR + EN) RFP CTA appends
 * `utm_source=pricing-calculator&utm_campaign=<recommended_path>` where
 * path is one of the 5 RecommendedPath values. When the inquiry is
 * created the attribution snapshot persists those utm fields on the
 * projects row, so we can read them back here to measure how each
 * recommended path converts.
 *
 * Mirrors `lib/analytics/character-attribution.ts` shape so the admin
 * UI can render symmetric cards.
 */

const KNOWN_PATHS: RecommendedPath[] = [
  "license_daily",
  "paired_editorial",
  "season_anchor",
  "custom_build",
  "traditional_competitive",
];

export interface PricingPathRow {
  path: RecommendedPath;
  inquiries: number;
  delivered: number;
  conversionPct: number;
  /** Sum of invoice_amount across delivered rows (KRW base units). */
  revenue: number;
}

export interface WeeklyPathBucket {
  /** ISO date (YYYY-MM-DD) of the Monday that starts this week. */
  weekStart: string;
  /** Per-path inquiry count for this week. Missing paths default to 0. */
  counts: Record<RecommendedPath, number>;
  /** Total inquiries this week (sum across paths + unknown). */
  total: number;
}

export interface PricingCalculatorAttributionReport {
  windowDays: number;
  totalInquiries: number;
  totalDelivered: number;
  totalRevenue: number;
  byPath: PricingPathRow[];
  /** Inquiries tagged utm_source=pricing-calculator but utm_campaign didn't
   *  match a known RecommendedPath (e.g. legacy values, manual edits). */
  unknown: number;
  daily: DailyBucket[];
  /** Path composition shifted by week — early signal that buyer scope is
   *  drifting (e.g. license_daily share rising relative to paired_editorial). */
  weeklyByPath: WeeklyPathBucket[];
}

interface Row {
  status: string | null;
  utm_campaign: string | null;
  invoice_amount?: number | null;
}

interface RowWithDate extends Row {
  created_at: string;
}

export function parsePathFromCampaign(
  campaign: string | null | undefined
): RecommendedPath | null {
  if (!campaign) return null;
  return (KNOWN_PATHS as string[]).includes(campaign)
    ? (campaign as RecommendedPath)
    : null;
}

export function summarizePricingCalculatorAttribution(
  rows: Row[]
): Pick<
  PricingCalculatorAttributionReport,
  "totalInquiries" | "totalDelivered" | "totalRevenue" | "byPath" | "unknown"
> {
  const byPath = new Map<
    RecommendedPath,
    { inquiries: number; delivered: number; revenue: number }
  >();
  let unknown = 0;
  let totalInquiries = 0;
  let totalDelivered = 0;
  let totalRevenue = 0;

  for (const r of rows) {
    totalInquiries += 1;
    const isDelivered = r.status === "delivered";
    const revenue = isDelivered ? r.invoice_amount ?? 0 : 0;
    if (isDelivered) totalDelivered += 1;
    totalRevenue += revenue;

    const path = parsePathFromCampaign(r.utm_campaign);
    if (path) {
      const entry =
        byPath.get(path) ?? { inquiries: 0, delivered: 0, revenue: 0 };
      entry.inquiries += 1;
      if (isDelivered) entry.delivered += 1;
      entry.revenue += revenue;
      byPath.set(path, entry);
    } else {
      unknown += 1;
    }
  }

  const ordered: PricingPathRow[] = [...byPath.entries()]
    .map(([path, c]) => ({
      path,
      inquiries: c.inquiries,
      delivered: c.delivered,
      revenue: c.revenue,
      conversionPct:
        c.inquiries > 0 ? Math.round((c.delivered / c.inquiries) * 100) : 0,
    }))
    .sort((a, b) => b.inquiries - a.inquiries);

  return {
    totalInquiries,
    totalDelivered,
    totalRevenue,
    byPath: ordered,
    unknown,
  };
}

/**
 * Group rows into weekly buckets keyed by Monday (UTC) and tally per-path
 * counts. Returns a contiguous array of weeks covering the requested window
 * (zero-filled so the trend chart doesn't gap mid-period).
 */
export function aggregateWeeklyByPath(
  rows: RowWithDate[],
  windowDays: number
): WeeklyPathBucket[] {
  const dayMs = 24 * 60 * 60 * 1000;
  // Anchor "now" to UTC midnight so the bucket boundaries line up regardless
  // of the server's local timezone.
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const since = new Date(today.getTime() - (windowDays - 1) * dayMs);

  function mondayOf(d: Date): string {
    const utc = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    );
    // getUTCDay: Sunday=0, Monday=1, ... Saturday=6. Shift to Monday-start.
    const dow = utc.getUTCDay();
    const offset = dow === 0 ? 6 : dow - 1;
    utc.setUTCDate(utc.getUTCDate() - offset);
    return utc.toISOString().slice(0, 10);
  }

  function emptyCounts(): Record<RecommendedPath, number> {
    return {
      license_daily: 0,
      paired_editorial: 0,
      season_anchor: 0,
      custom_build: 0,
      traditional_competitive: 0,
    };
  }

  // Pre-populate weeks across the window so the chart shows zeros, not gaps.
  const weeks = new Map<string, WeeklyPathBucket>();
  for (let t = since.getTime(); t <= today.getTime(); t += 7 * dayMs) {
    const key = mondayOf(new Date(t));
    if (!weeks.has(key)) {
      weeks.set(key, { weekStart: key, counts: emptyCounts(), total: 0 });
    }
  }
  // Also pre-populate the Monday of "today" — covers the edge where the
  // window length doesn't divide cleanly by 7.
  const todayKey = mondayOf(today);
  if (!weeks.has(todayKey)) {
    weeks.set(todayKey, {
      weekStart: todayKey,
      counts: emptyCounts(),
      total: 0,
    });
  }

  for (const r of rows) {
    const created = new Date(r.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const key = mondayOf(created);
    const bucket =
      weeks.get(key) ??
      (() => {
        const fresh: WeeklyPathBucket = {
          weekStart: key,
          counts: emptyCounts(),
          total: 0,
        };
        weeks.set(key, fresh);
        return fresh;
      })();
    bucket.total += 1;
    const path = parsePathFromCampaign(r.utm_campaign);
    if (path) bucket.counts[path] += 1;
  }

  return [...weeks.values()].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );
}

export async function loadPricingCalculatorAttribution(
  windowDays: number = 30
): Promise<PricingCalculatorAttributionReport> {
  const empty: PricingCalculatorAttributionReport = {
    windowDays,
    totalInquiries: 0,
    totalDelivered: 0,
    totalRevenue: 0,
    byPath: [],
    unknown: 0,
    daily: aggregateDaily([], windowDays),
    weeklyByPath: aggregateWeeklyByPath([], windowDays),
  };
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select("status, utm_campaign, created_at, invoice_amount")
    .eq("utm_source", "pricing-calculator")
    .gte("created_at", since)
    .limit(5000);

  if (error) {
    console.warn(
      "[pricing-calculator-attribution] read failed:",
      error.message
    );
    return empty;
  }

  const rowsWithDate = (data ?? []) as RowWithDate[];
  const summary = summarizePricingCalculatorAttribution(rowsWithDate);
  const daily = aggregateDaily(rowsWithDate, windowDays);
  const weeklyByPath = aggregateWeeklyByPath(rowsWithDate, windowDays);
  return { windowDays, ...summary, daily, weeklyByPath };
}

export function pathLabelForAdmin(
  path: RecommendedPath
): { short: string; tone: string } {
  const map: Record<RecommendedPath, { short: string; tone: string }> = {
    license_daily: { short: "License (daily)", tone: "amber" },
    paired_editorial: { short: "Paired Editorial", tone: "emerald" },
    season_anchor: { short: "Season Anchor", tone: "violet" },
    custom_build: { short: "Custom Build", tone: "fuchsia" },
    traditional_competitive: {
      short: "Traditional competitive",
      tone: "zinc",
    },
  };
  return map[path];
}
