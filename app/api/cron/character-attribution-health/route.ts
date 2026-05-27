import { NextResponse } from "next/server";
import { loadCharacterAttribution } from "@/lib/analytics/character-attribution";
import { loadAdminEmails } from "@/lib/email/admin-summary";
import { notifyAdminWeeklySummary } from "@/lib/email/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron entry: /api/cron/character-attribution-health (daily, 03:30 UTC).
 *
 * Watches the character IP funnel. When the trailing 7-day window has zero
 * inquiries attributed to utm_source=character it implies either:
 *  - the CTA links got broken in a deploy,
 *  - the character pages are getting traffic but no clicks,
 *  - or the funnel is genuinely cold.
 *
 * The signal is silent in normal operation, so we email admins only when the
 * signal degrades — false positives are cheap, false negatives are not.
 *
 * Auth pattern matches the other crons (x-vercel-cron header in production
 * or Bearer CRON_SECRET when curled).
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

  const sevenDay = await loadCharacterAttribution(7);
  const thirtyDay = await loadCharacterAttribution(30);

  // Only fire when 7d is genuinely zero AND 30d had non-zero traffic. The
  // second gate prevents a daily alert during the warm-up period before any
  // character traffic has accumulated at all.
  const degraded = sevenDay.totalInquiries === 0 && thirtyDay.totalInquiries > 0;

  if (!degraded) {
    return NextResponse.json({
      skipped: true,
      reason: "ok",
      sevenDay: sevenDay.totalInquiries,
      thirtyDay: thirtyDay.totalInquiries,
    });
  }

  const emails = await loadAdminEmails();
  if (emails.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no-admins" });
  }

  const subject = `[Virtual Agency] 캐릭터 attribution 7일 무신호 — 점검 필요`;
  const text = [
    `캐릭터 페이지(/character/[slug], /character/brand-kits) 경유 인콰이어가 7일 동안 0건입니다.`,
    `30일 기준으로는 ${thirtyDay.totalInquiries}건이 들어왔기 때문에 funnel 자체는 살아 있던 것으로 보입니다.`,
    ``,
    `점검 포인트:`,
    `1. /character/* CTA 의 utm_source=character&utm_campaign=... 가 deploy 에서 누락되지 않았는지`,
    `2. /api/og?character=* 가 정상 응답하는지 (소셜 미리보기 깨졌으면 클릭률 0)`,
    `3. RFP/match form 의 utm capture 가 동작하는지 (projects.utm_source 가 character 로 저장되는지)`,
    ``,
    `대시보드: ${BASE_URL}/admin/analytics`,
    `Forecast 페이지: ${BASE_URL}/admin/forecast`,
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;line-height:1.6;max-width:560px;margin:auto;padding:24px">
    <p style="font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px">캐릭터 attribution health</p>
    <h1 style="font-size:20px;margin:0 0 12px">7일 동안 캐릭터 경유 인콰이어 0건</h1>
    <p style="margin:0 0 16px">30일 누계는 <strong>${thirtyDay.totalInquiries}건</strong>이었기 때문에, funnel 자체는 작동하고 있던 신호입니다. 최근 7일 동안의 단절은 다음 중 하나를 의심하세요:</p>
    <ol style="margin:0 0 16px;padding-left:20px">
      <li><code>/character/*</code> CTA 의 <code>utm_source=character&amp;utm_campaign=...</code> deploy 에서 누락 여부</li>
      <li><code>/api/og?character=*</code> 응답 상태 (OG 깨지면 클릭률 급락)</li>
      <li>RFP / match 폼에서 utm capture 가 <code>projects.utm_source</code> 로 저장되는지</li>
    </ol>
    <p style="margin:16px 0">
      <a href="${BASE_URL}/admin/analytics" style="display:inline-block;background:#111;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px">Analytics 대시보드</a>
      &nbsp;
      <a href="${BASE_URL}/admin/forecast" style="display:inline-block;background:#fff;color:#111;border:1px solid #ddd;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px">Forecast 페이지</a>
    </p>
    <p style="font-size:12px;color:#999;margin:24px 0 0">자동 알림 — Virtual Agency cron (character-attribution-health, daily).</p>
  </body></html>`;

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
    alerted: true,
    sent: results.filter((r) => r.sent).length,
    considered: emails.length,
    sevenDay: sevenDay.totalInquiries,
    thirtyDay: thirtyDay.totalInquiries,
  });
}
