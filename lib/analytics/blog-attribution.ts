import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Inquiry attribution rolled up by the blog post a buyer came from.
 *
 * Reads `projects.referrer` (the URL the inquiry form was submitted with)
 * and isolates rows whose path matches `/blog/<slug>` or `/en/blog/<slug>`.
 * Aggregates count + delivered + revenue per slug, with conversion %.
 *
 * Lets /admin/forecast answer «which posts converted into deals?» — the
 * complement of /admin/blog-analytics, which only knows views (not money).
 */

export interface BlogAttributionStat {
  slug: string;
  /** "ko" or "en" — derived from the referrer path prefix. */
  locale: "ko" | "en";
  inquiries: number;
  delivered: number;
  revenue: number;
  conversionPct: number;
}

export interface BlogAttributionSummary {
  windowDays: number;
  totalInquiries: number;
  totalDelivered: number;
  totalRevenue: number;
  bySlug: BlogAttributionStat[];
}

interface RawRow {
  status: string | null;
  invoice_amount: number | string | null;
  referrer: string | null;
}

const BLOG_RE = /\/(?:en\/)?blog\/([a-z0-9-]+)/i;

export async function loadBlogAttribution(
  windowDays = 90
): Promise<BlogAttributionSummary> {
  if (!SUPABASE_CONFIGURED) {
    return {
      windowDays,
      totalInquiries: 0,
      totalDelivered: 0,
      totalRevenue: 0,
      bySlug: [],
    };
  }
  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data } = await supabase
    .from("projects")
    .select("status, invoice_amount, referrer")
    .gte("created_at", since)
    .not("referrer", "is", null)
    .limit(10_000);
  return aggregateBlogAttribution((data ?? []) as RawRow[], windowDays);
}

/**
 * Extract `{slug, locale}` from a referrer URL. Returns null when the
 * referrer isn't a blog page.
 *
 * Accepts both absolute (https://aihubs.uk/blog/xyz?ref=a) and relative
 * (/en/blog/xyz) referrers — Supabase stores whatever the form posted.
 */
export function parseBlogReferrer(
  referrer: string | null | undefined
): { slug: string; locale: "ko" | "en" } | null {
  if (!referrer) return null;
  // Strip query/hash before regex so we don't accidentally swallow them
  // into the slug capture group.
  let path = referrer;
  try {
    const u = new URL(referrer);
    path = u.pathname;
  } catch {
    // Already a relative path — keep it.
    path = referrer.split("?")[0].split("#")[0];
  }
  const m = BLOG_RE.exec(path);
  if (!m) return null;
  const locale: "ko" | "en" = path.startsWith("/en/blog/") || /\/en\/blog\//.test(path)
    ? "en"
    : "ko";
  return { slug: m[1], locale };
}

export function aggregateBlogAttribution(
  rows: RawRow[],
  windowDays = 90
): BlogAttributionSummary {
  const bucket = new Map<string, BlogAttributionStat>();
  let totalInquiries = 0;
  let totalDelivered = 0;
  let totalRevenue = 0;

  for (const row of rows) {
    const parsed = parseBlogReferrer(row.referrer);
    if (!parsed) continue;
    totalInquiries += 1;
    const isDelivered = row.status === "delivered";
    const amount =
      typeof row.invoice_amount === "string"
        ? Number.parseFloat(row.invoice_amount) || 0
        : row.invoice_amount ?? 0;
    if (isDelivered) {
      totalDelivered += 1;
      totalRevenue += amount;
    }
    const key = `${parsed.locale}:${parsed.slug}`;
    let entry = bucket.get(key);
    if (!entry) {
      entry = {
        slug: parsed.slug,
        locale: parsed.locale,
        inquiries: 0,
        delivered: 0,
        revenue: 0,
        conversionPct: 0,
      };
      bucket.set(key, entry);
    }
    entry.inquiries += 1;
    if (isDelivered) {
      entry.delivered += 1;
      entry.revenue += amount;
    }
  }

  for (const entry of bucket.values()) {
    entry.conversionPct =
      entry.inquiries > 0
        ? Math.round((entry.delivered / entry.inquiries) * 100)
        : 0;
  }

  const bySlug = [...bucket.values()].sort((a, b) => {
    // Revenue-first ranking; ties broken by inquiry count.
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return b.inquiries - a.inquiries;
  });

  return {
    windowDays,
    totalInquiries,
    totalDelivered,
    totalRevenue,
    bySlug,
  };
}
