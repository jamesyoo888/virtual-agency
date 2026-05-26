import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { notifyInquiryFollowup } from "@/lib/email/notify";
import { canEmailClient } from "@/lib/preferences";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_DAYS = 7;
const BATCH_LIMIT = 200;

/**
 * Vercel cron: nudge inquiries that have been sitting in `status='inquiry'`
 * for >= 7 days without a transition. Configured in vercel.json:
 *
 *   { "path": "/api/cron/inquiry-followup", "schedule": "0 1 * * *" }
 *
 * (Daily 01:00 UTC = 10:00 KST — fires before the operator's morning
 * inbox-cleanup so they see fresh nudges first.)
 *
 * At-most-once guarantee: `projects.inquiry_followup_sent_at` (migration 022)
 * is set immediately after the email send returns. Subsequent cron runs skip
 * the row because the index `projects_followup_pending_idx` only includes
 * rows where this column is null.
 *
 * Auth: identical to the other crons (Vercel cron header or CRON_SECRET).
 */
function authorize(request: Request): boolean {
  const cron = request.headers.get("x-vercel-cron");
  if (cron) return true;
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  return !secret;
}

interface StaleRow {
  id: string;
  title: string;
  client_id: string | null;
  created_at: string;
  model?: { name: string | null } | null;
  client?: { email: string | null; name: string | null; locale?: string | null } | null;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ sent: 0, skipped: "supabase not configured" });
  }

  const supabase = await createAdminClient();
  const cutoffIso = new Date(
    Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, title, client_id, created_at, model:models(name), client:clients(email, name, locale)"
    )
    .eq("status", "inquiry")
    .is("inquiry_followup_sent_at", null)
    .lte("created_at", cutoffIso)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    return NextResponse.json(
      { sent: 0, error: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as unknown as StaleRow[];
  const results: Array<{ id: string; sent: boolean; reason?: string }> = [];

  for (const row of rows) {
    try {
      if (!row.client_id) {
        results.push({ id: row.id, sent: false, reason: "no_client" });
        continue;
      }
      if (!row.client?.email) {
        results.push({ id: row.id, sent: false, reason: "no_email" });
        // Mark as "sent" anyway so we don't reconsider every cron tick.
        await supabase
          .from("projects")
          .update({ inquiry_followup_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }
      // Reuse the status_changes preference — same intent (project state
      // nudge). Adding a dedicated column would require another migration
      // and a settings UI row for marginal opt-out granularity.
      if (!(await canEmailClient(row.client_id, "status_changes"))) {
        results.push({ id: row.id, sent: false, reason: "opted_out" });
        await supabase
          .from("projects")
          .update({ inquiry_followup_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }

      const daysSince = Math.floor(
        (Date.now() - new Date(row.created_at).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      const followupLocale: "ko" | "en" =
        (row.client as { locale?: string | null }).locale === "en" ? "en" : "ko";
      const result = await notifyInquiryFollowup(
        row.client.email,
        {
          clientName: row.client.name ?? null,
          modelName: row.model?.name ?? null,
          projectTitle: row.title,
          projectId: row.id,
          daysSinceInquiry: daysSince,
        },
        followupLocale
      );

      // Even on provider failure we record the attempt — the at-most-once
      // guarantee is more important than retrying a flaky transactional
      // email. The operator can re-send manually from /admin/projects/[id].
      await supabase
        .from("projects")
        .update({ inquiry_followup_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      results.push({
        id: row.id,
        sent: !!result.ok,
        reason: result.ok ? undefined : result.error ?? "send_failed",
      });
    } catch (err) {
      results.push({
        id: row.id,
        sent: false,
        reason: err instanceof Error ? err.message : "error",
      });
    }
  }

  return NextResponse.json({
    considered: rows.length,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
