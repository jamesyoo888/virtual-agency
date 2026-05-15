import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { projectBulkStatusSchema } from "@/lib/api/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Bulk status sweep for the admin inbox. Caps the batch at 100 so a runaway
 * client can't ask Postgres to lock the entire table in one request.
 *
 * Email/webhook notifications are intentionally *not* fired for bulk
 * transitions — the volume would spam clients and the operator usually runs
 * this for housekeeping (e.g., re-categorize stale inquiries). Per-row
 * notifications still fire from the single-project PATCH.
 */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, projectBulkStatusSchema);
  if (!parsed.ok) return parsed.response;

  const { ids, status } = parsed.data;

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: (data ?? []).length });
}
