import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import {
  EXPERIMENTS,
  EXPERIMENT_ADMIN_OVERRIDE_COOKIE,
  cookieNameFor,
  resolveVariant,
  type ExperimentKey,
} from "@/lib/experiments";
import { VIEW_COOKIE_NAME, isBot } from "@/lib/analytics/track-view";
import { classifyDevice, classifyVisitor } from "@/lib/analytics/classify";

/**
 * Funnel tracker for cookie-bucketed experiments. Records impression rows on
 * first contact with the experimental surface (the homepage hero, etc.) and
 * conversion rows when the targeted action happens (e.g. inquiry submit).
 *
 * Constraints:
 *  - Must never block the user-visible response. All inserts run in the
 *    background via `void`; failures are logged but swallowed.
 *  - Must never inflate counts. The unique index on
 *    (key, viewer_cookie, kind) handles refresh storms — we swallow `23505`.
 *  - Skip bots; otherwise the popularity-ish skew leaks into the funnel too.
 *
 * We deliberately do not touch cookies here: the proxy already assigns the
 * bucket cookie and the viewer cookie, so trackers are read-only on cookies.
 */

const inFlightDedup = new Map<string, number>();
const IN_FLIGHT_TTL_MS = 60 * 1000; // 1 minute soft dedup before DB write

function shouldFire(cookieValue: string, key: string, kind: string): boolean {
  const k = `${cookieValue}:${key}:${kind}`;
  const now = Date.now();
  const last = inFlightDedup.get(k);
  if (last && now - last < IN_FLIGHT_TTL_MS) return false;
  inFlightDedup.set(k, now);
  if (inFlightDedup.size > 2000) {
    for (const [kk, t] of inFlightDedup) {
      if (now - t > IN_FLIGHT_TTL_MS) inFlightDedup.delete(kk);
    }
  }
  return true;
}

interface RecordOpts {
  surface?: string;
  userId?: string | null;
}

async function record(
  key: ExperimentKey,
  kind: "impression" | "conversion",
  opts: RecordOpts = {}
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  const headerStore = await headers();
  const ua = headerStore.get("user-agent");
  if (isBot(ua)) return;

  const cookieStore = await cookies();

  // Admin dry-run: a manager pinned themselves to a variant via
  // /admin/experiments. Their session must not show up in the funnel.
  if (cookieStore.get(EXPERIMENT_ADMIN_OVERRIDE_COOKIE)?.value === "1") return;

  const def = EXPERIMENTS[key];
  const raw = cookieStore.get(cookieNameFor(def.key))?.value;
  const variant = resolveVariant(def, raw);
  if (!variant) return; // bucket not assigned yet — proxy will set it next hit

  const viewer = cookieStore.get(VIEW_COOKIE_NAME)?.value;
  if (!viewer) return;

  if (!shouldFire(viewer, key, kind)) return;

  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("experiment_events").insert({
      key,
      variant,
      kind,
      viewer_cookie: viewer,
      user_id: opts.userId ?? null,
      surface: opts.surface ?? null,
      device: classifyDevice(ua),
      visitor_type: classifyVisitor(viewer),
    });
    // Duplicate-impression / duplicate-conversion is the expected fast path.
    // PostgREST surfaces the 23505 unique-violation in the error body.
    if (error && !error.message.includes("duplicate") && error.code !== "23505") {
      console.warn(`[experiments-track] ${kind} insert failed:`, error.message);
    }
  } catch (err) {
    console.warn(`[experiments-track] ${kind} insert failed:`, err);
  }
}

export async function trackImpression(
  key: ExperimentKey,
  opts: RecordOpts = {}
): Promise<void> {
  return record(key, "impression", opts);
}

export async function trackConversion(
  key: ExperimentKey,
  opts: RecordOpts = {}
): Promise<void> {
  return record(key, "conversion", opts);
}

/** Test seam. */
export function _resetExperimentDedupForTests() {
  inFlightDedup.clear();
}
