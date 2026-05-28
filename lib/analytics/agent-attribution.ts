import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { aggregateDaily, type DailyBucket } from "@/lib/analytics/daily";

/** Standard 15% referral commission rate — single source of truth. */
export const AGENT_COMMISSION_RATE = 0.15;

/**
 * Per-agent referral stats — what a single agent brought in, and how much
 * of that traffic also touched a character or blog page on its way in.
 *
 * Reads `projects` filtered by `utm_source='agent'` and `utm_campaign=<agent.id>`
 * (set by the referral link composer on the agent dashboard).
 *
 * The character/blog overlay is opportunistic: we look at each project's
 * `referrer` and bucket whether the visitor came from a character or blog
 * page when they submitted. That's the closest we get without join tables.
 */

export interface AgentAttribution {
  agentId: string;
  windowDays: number;
  totalInquiries: number;
  totalDelivered: number;
  totalRevenue: number;
  /** Projects with referrer matching /character/ (KR or EN). */
  characterFunnel: number;
  /** Projects with referrer matching /blog/ (KR or EN). */
  blogFunnel: number;
}

interface RawRow {
  status: string | null;
  invoice_amount: number | string | null;
  referrer: string | null;
}

export async function loadAgentAttribution(
  agentId: string,
  windowDays = 90
): Promise<AgentAttribution> {
  const base: AgentAttribution = {
    agentId,
    windowDays,
    totalInquiries: 0,
    totalDelivered: 0,
    totalRevenue: 0,
    characterFunnel: 0,
    blogFunnel: 0,
  };
  if (!SUPABASE_CONFIGURED || !agentId) return base;

  const supabase = await createClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("projects")
    .select("status, invoice_amount, referrer")
    .eq("utm_source", "agent")
    .eq("utm_campaign", agentId)
    .gte("created_at", since)
    .limit(5000);

  return aggregateAgentAttribution(agentId, (data ?? []) as RawRow[], windowDays);
}

/**
 * Window-wide agent referral aggregate — what every agent combined brought
 * in. Mirrors the loadCharacterAttribution / loadBlogAttribution /
 * loadPricingCalculatorAttribution shape so the admin weekly digest +
 * /admin/analytics card can render it symmetrically.
 */
export interface AgentBreakdownRow {
  agentId: string;
  inquiries: number;
  delivered: number;
  conversionPct: number;
  /** Sum of invoice_amount across delivered rows for this agent. */
  revenue: number;
}

export interface AllAgentAttribution {
  windowDays: number;
  totalInquiries: number;
  totalDelivered: number;
  totalRevenue: number;
  /** 15% standard commission estimate on totalRevenue. */
  commissionEstimate: number;
  /** Per-agent breakdown keyed by utm_campaign (= clients.id). */
  byAgent: AgentBreakdownRow[];
  daily: DailyBucket[];
}

interface AllAgentRawRow {
  status: string | null;
  invoice_amount: number | string | null;
  utm_campaign: string | null;
  created_at: string;
}

export function aggregateAllAgentAttribution(
  rows: AllAgentRawRow[],
  windowDays = 30
): AllAgentAttribution {
  const perAgent = new Map<
    string,
    { inquiries: number; delivered: number; revenue: number }
  >();
  let totalDelivered = 0;
  let totalRevenue = 0;

  for (const r of rows) {
    const isDelivered = r.status === "delivered";
    const amt =
      typeof r.invoice_amount === "string"
        ? Number.parseFloat(r.invoice_amount) || 0
        : r.invoice_amount ?? 0;
    if (isDelivered) {
      totalDelivered += 1;
      totalRevenue += amt;
    }
    const agentId = (r.utm_campaign ?? "").trim();
    if (!agentId) continue;
    const entry =
      perAgent.get(agentId) ?? { inquiries: 0, delivered: 0, revenue: 0 };
    entry.inquiries += 1;
    if (isDelivered) {
      entry.delivered += 1;
      entry.revenue += amt;
    }
    perAgent.set(agentId, entry);
  }

  const byAgent: AgentBreakdownRow[] = [...perAgent.entries()]
    .map(([agentId, c]) => ({
      agentId,
      inquiries: c.inquiries,
      delivered: c.delivered,
      revenue: c.revenue,
      conversionPct:
        c.inquiries > 0 ? Math.round((c.delivered / c.inquiries) * 100) : 0,
    }))
    .sort((a, b) => b.inquiries - a.inquiries);

  return {
    windowDays,
    totalInquiries: rows.length,
    totalDelivered,
    totalRevenue,
    commissionEstimate: Math.round(totalRevenue * AGENT_COMMISSION_RATE),
    byAgent,
    daily: aggregateDaily(rows, windowDays),
  };
}

export async function loadAllAgentAttribution(
  windowDays = 30
): Promise<AllAgentAttribution> {
  const empty: AllAgentAttribution = {
    windowDays,
    totalInquiries: 0,
    totalDelivered: 0,
    totalRevenue: 0,
    commissionEstimate: 0,
    byAgent: [],
    daily: aggregateDaily([], windowDays),
  };
  if (!SUPABASE_CONFIGURED) return empty;

  const supabase = await createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("projects")
    .select("status, invoice_amount, utm_campaign, created_at")
    .eq("utm_source", "agent")
    .gte("created_at", since)
    .limit(5000);

  if (error) {
    console.warn("[agent-attribution] read failed:", error.message);
    return empty;
  }

  return aggregateAllAgentAttribution(
    (data ?? []) as AllAgentRawRow[],
    windowDays
  );
}

export function aggregateAgentAttribution(
  agentId: string,
  rows: RawRow[],
  windowDays = 90
): AgentAttribution {
  let totalDelivered = 0;
  let totalRevenue = 0;
  let characterFunnel = 0;
  let blogFunnel = 0;

  for (const row of rows) {
    const ref = row.referrer ?? "";
    if (/\/(?:en\/)?character\//.test(ref)) characterFunnel += 1;
    if (/\/(?:en\/)?blog\//.test(ref)) blogFunnel += 1;
    if (row.status === "delivered") {
      totalDelivered += 1;
      const amount =
        typeof row.invoice_amount === "string"
          ? Number.parseFloat(row.invoice_amount) || 0
          : row.invoice_amount ?? 0;
      totalRevenue += amount;
    }
  }

  return {
    agentId,
    windowDays,
    totalInquiries: rows.length,
    totalDelivered,
    totalRevenue,
    characterFunnel,
    blogFunnel,
  };
}
