import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { signReferralToken } from "@/lib/referral/token";

/**
 * Mint a referral link for the authenticated client. The link encodes the
 * caller's own client id as the code; sharing it attributes any inquiries
 * that result back to them via the standard utm_campaign pipeline.
 */
export async function POST() {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const code = user.id;
  const token = signReferralToken(code);
  return NextResponse.json({ code, token, path: `/ref/${code}?t=${token}` });
}
