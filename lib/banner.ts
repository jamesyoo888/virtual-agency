/**
 * Site-wide announcement banner config. Backed by `app_settings.banner` (JSONB,
 * migration 023). Reads are public — the showcase layout renders the banner
 * without an auth check — so the row goes through the *anon* client and any
 * RLS misconfiguration just shows no banner rather than an error.
 *
 * Writes are admin-only via `/api/admin/settings/banner`, which calls
 * `updateBanner` from a route handler holding the service role key.
 *
 * Dismissal: handled client-side via a cookie keyed on `updated_at`. Changing
 * the text bumps the timestamp and the dismissal naturally invalidates.
 */

import { cache } from "react";
import { createClient as createAnonClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export type BannerTone = "info" | "warn" | "promo";

export interface BannerConfig {
  text: string;
  href?: string;
  tone?: BannerTone;
  updated_at: string;
}

const TONES: Set<BannerTone> = new Set(["info", "warn", "promo"]);

function normalize(raw: unknown): BannerConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === "string" ? r.text.trim() : "";
  if (!text) return null;
  const tone = typeof r.tone === "string" && TONES.has(r.tone as BannerTone)
    ? (r.tone as BannerTone)
    : "info";
  const href = typeof r.href === "string" && r.href.trim() ? r.href.trim() : undefined;
  const updated_at =
    typeof r.updated_at === "string" ? r.updated_at : new Date().toISOString();
  return { text, href, tone, updated_at };
}

/**
 * Server-side reader. Cached for the duration of a single render so multiple
 * call sites (header + skip-link + layout wrapper) share one query.
 */
export const getBanner = cache(async (): Promise<BannerConfig | null> => {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const supabase = await createAnonClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("banner")
      .eq("id", true)
      .maybeSingle();
    if (error) return null;
    return normalize(data?.banner);
  } catch {
    return null;
  }
});

export async function updateBanner(
  patch: { text: string; href?: string; tone?: BannerTone } | null
): Promise<BannerConfig | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createAdminClient();
  if (!patch || !patch.text.trim()) {
    await supabase
      .from("app_settings")
      .update({ banner: null, updated_at: new Date().toISOString() })
      .eq("id", true);
    return null;
  }
  const next: BannerConfig = {
    text: patch.text.trim(),
    href: patch.href?.trim() || undefined,
    tone: patch.tone && TONES.has(patch.tone) ? patch.tone : "info",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("app_settings")
    .update({ banner: next, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);
  return next;
}

/**
 * Dismissal cookie name. The value is the `updated_at` the visitor dismissed,
 * so a fresh banner reappears even if the cookie persists.
 */
export const BANNER_DISMISS_COOKIE = "va_banner_dismissed";
