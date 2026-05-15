import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { modelBulkStatusSchema } from "@/lib/api/schemas";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, modelBulkStatusSchema);
  if (!parsed.ok) return parsed.response;

  const { ids, status } = parsed.data;

  if (!SUPABASE_CONFIGURED) {
    for (const id of ids) devModelStore.update(id, { status });
    return NextResponse.json({ updated: ids.length });
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("models")
    .update({ status })
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: (data ?? []).length });
}
