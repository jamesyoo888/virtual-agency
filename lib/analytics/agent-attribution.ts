import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

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
