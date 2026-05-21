import { NextResponse } from "next/server";
import {
  buildAdminWeeklySummary,
  loadAdminEmails,
  formatAdminSummaryHtml,
  formatAdminSummaryText,
} from "@/lib/email/admin-summary";
import { notifyAdminWeeklySummary } from "@/lib/email/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron entry: /api/cron/admin-weekly-summary (Mon 00:00 UTC = 09:00 KST).
 * Sends the 7-day operations summary to every admin user. Distinct from the
 * client-facing weekly digest in shape and audience — admins want totals and
 * search-gaps, clients want their own projects.
 *
 * Auth: same pattern as the other crons (x-vercel-cron OR Bearer CRON_SECRET).
 */
function authorize(request: Request): boolean {
  const cron = request.headers.get("x-vercel-cron");
  if (cron) return true;
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  return !secret;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://virtual-agency-murex.vercel.app";

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await buildAdminWeeklySummary();
  if (!summary) {
    return NextResponse.json({ skipped: true, reason: "no-summary" });
  }
  const emails = await loadAdminEmails();
  if (emails.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no-admins" });
  }

  const subject = `[Virtual Agency] 주간 운영 요약 — 문의 ${summary.inquiriesCount} · 납품 ${summary.deliveredCount}`;
  const html = formatAdminSummaryHtml(summary, BASE_URL);
  const text = formatAdminSummaryText(summary);

  const results: Array<{ to: string; sent: boolean; reason?: string }> = [];
  for (const to of emails) {
    try {
      const r = await notifyAdminWeeklySummary(to, { subject, html, text });
      results.push({ to, sent: r.ok, reason: r.ok ? undefined : r.error });
    } catch (err) {
      results.push({
        to,
        sent: false,
        reason: err instanceof Error ? err.message : "error",
      });
    }
  }

  return NextResponse.json({
    sent: results.filter((r) => r.sent).length,
    considered: emails.length,
    totals: {
      inquiries: summary.inquiriesCount,
      delivered: summary.deliveredCount,
      revenue30dKrw: summary.revenue30dKrw,
    },
  });
}
