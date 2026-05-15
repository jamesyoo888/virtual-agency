import { NextResponse } from "next/server";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { reviewModerateSchema } from "@/lib/api/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Admin moderation — approve or reject a pending review. Records the
 * moderator and a timestamp so we have an audit trail; rejected reviews stay
 * in the table for accountability but are filtered out of public queries by
 * the RLS policy.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminWithId();
  if (!gate.ok) return gate.response;

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const parsed = await parseBody(request, reviewModerateSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .update({
      status: parsed.data.status,
      rejection_reason:
        parsed.data.status === "rejected"
          ? parsed.data.rejection_reason ?? null
          : null,
      reviewed_by: gate.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
