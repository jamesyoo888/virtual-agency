import { cookies, headers } from "next/headers";
import { recordUsage } from "@/lib/cost/store";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Server-side blog post view tracker.
 *
 * Mirrors track-character-view: writes to usage_log with route='blog.view'
 * and model='blog:<slug>'. No new table — admin analytics groups by the
 * model field directly. Bot UAs filtered, 1-hour dedup per visitor/post.
 */

const VIEW_COOKIE_NAME = "va_vc";
const DEDUP_WINDOW_MS = 60 * 60 * 1000;

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

export type BlogViewLocale = "ko" | "en";

export async function trackBlogView(
  slug: string,
  locale: BlogViewLocale
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  const headerStore = await headers();
  const ua = headerStore.get("user-agent");
  if (isBot(ua)) return;

  const cookieStore = await cookies();
  const cookieValue =
    cookieStore.get(VIEW_COOKIE_NAME)?.value ??
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const dedupKey = `blog.view:${locale}:${slug}`;
  if (!shouldRecord(cookieValue, dedupKey)) return;

  const referrer = headerStore.get("referer") ?? null;

  try {
    await recordUsage({
      route: "blog.view",
      model: `blog:${slug}`,
      cost_usd: 0,
      user_id: null,
      metadata: { slug, locale, referrer },
    });
  } catch (err) {
    console.warn("[track-blog-view] insert failed:", err);
  }
}

export function _resetBlogViewDedupForTests() {
  recentSeen.clear();
}
