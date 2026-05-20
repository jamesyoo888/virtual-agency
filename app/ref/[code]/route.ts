import { NextResponse } from "next/server";
import { verifyReferralToken } from "@/lib/referral/token";

/**
 * Referral landing — `/ref/<code>?t=<token>&next=/models/abc`
 *
 * Verifies the HMAC token bound to `<code>` (the referring client_id),
 * then 302s to the next URL (or root) with utm params appended so the
 * existing client-side attribution snapshot picks them up on the
 * landing render.
 *
 * Invalid tokens still redirect (UX preference: silently drop attribution
 * rather than 404 on a shared link), but skip the utm params so the
 * downstream funnel doesn't get polluted with unverified referrals.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("t") ?? "";
  const nextRaw = searchParams.get("next") ?? "/";

  // Only allow internal relative paths so we can't be turned into an open
  // redirector. Tokens like "//evil.com" parse as absolute — reject anything
  // that doesn't begin with a single slash and a path character.
  const next = /^\/[A-Za-z0-9_\-./?=&%#:]*$/.test(nextRaw) ? nextRaw : "/";

  const destination = new URL(next, origin);

  if (/^[A-Za-z0-9_-]{1,64}$/.test(code) && verifyReferralToken(code, token)) {
    // Don't overwrite an explicit utm already in the next URL — the caller
    // likely meant to attribute to that campaign instead.
    if (!destination.searchParams.has("utm_source")) {
      destination.searchParams.set("utm_source", "referral");
      destination.searchParams.set("utm_medium", "link");
      destination.searchParams.set("utm_campaign", code);
    }
  }

  return NextResponse.redirect(destination, 302);
}
