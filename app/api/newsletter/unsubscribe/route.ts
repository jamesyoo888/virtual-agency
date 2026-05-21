import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { verifyUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";

/**
 * One-click unsubscribe. Idempotent — repeat hits return 200 without
 * re-touching the row. We accept GET so it works from a plain `<a href>`
 * in a transactional email, but we still verify the HMAC, so a stolen URL
 * can only unsubscribe the bound address.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("e")?.trim().toLowerCase() ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json(
      { error: "Invalid unsubscribe link." },
      { status: 400 }
    );
  }

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from("newsletter_signups")
    .select("id, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();

  if (!existing) {
    // Treat as success — the address isn't on our list, which is the user's
    // desired end-state anyway.
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:48px;background:#000;color:#fff;text-align:center">구독 해지되었습니다.</body>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!existing.unsubscribed_at) {
    await supabase
      .from("newsletter_signups")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:48px;background:#000;color:#fff;text-align:center">구독 해지되었습니다. 그동안 감사드립니다.</body>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
