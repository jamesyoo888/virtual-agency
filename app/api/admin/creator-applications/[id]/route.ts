import { NextResponse } from "next/server";
import { requireAdminWithId } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { parseBody } from "@/lib/api/validate";
import { creatorApplicationReviewSchema } from "@/lib/api/schemas";

/**
 * Admin moderation endpoint for creator applications. Approval doesn't
 * automatically grant any model ownership — the admin still wires
 * models.owner_id from the model studio. What approval does is:
 *   1) mark the application reviewed (and by whom)
 *   2) flip clients.role so the visitor can access /creator/onboard's
 *      "approved" panel and (once they own a model) /creator/dashboard.
 *      Today role stays 'client' because /creator gating is owner-based,
 *      not role-based; flipping role would be additive when we add a
 *      `creator` enum value, but for now we leave it alone.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminWithId();
  if (!auth.ok) return auth.response;
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const parsed = await parseBody(request, creatorApplicationReviewSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_applications")
    .update({
      status: parsed.data.status,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason:
        parsed.data.status === "rejected"
          ? parsed.data.rejection_reason ?? null
          : null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
