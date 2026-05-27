import { cookies, headers } from "next/headers";
import { recordUsage } from "@/lib/cost/store";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Server-side character page-view tracker.
 *
 * Unlike `trackModelView` (which inserts into the `model_views` table for the
 * popularity sort), characters don't yet have catalog rows. We record into
 * `usage_log` with `route='character.view'` and the slug/locale in metadata
 * — admin analytics can sum these without a new table.
 *
 * Cost is always 0, so character traffic never inflates the cost cap. Bot
 * UAs and refresh dedup live behind the same patterns as `track-view.ts`.
 */

const VIEW_COOKIE_NAME = "va_vc";
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  if (!ua) return true;
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

const recentSeen = new Map<string, number>();

function shouldRecord(cookieValue: string, key: string): boolean {
  const composite = `${cookieValue}:${key}`;
  const now = Date.now();
  const last = recentSeen.get(composite);
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  recentSeen.set(composite, now);

  if (recentSeen.size > 2000) {
    for (const [k, t] of recentSeen) {
      if (now - t > DEDUP_WINDOW_MS) recentSeen.delete(k);
    }
  }
  return true;
}

export type CharacterViewLocale = "ko" | "en";

export async function trackCharacterView(
  slug: string,
  locale: CharacterViewLocale
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  const headerStore = await headers();
  const ua = headerStore.get("user-agent");
  if (isBot(ua)) return;

  const cookieStore = await cookies();
  const cookieValue =
    cookieStore.get(VIEW_COOKIE_NAME)?.value ??
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const dedupKey = `character.view:${locale}:${slug}`;
  if (!shouldRecord(cookieValue, dedupKey)) return;

  const referrer = headerStore.get("referer") ?? null;

  try {
    await recordUsage({
      route: "character.view",
      // `model` doubles as the dimensional axis for this row — we slot the
      // character slug here so admin aggregations group by character without
      // unpacking the metadata JSON.
      model: `character:${slug}`,
      cost_usd: 0,
      user_id: null,
      metadata: { slug, locale, referrer },
    });
  } catch (err) {
    console.warn("[track-character-view] insert failed:", err);
  }
}

/** Test seam — clear in-process dedup between unit tests. */
export function _resetCharacterViewDedupForTests() {
  recentSeen.clear();
}

export { isBot, DEDUP_WINDOW_MS, BOT_UA_PATTERNS };
