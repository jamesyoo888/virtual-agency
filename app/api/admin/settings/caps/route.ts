import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { capsPatchSchema } from "@/lib/api/schemas";
import { updateCapsSetting, getCapsSetting } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { recordUsage } from "@/lib/cost/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/caps — returns current effective caps.
 * PATCH — updates DB caps; env values still fill any remaining nulls.
 *
 * Caps shape: { perCall, daily, weekly, monthly }, each `number | null`.
 * null/empty clears the cap (= unlimited for that window).
 */

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const caps = await getCapsSetting();
  return NextResponse.json(caps);
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await parseBody(request, capsPatchSchema);
  if (!result.ok) return result.response;

  let userId: string | undefined;
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }

  const before = await getCapsSetting();

  try {
    const next = await updateCapsSetting(result.data, userId);
    // Audit trail — reuses the usage_log table (cost=0) so operators can grep
    // for `route='audit.caps_update'` to see every cap change with diff +
    // actor. Avoids a separate audit_log migration for now.
    await recordUsage({
      route: "audit.caps_update",
      model: "settings",
      cost_usd: 0,
      user_id: userId ?? null,
      metadata: { before, after: next, patch: result.data },
    });
    return NextResponse.json(next);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Settings update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
