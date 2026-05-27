import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

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
}

export interface CharacterAttributionReport {
  windowDays: number;
  totalInquiries: number;
  totalDelivered: number;
  bySlug: CharacterAttributionRow[];
  /** Projects tagged utm_source=character but utm_campaign didn't parse. */
  unknown: number;
}

interface Row {
  status: string | null;
  utm_campaign: string | null;
}

export function summarizeCharacterAttribution(
  rows: Row[]
): Pick<CharacterAttributionReport, "totalInquiries" | "totalDelivered" | "bySlug" | "unknown"> {
  const bySlug = new Map<string, { inquiries: number; delivered: number }>();
  let unknown = 0;
  let totalInquiries = 0;
  let totalDelivered = 0;

  for (const r of rows) {
    totalInquiries += 1;
    if (r.status === "delivered") totalDelivered += 1;

    const slug = parseSlugFromCampaign(r.utm_campaign);
    if (!slug) {
      unknown += 1;
      continue;
    }
    const entry = bySlug.get(slug) ?? { inquiries: 0, delivered: 0 };
    entry.inquiries += 1;
    if (r.status === "delivered") entry.delivered += 1;
    bySlug.set(slug, entry);
  }

  const ordered: CharacterAttributionRow[] = [...bySlug.entries()]
    .map(([slug, c]) => ({
      slug,
      inquiries: c.inquiries,
      delivered: c.delivered,
      conversionPct:
        c.inquiries > 0 ? Math.round((c.delivered / c.inquiries) * 100) : 0,
    }))
    .sort((a, b) => b.inquiries - a.inquiries);

  return { totalInquiries, totalDelivered, bySlug: ordered, unknown };
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
    bySlug: [],
    unknown: 0,
  };
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select("status, utm_campaign")
    .eq("utm_source", "character")
    .gte("created_at", since)
    .limit(5000);

  if (error) {
    console.warn("[character-attribution] read failed:", error.message);
    return empty;
  }

  const summary = summarizeCharacterAttribution((data ?? []) as Row[]);
  return { windowDays, ...summary };
}
