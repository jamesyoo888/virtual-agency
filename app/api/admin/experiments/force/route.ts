import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import {
  EXPERIMENTS,
  EXPERIMENT_ADMIN_OVERRIDE_COOKIE,
  EXPERIMENT_COOKIE_MAX_AGE,
  cookieNameFor,
} from "@/lib/experiments";

/**
 * Admin dry-run helper. Pins the *requesting* admin's session to a chosen
 * variant by overwriting their experiment cookie. Other users are untouched —
 * this never alters production traffic assignment, just the admin's own
 * sticky bucket.
 *
 * We also set EXPERIMENT_ADMIN_OVERRIDE_COOKIE so the funnel tracker
 * (lib/experiments-track) skips writing impressions/conversions while the
 * admin tests. Otherwise admin manual testing would inflate one variant's
 * counts and silently corrupt the lift readout.
 *
 * Sending { variant: null } clears the override so the admin re-enters the
 * normal traffic pool.
 */

const forceSchema = z.object({
  key: z.string().min(1).max(64),
  variant: z.string().min(1).max(64).nullable(),
});

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, forceSchema);
  if (!parsed.ok) return parsed.response;

  const { key, variant } = parsed.data;
  const def = (EXPERIMENTS as Record<string, { variants: readonly string[] }>)[key];
  if (!def) {
    return NextResponse.json({ error: "Unknown experiment" }, { status: 404 });
  }
  if (variant !== null && !def.variants.includes(variant)) {
    return NextResponse.json({ error: "Unknown variant" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, key, variant });
  if (variant === null) {
    // Drop both cookies — the proxy will assign a fresh bucket on the next
    // navigation, and the override flag stops blocking tracking.
    res.cookies.delete(cookieNameFor(key));
    res.cookies.delete(EXPERIMENT_ADMIN_OVERRIDE_COOKIE);
  } else {
    res.cookies.set(cookieNameFor(key), variant, {
      maxAge: EXPERIMENT_COOKIE_MAX_AGE,
      httpOnly: false, // readable by client-side analytics, matches the proxy
      sameSite: "lax",
      path: "/",
    });
    res.cookies.set(EXPERIMENT_ADMIN_OVERRIDE_COOKIE, "1", {
      maxAge: EXPERIMENT_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
