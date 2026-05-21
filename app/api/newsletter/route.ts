import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";
import { newsletterSignupSchema } from "@/lib/api/schemas";
import { enforceRateLimit } from "@/lib/api/rate-limit";

function clientIpFrom(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "0.0.0.0";
}

/**
 * Public newsletter signup. Stores the email locally for now — we'll forward
 * to a provider (Resend audiences / Mailerlite) once we pick one. Idempotent
 * on lower(email).
 *
 * Rate-limited per IP at 5/min to discourage list bombing. We don't tie the
 * limit to email because attackers cycle addresses; IP is the most useful
 * signal in the absence of CAPTCHA.
 */
export async function POST(request: Request) {
  const ipDenied = enforceRateLimit({
    key: "newsletter:ip",
    subject: clientIpFrom(request),
    limit: 5,
    windowMs: 60_000,
  });
  if (ipDenied) return ipDenied;

  const parsed = await parseBody(request, newsletterSignupSchema);
  if (!parsed.ok) return parsed.response;

  if (!SUPABASE_CONFIGURED) {
    // Dev mode: pretend success. Logs help the developer notice the form is
    // wired even though nothing is persisted.
    console.info("[newsletter] dev mode — would persist:", parsed.data.email);
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = await createAdminClient();
  const { email, source, utm_source, utm_medium, utm_campaign } = parsed.data;

  // Upsert by lower(email). PostgREST doesn't accept upsert on expression
  // indexes, so we do a manual check-then-insert. Idempotent enough — the
  // unique index will catch a race with a 23505 error which we treat as
  // success.
  const { data: existing } = await supabase
    .from("newsletter_signups")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  const { error } = await supabase.from("newsletter_signups").insert({
    email,
    source: source ?? null,
    utm_source: utm_source ?? null,
    utm_medium: utm_medium ?? null,
    utm_campaign: utm_campaign ?? null,
  });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
