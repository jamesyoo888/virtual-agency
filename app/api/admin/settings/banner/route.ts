import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseBody } from "@/lib/api/validate";
import { bannerPatchSchema } from "@/lib/api/schemas";
import { getBanner, updateBanner } from "@/lib/banner";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { recordUsage } from "@/lib/cost/store";

export const dynamic = "force-dynamic";

/**
 * GET — current banner (null if unset).
 * PATCH — update or clear banner. Empty `text` clears the banner.
 *
 * Audit trail piggybacks on usage_log with route='audit.banner_update' so
 * we don't need a dedicated audit_log table for low-frequency settings.
 */

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const banner = await getBanner();
  return NextResponse.json(banner);
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = await parseBody(request, bannerPatchSchema);
  if (!parsed.ok) return parsed.response;

  let userId: string | undefined;
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }

  const before = await getBanner();

  try {
    const trimmed = parsed.data.text.trim();
    const next = trimmed
      ? await updateBanner({
          text: trimmed,
          href: parsed.data.href || undefined,
          tone: parsed.data.tone,
        })
      : await updateBanner(null);

    await recordUsage({
      route: "audit.banner_update",
      model: "settings",
      cost_usd: 0,
      user_id: userId ?? null,
      metadata: { before, after: next },
    });

    return NextResponse.json(next);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Banner update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
