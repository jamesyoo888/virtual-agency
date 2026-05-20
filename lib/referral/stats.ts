import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Stats for a referrer's outbound links — counts inquiries and delivered
 * projects attributed to them. Mirrors the per-row aggregation that
 * `/admin/referrals` does cross-referrer, but scoped to a single client.
 *
 * We read with the admin client because attribution rows live across
 * different client_ids (the referee's projects), which the requester's RLS
 * may not let them touch directly. The function only ever returns counts +
 * aggregate dates — no raw rows from other accounts cross the trust
 * boundary.
 */

export interface ReferralStats {
  inquiries: number;
  delivered: number;
  uniqueReferees: number;
  firstReferralAt: string | null;
  lastReferralAt: string | null;
}

const EMPTY: ReferralStats = {
  inquiries: 0,
  delivered: 0,
  uniqueReferees: 0,
  firstReferralAt: null,
  lastReferralAt: null,
};

export async function loadReferralStats(
  referrerId: string
): Promise<ReferralStats> {
  if (!SUPABASE_CONFIGURED) return EMPTY;
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .select("client_id, status, created_at")
      .eq("utm_source", "referral")
      .eq("utm_campaign", referrerId);
    if (error) return EMPTY;
    const rows =
      (data as unknown as Array<{
        client_id: string;
        status: string;
        created_at: string;
      }>) ?? [];
    if (rows.length === 0) return EMPTY;
    const referees = new Set<string>();
    let inquiries = 0;
    let delivered = 0;
    let first = rows[0].created_at;
    let last = rows[0].created_at;
    for (const r of rows) {
      inquiries += 1;
      if (r.status === "delivered") delivered += 1;
      if (r.client_id) referees.add(r.client_id);
      if (r.created_at < first) first = r.created_at;
      if (r.created_at > last) last = r.created_at;
    }
    return {
      inquiries,
      delivered,
      uniqueReferees: referees.size,
      firstReferralAt: first,
      lastReferralAt: last,
    };
  } catch {
    return EMPTY;
  }
}
