import { NextResponse } from "next/server";
import {
  buildDigestPayload,
  selectDigestRecipients,
  markDigestSent,
} from "@/lib/email/digest";
import { notifyWeeklyDigest } from "@/lib/email/notify";
import { canEmailClient } from "@/lib/preferences";

export const dynamic = "force-dynamic";
// Cron functions can run longer than the default 10s while we batch sends.
export const maxDuration = 60;

/**
 * Vercel cron entry point. Configured in `vercel.json`:
 *
 *   { "path": "/api/cron/weekly-digest", "schedule": "0 0 * * 1" }
 *
 * (Monday 00:00 UTC = 09:00 KST.)
 *
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>` when the env
 * var is configured. We accept that, or any request from inside the Vercel
 * platform identified by the `x-vercel-cron` header. If neither is present
 * and we're not in dev, we 401.
 *
 * Idempotency: `client_preferences.last_digest_sent_at` blocks any client
 * who received the digest within the last 6 days — so a manual re-trigger
 * or a cron retry doesn't double-send.
 */
function authorize(request: Request): boolean {
  const cron = request.headers.get("x-vercel-cron");
  if (cron) return true;
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  // Local dev convenience — allow when no secret is configured. Once the env
  // var is set in production, this branch never fires.
  return !secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = await selectDigestRecipients();
  const results: Array<{
    clientId: string;
    sent: boolean;
    reason?: string;
  }> = [];

  // Sequential to keep within function CPU/memory budgets and avoid bursting
  // the email provider's per-second cap. Volumes are tiny at MVP scale; once
  // it grows past a few hundred per run, batch via Promise.all in chunks.
  for (const clientId of recipients) {
    try {
      if (!(await canEmailClient(clientId, "weekly_digest"))) {
        results.push({ clientId, sent: false, reason: "opted_out" });
        continue;
      }
      const payload = await buildDigestPayload(clientId);
      if (!payload) {
        results.push({ clientId, sent: false, reason: "no_payload" });
        continue;
      }
      if (!payload.email) {
        results.push({ clientId, sent: false, reason: "no_email" });
        continue;
      }
      // Skip clients with no activity at all — sending an empty digest is
      // worse than silence.
      if (payload.active.length === 0 && payload.deliveredCount === 0) {
        results.push({ clientId, sent: false, reason: "no_activity" });
        // Still mark sent to anchor the next-week window — otherwise we'd
        // re-evaluate the same empty account every cron tick.
        await markDigestSent(clientId);
        continue;
      }
      await notifyWeeklyDigest(
        payload.email,
        {
          clientId,
          clientName: payload.name,
          active: payload.active.map((p) => ({
            id: p.id,
            title: p.title,
            status_ko: p.status_ko,
            status_en: p.status_en,
            modelName: p.modelName,
            isRecent: p.isRecent,
          })),
          recentChangesCount: payload.recentChanges.length,
          deliveredCount: payload.deliveredCount,
        },
        payload.locale
      );
      await markDigestSent(clientId);
      results.push({ clientId, sent: true });
    } catch (err) {
      results.push({
        clientId,
        sent: false,
        reason: err instanceof Error ? err.message : "error",
      });
    }
  }

  return NextResponse.json({
    considered: recipients.length,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
