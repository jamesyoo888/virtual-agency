import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Loads the calling client's prior inquiry counts per model so the matcher
 * can weight returning advertisers' history. Returns an empty map when:
 *   * Supabase isn't configured (dev),
 *   * the caller isn't authenticated,
 *   * the caller has no inquiries yet.
 *
 * Why a Map and not the raw rows: matching is called from multiple surfaces
 * (RFP, /match, similar models). A Map gives O(1) lookups during scoring;
 * the count itself stays in one place so the score weights are consistent.
 */

export async function loadPersonaInquiries(): Promise<Map<string, number>> {
  if (!SUPABASE_CONFIGURED) return new Map();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data } = await supabase
    .from("projects")
    .select("model_id")
    .eq("client_id", user.id)
    .not("model_id", "is", null);

  const counts = new Map<string, number>();
  for (const row of ((data ?? []) as { model_id: string | null }[])) {
    if (!row.model_id) continue;
    counts.set(row.model_id, (counts.get(row.model_id) ?? 0) + 1);
  }
  return counts;
}
