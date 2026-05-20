import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Persona signals for matching. Two independent streams feed the matcher:
 *
 *   inquiries — every project the calling client has filed against a model.
 *               Strong signal: they actually reached out / paid.
 *   rfps      — every time a model appeared in the top-N of one of the
 *               client's past RFP runs (rfp_submissions.recommended). Weaker
 *               signal: the client *considered* the model but may not have
 *               followed through. Useful for re-surfacing near-misses.
 *
 * Returns empty maps when:
 *   * Supabase isn't configured (dev),
 *   * the caller isn't authenticated,
 *   * the caller has no relevant history.
 *
 * Why a Map and not the raw rows: matching is called from multiple surfaces
 * (RFP page, /match, similar models). A Map gives O(1) lookups during scoring;
 * the count itself stays in one place so the score weights are consistent.
 */

export interface PersonaSignals {
  inquiries: Map<string, number>;
  rfps: Map<string, number>;
}

const EMPTY: PersonaSignals = { inquiries: new Map(), rfps: new Map() };

/**
 * Lower bound on rfp_submissions.recommended ranking we count as a "near
 * miss". Anything past position 5 was probably never seriously considered.
 */
const RFP_TOP_N = 5;

export async function loadPersonaSignals(): Promise<PersonaSignals> {
  if (!SUPABASE_CONFIGURED) return EMPTY;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const [projects, rfps] = await Promise.all([
    supabase
      .from("projects")
      .select("model_id")
      .eq("client_id", user.id)
      .not("model_id", "is", null),
    supabase
      .from("rfp_submissions")
      .select("recommended")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const inquiries = new Map<string, number>();
  for (const row of ((projects.data ?? []) as { model_id: string | null }[])) {
    if (!row.model_id) continue;
    inquiries.set(row.model_id, (inquiries.get(row.model_id) ?? 0) + 1);
  }

  const rfpCounts = new Map<string, number>();
  for (const row of ((rfps.data ?? []) as { recommended: unknown }[])) {
    if (!Array.isArray(row.recommended)) continue;
    for (const rec of row.recommended.slice(0, RFP_TOP_N)) {
      if (!rec || typeof rec !== "object") continue;
      const id = (rec as { id?: unknown }).id;
      if (typeof id !== "string") continue;
      rfpCounts.set(id, (rfpCounts.get(id) ?? 0) + 1);
    }
  }

  return { inquiries, rfps: rfpCounts };
}

/**
 * Back-compat: callers that only need the strong signal (inquiries) can keep
 * using this. Newer call sites should use `loadPersonaSignals` so the matcher
 * gets both streams.
 */
export async function loadPersonaInquiries(): Promise<Map<string, number>> {
  const { inquiries } = await loadPersonaSignals();
  return inquiries;
}
