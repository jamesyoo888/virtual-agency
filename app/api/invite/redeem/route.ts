import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

const redeemSchema = z.object({
  token: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const parsed = await parseBody(request, redeemSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("consume_admin_invite", {
    invite_token: parsed.data.token,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ result: data });
}
