import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface RfpSubmissionInputs {
  campaign?: string;
  advertiser?: string;
  launch?: string;
  durationDays?: string;
  channels?: string[];
  message?: string;
  heroCopy?: string;
  industries?: string[];
  moods?: string[];
  targetAge?: string;
  budgetBand?: string;
  budgetPerDay?: number | null;
  needsExclusive?: boolean;
}

export interface RfpSubmissionRecommendation {
  id: string;
  name: string;
  score: number;
}

/**
 * Fire-and-forget persistence for an authenticated RFP run. The RFP page is
 * a Server Component that returns the rendered HTML synchronously — this
 * helper is called from inside the page render and returns immediately, so
 * the response is never blocked on the DB write.
 *
 * Rate-limit heuristic:
 *   We don't dedup repeated runs from the same client *as a strict gate*;
 *   instead we cap at 1 insert per minute per (client_id, identical
 *   payload). The page reruns on every search-param change — without this
 *   the table fills with near-duplicates while the advertiser tweaks chips.
 */

const inMemoryDedup = new Map<string, number>();
const DEDUP_MS = 60 * 1000;

function dedupKey(clientId: string, inputs: RfpSubmissionInputs): string {
  return `${clientId}:${JSON.stringify(inputs)}`;
}

function pruneDedup(now: number) {
  if (inMemoryDedup.size < 500) return;
  for (const [k, t] of inMemoryDedup) {
    if (now - t > DEDUP_MS) inMemoryDedup.delete(k);
  }
}

export async function persistRfpSubmission(
  inputs: RfpSubmissionInputs,
  recommended: RfpSubmissionRecommendation[]
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // anonymous — leave no trace

    const now = Date.now();
    const key = dedupKey(user.id, inputs);
    const last = inMemoryDedup.get(key);
    if (last && now - last < DEDUP_MS) return;
    inMemoryDedup.set(key, now);
    pruneDedup(now);

    await supabase.from("rfp_submissions").insert({
      client_id: user.id,
      inputs,
      recommended,
    });
  } catch (err) {
    console.warn("[rfp:persist] insert failed:", err);
  }
}

/** Test seam. */
export function _resetRfpDedupForTests() {
  inMemoryDedup.clear();
}
