import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { loadAdminEmails } from "@/lib/email/admin-summary";
import { notifyAdminWeeklySummary } from "@/lib/email/notify";
import { wowFromRows } from "@/lib/analytics/week-over-week";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron entry: /api/cron/weekly-trending. Sends admins a Monday-morning
 * digest of the top trending models + WoW deltas, distinct from the
 * existing admin-weekly-summary (which is a broader ops snapshot).
 *
 * Schedule via vercel.json: Mon 02:00 UTC (= 11:00 KST). Reuses the
 * admin email helper so we don't fork the send pipeline. Skips on
 * holidays/quiet-no-data weeks (empty trending list).
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

const KRW = new Intl.NumberFormat("ko-KR");

interface TrendingRow {
  id: string;
  name: string;
  view_count_30d: number;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.json({ skipped: true, reason: "no-supabase" });
  }

  const supabase = await createAdminClient();
  const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: trending }, { data: inqRows }, { data: delRows }] =
    await Promise.all([
      supabase
        .from("models_with_popularity")
        .select("id, name, view_count_30d")
        .eq("status", "active")
        .order("view_count_30d", { ascending: false })
        .gt("view_count_30d", 0)
        .limit(10),
      supabase
        .from("projects")
        .select("created_at")
        .gte("created_at", since14)
        .limit(5000),
      supabase
        .from("projects")
        .select("updated_at, invoice_amount")
        .eq("status", "delivered")
        .gte("updated_at", since14)
        .limit(5000),
    ]);

  const trendingList = (trending as TrendingRow[] | null) ?? [];
  if (trendingList.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no-trending" });
  }

  const inquiriesWow = wowFromRows(
    (inqRows ?? []) as { created_at: string }[]
  );
  const deliveredWow = wowFromRows(
    (delRows ?? []) as { updated_at: string }[],
    { dateField: "updated_at" }
  );
  const revenueWow = wowFromRows(
    (delRows ?? []) as { updated_at: string; invoice_amount: number | null }[],
    { dateField: "updated_at", weighted: true }
  );

  const emails = await loadAdminEmails();
  if (emails.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no-admins" });
  }

  const subject = `[Virtual Agency] 주간 트렌딩 — 상위 ${trendingList.length}개 모델`;
  // Hand-rolled rather than React-email — the digest is small and inline
  // CSS keeps it reliable across mail clients (no JIT compilation).
  const trendingRows = trendingList
    .map(
      (m, i) => `
        <tr>
          <td style="padding:6px 8px;font-family:monospace;color:#71717a">${i + 1}</td>
          <td style="padding:6px 8px"><a href="${BASE_URL}/admin/models/${m.id}" style="color:#10b981;text-decoration:none">${m.name}</a></td>
          <td style="padding:6px 8px;text-align:right;font-family:monospace;color:#a1a1aa">${m.view_count_30d.toLocaleString()} views</td>
        </tr>`
    )
    .join("");

  const fmtPct = (m: ReturnType<typeof wowFromRows>) =>
    m.pct === null ? "—" : `${m.delta >= 0 ? "+" : ""}${m.pct.toFixed(1)}%`;
  const html = `
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:580px;margin:0 auto;color:#18181b">
      <h2 style="font-size:18px;margin:0 0 12px">주간 트렌딩 — ${new Date().toLocaleDateString("ko-KR")}</h2>
      <p style="font-size:13px;color:#52525b;margin:0 0 18px">최근 30일 페이지 뷰 기준 상위 모델 + 지난 7일 vs 그 직전 7일 운영 변화.</p>
      <table style="border-collapse:collapse;width:100%;border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;margin-bottom:18px">
        <thead style="background:#fafafa">
          <tr>
            <th style="text-align:left;padding:8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#71717a">#</th>
            <th style="text-align:left;padding:8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#71717a">모델</th>
            <th style="text-align:right;padding:8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#71717a">30d views</th>
          </tr>
        </thead>
        <tbody>${trendingRows}</tbody>
      </table>
      <h3 style="font-size:14px;margin:0 0 8px">주간 변화 (WoW)</h3>
      <ul style="padding-left:18px;font-size:13px;line-height:1.6;color:#27272a">
        <li>신규 문의 ${inquiriesWow.current.toLocaleString()} (이전주 ${inquiriesWow.previous.toLocaleString()}, ${fmtPct(inquiriesWow)})</li>
        <li>납품 ${deliveredWow.current.toLocaleString()} (이전주 ${deliveredWow.previous.toLocaleString()}, ${fmtPct(deliveredWow)})</li>
        <li>납품 매출 ₩${KRW.format(revenueWow.current)} (이전주 ₩${KRW.format(revenueWow.previous)}, ${fmtPct(revenueWow)})</li>
      </ul>
      <p style="font-size:12px;color:#71717a;margin-top:24px">
        <a href="${BASE_URL}/admin" style="color:#10b981;text-decoration:none">관리자 대시보드 열기 →</a>
      </p>
    </div>
  `;
  const text = `주간 트렌딩 — ${new Date().toLocaleDateString("ko-KR")}

상위 트렌딩 모델 (30d views):
${trendingList.map((m, i) => `  ${i + 1}. ${m.name} — ${m.view_count_30d.toLocaleString()}`).join("\n")}

WoW 변화:
- 신규 문의 ${inquiriesWow.current} (이전주 ${inquiriesWow.previous}, ${fmtPct(inquiriesWow)})
- 납품 ${deliveredWow.current} (이전주 ${deliveredWow.previous}, ${fmtPct(deliveredWow)})
- 매출 ₩${KRW.format(revenueWow.current)} (이전주 ₩${KRW.format(revenueWow.previous)}, ${fmtPct(revenueWow)})

관리자 대시보드: ${BASE_URL}/admin`;

  const results = await Promise.all(
    emails.map(async (to) => {
      try {
        const r = await notifyAdminWeeklySummary(to, { subject, html, text });
        return { to, sent: r.ok };
      } catch {
        return { to, sent: false };
      }
    })
  );

  return NextResponse.json({
    sent: results.filter((r) => r.sent).length,
    considered: emails.length,
    trendingCount: trendingList.length,
  });
}
