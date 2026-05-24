import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { aggregateSearchRows } from "@/lib/analytics/search-log";
import {
  computeAtRiskClients,
  computeCohortRetention,
  cohortWindowMature,
  type ClientRetentionProjectRow,
} from "@/lib/analytics/client-retention";
import { loadPipelineVelocity } from "@/lib/analytics/pipeline-velocity";
import { loadStageTiming, type TimedStage } from "@/lib/analytics/stage-timing";

/**
 * 7-day operations summary sent to every admin every Monday morning (KST 09:00).
 * Aggregates the data points operators check first thing on Monday so the inbox
 * itself becomes the dashboard for low-friction ops review.
 */
export interface AdminWeeklySummary {
  windowStart: string;
  windowEnd: string;
  inquiriesCount: number;
  inquiriesNoFollowup: number;
  deliveredCount: number;
  inFlightCount: number;
  newsletterSignups: number;
  pendingReviews: number;
  topSearches: { q: string; count: number; avgResults: number }[];
  zeroResultSearches: { q: string; count: number }[];
  revenue30dKrw: number;
  /** Count of clients with ≥2 delivered projects, silent ≥60d. */
  atRiskCount: number;
  /** Lifetime revenue of those at-risk clients — represents the LTV in jeopardy. */
  atRiskLtvKrw: number;
  /**
   * Average 90d repeat-delivery rate across MATURE cohorts only (windows
   * whose 90-day clock has fully elapsed). null when no mature cohorts.
   */
  retention90dPct: number | null;
  /** Number of mature cohorts the retention pct was computed over. */
  retention90dCohortCount: number;
  /**
   * 90-day inquiry→delivered lead-time stats. Median + p90 (in days) + the
   * number of deliveries in the window. Nulls when the window is empty or
   * too small to publish p90 (n<5).
   */
  velocityMedianDays: number | null;
  velocityP90Days: number | null;
  velocityCount: number;
  /**
   * Slowest stage by median dwell time, plus its median in days. Surfaces
   * where the calendar is actually being spent so the operator can target
   * follow-ups. Null when no stage has enough data to publish.
   */
  bottleneckStage: TimedStage | null;
  bottleneckMedianDays: number | null;
}

interface SearchLogRow {
  metadata: { q?: string; results?: number } | null;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function buildAdminWeeklySummary(): Promise<AdminWeeklySummary | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const supabase = await createClient();
    const sevenAgo = isoDaysAgo(7);
    const thirtyAgo = isoDaysAgo(30);
    const nowIso = new Date().toISOString();

    // 18 months covers both at-risk silence detection (60d) and the longest
    // cohort window (180d) without a second query.
    const since18mo = isoDaysAgo(18 * 30);

    const [
      inquiries,
      inquiriesNoFollowup,
      delivered,
      inFlight,
      signups,
      pendingReviews,
      searchRows,
      revenueRows,
      retentionRows,
      velocity,
      stageTiming,
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "inquiry")
        .gte("created_at", sevenAgo),
      // Stale inquiry candidates: 7+ days in inquiry status without followup
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "inquiry")
        .lt("created_at", sevenAgo)
        .is("inquiry_followup_sent_at", null),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("updated_at", sevenAgo),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .in("status", ["brief_received", "in_progress", "review"]),
      supabase
        .from("newsletter_signups")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenAgo),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("usage_log")
        .select("metadata")
        .eq("route", "search.catalog")
        .gte("created_at", sevenAgo)
        .limit(5000),
      supabase
        .from("projects")
        .select("invoice_amount, status, updated_at")
        .eq("status", "delivered")
        .gte("updated_at", thirtyAgo)
        .limit(1000),
      supabase
        .from("projects")
        .select("client_id, invoice_amount, updated_at")
        .eq("status", "delivered")
        .gte("updated_at", since18mo)
        .limit(10_000),
      loadPipelineVelocity(90),
      loadStageTiming(90),
    ]);

    const searchAgg = aggregateSearchRows(
      ((searchRows.data ?? []) as SearchLogRow[]).map((r) => ({
        q: r.metadata?.q ?? "",
        results: typeof r.metadata?.results === "number" ? r.metadata.results : 0,
      })),
      5
    );

    const revenue30dKrw = ((revenueRows.data ?? []) as { invoice_amount: number | null }[])
      .reduce((sum, r) => sum + (typeof r.invoice_amount === "number" ? r.invoice_amount : 0), 0);

    const retentionFlat: ClientRetentionProjectRow[] = (
      (retentionRows.data ?? []) as {
        client_id: string | null;
        invoice_amount: number | null;
        updated_at: string;
      }[]
    ).map((r) => ({
      client_id: r.client_id,
      invoice_amount: r.invoice_amount,
      delivered_at: r.updated_at,
    }));
    const atRiskList = computeAtRiskClients(retentionFlat, {
      minDelivered: 2,
      silentDays: 60,
      limit: 100, // upper bound for digest counting; UI cap is separate
    });
    const cohortList = computeCohortRetention(retentionFlat, { months: 6 });
    const matureCohorts = cohortList.filter(
      (c) => c.size > 0 && cohortWindowMature(c.cohortMonth, 90)
    );
    const retention90dPct =
      matureCohorts.length > 0
        ? matureCohorts.reduce((s, c) => s + (c.repeat90dRate ?? 0), 0) /
          matureCohorts.length
        : null;

    return {
      windowStart: sevenAgo,
      windowEnd: nowIso,
      inquiriesCount: inquiries.count ?? 0,
      inquiriesNoFollowup: inquiriesNoFollowup.count ?? 0,
      deliveredCount: delivered.count ?? 0,
      inFlightCount: inFlight.count ?? 0,
      newsletterSignups: signups.count ?? 0,
      pendingReviews: pendingReviews.count ?? 0,
      topSearches: searchAgg.top.slice(0, 5).map((t) => ({
        q: t.q,
        count: t.count,
        avgResults: t.avgResults,
      })),
      zeroResultSearches: searchAgg.zero.slice(0, 5).map((t) => ({
        q: t.q,
        count: t.zeroResultCount,
      })),
      revenue30dKrw,
      atRiskCount: atRiskList.length,
      atRiskLtvKrw: atRiskList.reduce((s, c) => s + c.totalRevenue, 0),
      retention90dPct,
      retention90dCohortCount: matureCohorts.length,
      velocityMedianDays: velocity.medianDays,
      velocityP90Days: velocity.p90Days,
      velocityCount: velocity.n,
      bottleneckStage: stageTiming.slowestStage,
      bottleneckMedianDays:
        stageTiming.slowestStage !== null
          ? stageTiming.buckets.find(
              (b) => b.stage === stageTiming.slowestStage
            )?.medianDays ?? null
          : null,
    };
  } catch (err) {
    console.warn("[admin-summary] build failed:", err);
    return null;
  }
}

export async function loadAdminEmails(): Promise<string[]> {
  if (!SUPABASE_CONFIGURED) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clients")
      .select("email")
      .eq("role", "admin")
      .not("email", "is", null);
    return ((data ?? []) as { email: string | null }[])
      .map((c) => c.email!)
      .filter((e) => /.+@.+\..+/.test(e));
  } catch (err) {
    console.warn("[admin-summary] admin email lookup failed:", err);
    return [];
  }
}

/**
 * Pure formatter — broken out so tests can verify the rendering without a DB.
 */
export function formatAdminSummaryText(s: AdminWeeklySummary): string {
  const lines: string[] = [];
  lines.push("Virtual Agency — 주간 운영 요약 (지난 7일)");
  lines.push("");
  lines.push(`신규 문의: ${s.inquiriesCount}`);
  lines.push(`팔로업 필요 (7일 이상 stale): ${s.inquiriesNoFollowup}`);
  lines.push(`납품 완료: ${s.deliveredCount}`);
  lines.push(`진행 중 (브리프~검토): ${s.inFlightCount}`);
  lines.push(`뉴스레터 신규 구독: ${s.newsletterSignups}`);
  lines.push(`대기 중인 리뷰 모더레이션: ${s.pendingReviews}`);
  lines.push(`30일 매출 (납품 견적 합): ₩${s.revenue30dKrw.toLocaleString("ko-KR")}`);
  if (s.atRiskCount > 0) {
    lines.push(
      `LTV at-risk 광고주: ${s.atRiskCount}건 / 누적 ₩${s.atRiskLtvKrw.toLocaleString("ko-KR")} (2건+ 납품, 60일+ 침묵)`
    );
  }
  if (s.retention90dPct !== null) {
    lines.push(
      `90일 재구매율 (mature ${s.retention90dCohortCount}개 코호트 평균): ${(s.retention90dPct * 100).toFixed(0)}%`
    );
  }
  if (s.velocityCount > 0 && s.velocityMedianDays !== null) {
    const p90 =
      s.velocityP90Days !== null
        ? ` · p90 ${s.velocityP90Days.toFixed(1)}d`
        : "";
    lines.push(
      `납품 lead time (90d, inquiry→delivered): 중앙값 ${s.velocityMedianDays.toFixed(1)}d${p90} · ${s.velocityCount}건`
    );
  }
  if (s.bottleneckStage !== null && s.bottleneckMedianDays !== null) {
    const stageLabel: Record<string, string> = {
      inquiry: "문의",
      brief_received: "브리프",
      in_progress: "제작",
      review: "검토",
    };
    lines.push(
      `병목 단계: ${stageLabel[s.bottleneckStage] ?? s.bottleneckStage} (중앙값 ${s.bottleneckMedianDays.toFixed(1)}d)`
    );
  }
  lines.push("");
  if (s.topSearches.length > 0) {
    lines.push("인기 검색어 (7일):");
    for (const t of s.topSearches) {
      lines.push(`  - ${t.q} (${t.count}회, 평균 결과 ${t.avgResults})`);
    }
    lines.push("");
  }
  if (s.zeroResultSearches.length > 0) {
    lines.push("0결과 검색어 (콘텐츠 갭):");
    for (const t of s.zeroResultSearches) {
      lines.push(`  - ${t.q} (${t.count}회)`);
    }
    lines.push("");
  }
  lines.push("관리자 페이지: /admin");
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAdminSummaryHtml(s: AdminWeeklySummary, baseUrl: string): string {
  const stat = (label: string, value: string | number) =>
    `<div style="display:inline-block;min-width:160px;margin:0 16px 12px 0"><div style="color:#71717a;font-size:11px;letter-spacing:.1em;text-transform:uppercase">${escapeHtml(label)}</div><div style="color:#fafafa;font-size:22px;font-weight:600;margin-top:2px">${escapeHtml(String(value))}</div></div>`;
  const list = (items: { q: string; n: number | string }[]) =>
    items.length === 0
      ? `<p style="color:#71717a;font-size:13px">없음</p>`
      : `<ul style="padding-left:18px;margin:0;color:#d4d4d8">${items
          .map(
            (i) =>
              `<li style="font-size:13px;margin:4px 0"><span style="color:#fafafa">${escapeHtml(i.q)}</span> <span style="color:#71717a">— ${escapeHtml(String(i.n))}</span></li>`
          )
          .join("")}</ul>`;
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>Virtual Agency 주간 요약</title></head>
<body style="margin:0;padding:24px;background:#0a0a0a;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:28px;">
    <h2 style="margin:0 0 4px;color:#fafafa">주간 운영 요약</h2>
    <p style="margin:0 0 20px;color:#a1a1aa;font-size:13px">지난 7일 핵심 지표</p>
    <div style="margin-bottom:20px">
      ${stat("신규 문의", s.inquiriesCount)}
      ${stat("팔로업 필요", s.inquiriesNoFollowup)}
      ${stat("납품 완료", s.deliveredCount)}
      ${stat("진행 중", s.inFlightCount)}
      ${stat("뉴스레터", s.newsletterSignups)}
      ${stat("대기 리뷰", s.pendingReviews)}
      ${stat("30일 매출", `₩${s.revenue30dKrw.toLocaleString("ko-KR")}`)}
      ${s.atRiskCount > 0 ? stat("LTV at-risk", `${s.atRiskCount}건`) : ""}
      ${
        s.retention90dPct !== null
          ? stat("90일 재구매율", `${(s.retention90dPct * 100).toFixed(0)}%`)
          : ""
      }
      ${
        s.velocityCount > 0 && s.velocityMedianDays !== null
          ? stat(
              "납품 lead time (중앙값)",
              `${s.velocityMedianDays.toFixed(1)}d`
            )
          : ""
      }
      ${
        s.bottleneckStage !== null && s.bottleneckMedianDays !== null
          ? stat(
              "병목 단계",
              `${
                {
                  inquiry: "문의",
                  brief_received: "브리프",
                  in_progress: "제작",
                  review: "검토",
                }[s.bottleneckStage] ?? s.bottleneckStage
              } ${s.bottleneckMedianDays.toFixed(1)}d`
            )
          : ""
      }
    </div>
    <h3 style="margin:24px 0 8px;font-size:14px;color:#fafafa">인기 검색어</h3>
    ${list(s.topSearches.map((t) => ({ q: t.q, n: `${t.count}회 · 평균 ${t.avgResults}` })))}
    <h3 style="margin:24px 0 8px;font-size:14px;color:#fafafa">0결과 검색어 (콘텐츠 갭)</h3>
    ${list(s.zeroResultSearches.map((t) => ({ q: t.q, n: `${t.count}회` })))}
    <hr style="border:0;border-top:1px solid #27272a;margin:24px 0">
    <p style="margin:0"><a href="${escapeHtml(baseUrl)}/admin" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Admin 대시보드 열기</a></p>
  </div>
</body></html>`;
}
