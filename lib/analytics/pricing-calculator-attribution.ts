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
  return { windowDays, ...summary, daily };
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
