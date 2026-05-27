import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { aggregateDaily, type DailyBucket } from "@/lib/analytics/daily";

/**
 * Character-attributed inquiry funnel.
 *
 * /character/[slug] CTAs append `utm_source=character&utm_campaign=character_<slug>`
 * before sending the visitor on to /rfp or /match. When the inquiry is
 * created the attribution snapshot persists those utm fields on the
 * projects row, so we can read them back here to measure how each
 * character's detail page converts.
 *
 * We use `utm_campaign` for the slug split because the projects table
 * already has the column (no migration needed). `utm_source='character'`
 * is the filter; `utm_campaign='character_<slug>'` is the dimension.
 */

const CAMPAIGN_PREFIX = "character_";

export interface CharacterAttributionRow {
  slug: string;
  inquiries: number;
  delivered: number;
  conversionPct: number;
  /** Sum of invoice_amount across all attributed rows (KRW base units). */
  revenue: number;
}

export interface CharacterAttributionReport {
  windowDays: number;
  totalInquiries: number;
  totalDelivered: number;
  /** Sum of invoice_amount across all character-attributed rows. */
  totalRevenue: number;
  bySlug: CharacterAttributionRow[];
  /** Projects tagged utm_source=character but utm_campaign didn't parse. */
  unknown: number;
  /** Dense daily series of attributed inquiries (zero-filled). */
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

export function summarizeCharacterAttribution(
  rows: Row[]
): Pick<
  CharacterAttributionReport,
  "totalInquiries" | "totalDelivered" | "totalRevenue" | "bySlug" | "unknown"
> {
  const bySlug = new Map<
    string,
    { inquiries: number; delivered: number; revenue: number }
  >();
  let unknown = 0;
  let totalInquiries = 0;
  let totalDelivered = 0;
  let totalRevenue = 0;

  for (const r of rows) {
    totalInquiries += 1;
    const isDelivered = r.status === "delivered";
    // Revenue only counts on delivered rows — inquiries that never closed
    // shouldn't inflate the per-character ROI signal.
    const revenue = isDelivered ? r.invoice_amount ?? 0 : 0;
    if (isDelivered) totalDelivered += 1;
    totalRevenue += revenue;

    const slug = parseSlugFromCampaign(r.utm_campaign);
    if (!slug) {
      unknown += 1;
      continue;
    }
    const entry =
      bySlug.get(slug) ?? { inquiries: 0, delivered: 0, revenue: 0 };
    entry.inquiries += 1;
    if (isDelivered) entry.delivered += 1;
    entry.revenue += revenue;
    bySlug.set(slug, entry);
  }

  const ordered: CharacterAttributionRow[] = [...bySlug.entries()]
    .map(([slug, c]) => ({
      slug,
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
    bySlug: ordered,
    unknown,
  };
}

export function parseSlugFromCampaign(
  campaign: string | null | undefined
): string | null {
  if (!campaign) return null;
  if (!campaign.startsWith(CAMPAIGN_PREFIX)) return null;
  const slug = campaign.slice(CAMPAIGN_PREFIX.length);
  // Defensive — slug must match the registry shape ([a-z0-9-]{1,32}).
  if (!/^[a-z0-9-]{1,32}$/.test(slug)) return null;
  return slug;
}

export async function loadCharacterAttribution(
  windowDays: number = 30
): Promise<CharacterAttributionReport> {
  const empty: CharacterAttributionReport = {
    windowDays,
    totalInquiries: 0,
    totalDelivered: 0,
    totalRevenue: 0,
    bySlug: [],
    unknown: 0,
    daily: aggregateDaily([], windowDays),
  };
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select("status, utm_campaign, created_at, invoice_amount")
    .eq("utm_source", "character")
    .gte("created_at", since)
    .limit(5000);

  if (error) {
    console.warn("[character-attribution] read failed:", error.message);
    return empty;
  }

  const rowsWithDate = (data ?? []) as RowWithDate[];
  const summary = summarizeCharacterAttribution(rowsWithDate);
  const daily = aggregateDaily(rowsWithDate, windowDays);
  return { windowDays, ...summary, daily };
}
