import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";
import { creatorApplicationSchema } from "@/lib/api/schemas";

/**
 * Creator application — the public side of /creator/onboard. Insert-or-update
 * the caller's single row, then return the current state.
 *
 * Why upsert instead of insert: the unique constraint on client_id makes a
 * second insert a 23505. We treat resubmits as "update" rather than 409
 * because the typical flow is "submitted → admin asked for more info →
 * resubmits". The status resets to `pending` on resubmit so the reviewer
 * sees the new content.
 */
export async function POST(request: Request) {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, creatorApplicationSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabase
    .from("creator_applications")
    .upsert(
      {
        client_id: user.id,
        display_name: parsed.data.display_name,
        bio: parsed.data.bio ?? null,
        portfolio_url: parsed.data.portfolio_url || null,
        instagram_handle: parsed.data.instagram_handle ?? null,
        notes: parsed.data.notes ?? null,
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      },
      { onConflict: "client_id" }
    )
    .select("id, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("creator_applications")
    .select("*")
    .eq("client_id", user.id)
    .maybeSingle();
  return NextResponse.json({ application: data });
}
