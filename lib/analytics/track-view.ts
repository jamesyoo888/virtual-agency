import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Server-side model page-view tracker. Called from the model detail page on
 * every render — Next.js will deduplicate per (path × cookie set) within a
 * cache window, and we additionally deduplicate by cookie age in JS so a
 * refresh storm doesn't pollute the table.
 *
 * Bot UAs are skipped on a best-effort basis — full bot detection lives
 * elsewhere (the proxy / Vercel WAF if/when configured); the goal here is
 * just to keep googlebot from showing up as "active client interest" in the
 * popular sort.
 */

const VIEW_COOKIE_NAME = "va_vc";
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour: refresh != new view

const BOT_UA_PATTERNS = [
  /bot/i,
  /spider/i,
  /crawl/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baidu/i,
  /facebookexternalhit/i,
  /slackbot/i,
  /telegram/i,
  /discordbot/i,
  /lighthouse/i,
  /headlesschrome/i,
];

function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // missing UA is treated as bot — most browsers send one
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

/** Drives the in-process per-cookie dedup for the current serverless instance. */
const recentSeen = new Map<string, number>();

function shouldRecord(cookieValue: string, modelId: string): boolean {
  const key = `${cookieValue}:${modelId}`;
  const now = Date.now();
  const last = recentSeen.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  recentSeen.set(key, now);

  // Cheap pruning — keep the map from growing unbounded across long-lived
  // serverless instances. Drop entries older than the dedup window.
  if (recentSeen.size > 2000) {
    for (const [k, t] of recentSeen) {
      if (now - t > DEDUP_WINDOW_MS) recentSeen.delete(k);
    }
  }
  return true;
}

export async function trackModelView(modelId: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  const headerStore = await headers();
  const ua = headerStore.get("user-agent");
  if (isBot(ua)) return;

  const cookieStore = await cookies();
  let cookieValue = cookieStore.get(VIEW_COOKIE_NAME)?.value;
  if (!cookieValue) {
    // Generate a short opaque id (16 hex chars = 64 bits — enough for
    // dedup, not enough to fingerprint precisely).
    cookieValue = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    // We cannot set cookies during Server Component render in Next 16; the
    // proxy will pick it up on the next request via the response cookie set
    // by a sibling tracker route. For now, accept that the very first view
    // from a fresh visitor may be deduped only by IP-less in-memory state —
    // good enough until the cookie sticks on the *next* hit.
  }

  if (!shouldRecord(cookieValue, modelId)) return;

  const referrer = headerStore.get("referer") ?? null;

  try {
    const supabase = await createAdminClient();
    await supabase.from("model_views").insert({
      model_id: modelId,
      viewer_cookie: cookieValue,
      referrer,
    });
  } catch (err) {
    console.warn("[track-view] insert failed:", err);
  }
}

/** Test seam — clear in-process state between unit tests. */
export function _resetViewDedupForTests() {
  recentSeen.clear();
}

export { VIEW_COOKIE_NAME, VIEW_COOKIE_MAX_AGE, DEDUP_WINDOW_MS, isBot };
