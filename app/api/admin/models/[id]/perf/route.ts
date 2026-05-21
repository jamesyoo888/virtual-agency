import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * Per-model 30d performance — used by the admin model detail sidebar. Pulls
 * just one model's slice of model_views + projects so the page doesn't have
 * to load the full catalog. Admin-only.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({
      views30d: 0,
      inquiries30d: 0,
      delivered30d: 0,
      lastInquiryAt: null,
    });
  }

  const supabase = await createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Three independent counts → one round-trip via Promise.all.
  const [{ count: views }, { data: projectRows }] = await Promise.all([
    supabase
      .from("model_views")
      .select("id", { count: "exact", head: true })
      .eq("model_id", id)
      .gte("created_at", since),
    supabase
      .from("projects")
      .select("status, created_at")
      .eq("model_id", id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const rows = (projectRows as { status: string; created_at: string }[] | null) ?? [];
  const inquiries = rows.length;
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const lastInquiryAt = rows[0]?.created_at ?? null;
  // Smoothed rate matches the catalog-wide model so the sidebar number is
  // comparable to /admin/models/performance.
  const PRIOR_VIEWS = 50;
  const PRIOR_RATE = 0.03;
  const inquiryRate =
    (inquiries + PRIOR_VIEWS * PRIOR_RATE) / ((views ?? 0) + PRIOR_VIEWS);

  return NextResponse.json({
    views30d: views ?? 0,
    inquiries30d: inquiries,
    delivered30d: delivered,
    inquiryRate,
    lastInquiryAt,
  });
}
