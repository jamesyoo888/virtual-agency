import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { signQuoteToken } from "@/lib/quote/share-token";

/**
 * Mint a share token for the caller's own quote. The caller must be the
 * project's owner — we verify ownership through Supabase RLS by selecting
 * the row under the authenticated session.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("client_id", user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const token = signQuoteToken(id);
  return NextResponse.json({ token, path: `/quote/share/${id}?t=${token}` });
}
