import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { summarizeUsage, recentUsage } from "@/lib/cost/store";
import { getBanner } from "@/lib/banner";
import { loadResponseSla } from "@/lib/analytics/response-sla";
import { loadModelPerformance } from "@/lib/analytics/model-performance";
import { loadPipelineVelocity } from "@/lib/analytics/pipeline-velocity";
import { loadStageTiming } from "@/lib/analytics/stage-timing";
import { loadBlogViews } from "@/lib/analytics/blog-views";
import { loadBlogAttribution } from "@/lib/analytics/blog-attribution";
import { loadCharacterViews } from "@/lib/analytics/character-views";
import { loadCharacterAttribution } from "@/lib/analytics/character-attribution";
import { loadPricingCalculatorAttribution } from "@/lib/analytics/pricing-calculator-attribution";
import { BLOG_SERIES } from "@/lib/blog/series";
import { getPostBySlug } from "@/lib/blog/posts";
import {
  computeAtRiskClients,
  computeCohortRetention,
  cohortWindowMature,
  type ClientRetentionProjectRow,
} from "@/lib/analytics/client-retention";
import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Health — Virtual Agency Admin" };

interface Pulse {
  inquiries24h: number;
  delivered24h: number;
  newProjects24h: number;
  revenue24h: number;
  experimentEvents24h: number;
  inquiries7d: number;
  delivered7d: number;
  newsletterActive: number;
  newsletter7d: number;
}

async function loadPulse(): Promise<Pulse | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const supabase = await createClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    inquiries24h,
    delivered24h,
    newProjects24h,
    revenueRows,
    expEvents24h,
    inquiries7d,
    delivered7d,
    newsletterActive,
    newsletter7d,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "inquiry")
      .gte("created_at", since24h),
    supabase
      .from("project_status_history")
      .select("id", { count: "exact", head: true })
      .eq("to_status", "delivered")
      .gte("changed_at", since24h),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("projects")
      .select("invoice_amount")
      .eq("status", "delivered")
      .gte("updated_at", since24h),
    supabase
      .from("experiment_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "inquiry")
      .gte("created_at", since7d),
    supabase
      .from("project_status_history")
      .select("id", { count: "exact", head: true })
      .eq("to_status", "delivered")
      .gte("changed_at", since7d),
    supabase
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true })
      .is("unsubscribed_at", null),
    supabase
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
  ]);

  const revenue24h = ((revenueRows.data ?? []) as Array<{
    invoice_amount: number | null;
  }>).reduce((sum, r) => sum + (r.invoice_amount ?? 0), 0);

  return {
    inquiries24h: inquiries24h.count ?? 0,
    delivered24h: delivered24h.count ?? 0,
    newProjects24h: newProjects24h.count ?? 0,
    revenue24h,
    experimentEvents24h: expEvents24h.count ?? 0,
    inquiries7d: inquiries7d.count ?? 0,
    delivered7d: delivered7d.count ?? 0,
    newsletterActive: newsletterActive.count ?? 0,
    newsletter7d: newsletter7d.count ?? 0,
  };
}

const KRW = new Intl.NumberFormat("ko-KR");

function trendBadge(today: number, avg7d: number): {
  label: string;
  tone: string;
} {
  const dailyAvg = avg7d / 7;
  if (dailyAvg < 0.5)
    return { label: "기준 데이터 부족", tone: "text-zinc-500" };
  const ratio = today / dailyAvg;
  if (ratio >= 1.4) return { label: "▲ 평소보다 활발", tone: "text-emerald-400" };
  if (ratio >= 0.7) return { label: "● 정상", tone: "text-zinc-400" };
  return { label: "▼ 평소보다 조용", tone: "text-amber-400" };
}

interface RetentionHealth {
  atRiskCount: number;
  payingClientCount: number;
  atRiskShare: number;
  retention90dPct: number | null;
  matureCohortCount: number;
}

async function loadRetentionHealth(): Promise<RetentionHealth | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const supabase = await createClient();
    const since18mo = new Date(
      Date.now() - 18 * 30 * 86_400_000
    ).toISOString();
    const { data } = await supabase
      .from("projects")
      .select("client_id, invoice_amount, updated_at")
      .eq("status", "delivered")
      .gte("updated_at", since18mo)
      .limit(10_000);
    type Row = {
      client_id: string | null;
      invoice_amount: number | null;
      updated_at: string;
    };
    const rows = ((data ?? []) as Row[]).map<ClientRetentionProjectRow>((r) => ({
      client_id: r.client_id,
      invoice_amount: r.invoice_amount,
      delivered_at: r.updated_at,
    }));
    const atRisk = computeAtRiskClients(rows, {
      minDelivered: 2,
      silentDays: 60,
      limit: 1000,
    });
    // "Paying clients" denominator = distinct client_ids with at least one
    // delivered project in the window. This is the same population the at-risk
    // computation is checking against — so the share is meaningful.
    const payingIds = new Set(
      rows.filter((r) => r.client_id).map((r) => r.client_id!)
    );
    const cohorts = computeCohortRetention(rows, { months: 6 });
    const mature = cohorts.filter(
      (c) => c.size > 0 && cohortWindowMature(c.cohortMonth, 90)
    );
    const retention90dPct =
      mature.length > 0
        ? mature.reduce((s, c) => s + (c.repeat90dRate ?? 0), 0) /
          mature.length
        : null;
    return {
      atRiskCount: atRisk.length,
      payingClientCount: payingIds.size,
      atRiskShare: payingIds.size > 0 ? atRisk.length / payingIds.size : 0,
      retention90dPct,
      matureCohortCount: mature.length,
    };
  } catch {
    return null;
  }
}

async function loadTrendingEngine(): Promise<{
  modelsWithViews: number;
  totalActive: number;
} | null> {
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const supabase = await createClient();
    const [{ count: withViews }, { count: totalActive }] = await Promise.all([
      supabase
        .from("models_with_popularity")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("view_count_30d", 0),
      supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);
    return {
      modelsWithViews: withViews ?? 0,
      totalActive: totalActive ?? 0,
    };
  } catch {
    return null;
  }
}

export default async function AdminHealthPage() {
  const [
    pulse,
    cost,
    recent,
    banner,
    sla,
    perf,
    trending,
    retention,
    velocity,
    stageTiming,
    blogViews30d,
    blogAttr30d,
    charViews30d,
    charAttr30d,
    pricingCalc30d,
  ] = await Promise.all([
      loadPulse(),
      summarizeUsage(),
      recentUsage(10),
      getBanner(),
      loadResponseSla(30),
      loadModelPerformance(30),
      loadTrendingEngine(),
      loadRetentionHealth(),
      loadPipelineVelocity(90),
      loadStageTiming(90),
      loadBlogViews(30),
      loadBlogAttribution(30),
      loadCharacterViews(30),
      loadCharacterAttribution(30),
      loadPricingCalculatorAttribution(30),
    ]);

  // Bottleneck = slowest stage's median exceeds 14d. We check the SLOWEST
  // stage rather than every stage because surfacing N checks for the same
  // metric is noise; the operator already sees the per-stage breakdown on
  // /admin/forecast and only needs a binary signal here.
  const STAGE_RUNBOOK: Record<string, string> = {
    inquiry:
      "inquiry 단계가 길다는 것은 응답 SLA 가 작동하지만 lead 가 답이 안 오는 것. /admin/inbox?stale=1 의 24h+ 인콰이어 따라 메시지 1통 더 시도",
    brief_received:
      "브리프 단계 정체 = 광고주가 스코프/가격 결정 못 함. inline quote 편집기에서 견적 명확히 + outreach mailto 로 결정 push",
    in_progress:
      "제작 단계 정체 = capacity 부족 또는 reference 부재. /admin/projects/[id] 내부 노트로 상황 확인 후 우선순위 재조정 또는 일정 협의",
    review:
      "검토 단계 정체 = 광고주 측 사인오프 지연. follow-up cron 작동 확인 + outreach mailto 로 결정 요청",
  };
  const slowestBucket =
    stageTiming.slowestStage !== null
      ? stageTiming.buckets.find((b) => b.stage === stageTiming.slowestStage)
      : null;
  const STAGE_LABEL_HEALTH: Record<string, string> = {
    inquiry: "문의",
    brief_received: "브리프",
    in_progress: "제작",
    review: "검토",
  };

  // Underperformers — models with at least 500 views in the window AND an
  // inquiry rate below half of the catalog average. Surfaces models that are
  // collecting attention but not converting — the cheapest catalog hygiene
  // win available.
  const catalogAvgRate =
    perf.totalViews > 0 ? perf.totalInquiries / perf.totalViews : 0;
  const underperformers = perf.rows
    .filter((r) => r.views >= 500 && r.inquiryRate < catalogAvgRate / 2)
    .slice(0, 5);

  const checks: {
    label: string;
    ok: boolean;
    detail: string;
    runbook?: string;
  }[] = [
    {
      label: "Supabase 연결",
      ok: SUPABASE_CONFIGURED && pulse !== null,
      detail: SUPABASE_CONFIGURED
        ? pulse
          ? "쿼리 성공"
          : "쿼리 실패 — 로그 확인"
        : "미설정",
      runbook:
        "Supabase env vars 확인 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). office-pc-1 의 supabase-db 컨테이너 헬스 확인: ssh inner@100.120.179.63 \"docker ps | grep supabase\"",
    },
    {
      label: "A/B 트래킹",
      ok: (pulse?.experimentEvents24h ?? 0) > 0,
      detail: pulse
        ? `24h ${pulse.experimentEvents24h} 이벤트`
        : "데이터 없음",
      runbook:
        "트래픽이 낮으면 정상. 트래픽 있는데 0 이면 /api/experiments/conversion 핸들러와 hero impression tracker 위치 확인",
    },
    {
      label: "비용 추적",
      ok: cost.daily >= 0,
      detail: `오늘 $${cost.daily.toFixed(2)}`,
      runbook: "음수면 usage_log INSERT 충돌 가능성 — usage_log_view 정합성 확인",
    },
    {
      label: "사이트 배너",
      ok: !!banner,
      detail: banner ? `노출 중 (${banner.tone ?? "info"})` : "비활성",
      runbook:
        "필요할 때만 OK. 공지가 없으면 비활성이 정상. /admin/usage 페이지에서 활성화",
    },
    {
      label: "뉴스레터",
      ok: (pulse?.newsletterActive ?? 0) > 0,
      detail: pulse
        ? `${pulse.newsletterActive} 구독 / 7d +${pulse.newsletter7d}`
        : "데이터 없음",
      runbook:
        "0 구독은 정상 (런칭 초기). footer signup form, robots.txt 의 /api/newsletter Disallow 확인",
    },
    {
      // SLA "OK" rule: no inquiries → vacuously OK; otherwise stale count
      // must be 0 AND median must be under 12h (our internal target).
      label: "응답 SLA (30d)",
      ok:
        sla.totalInquiries === 0 ||
        (sla.staleOpenCount === 0 && (sla.medianHours ?? 0) <= 12),
      detail:
        sla.totalInquiries === 0
          ? "데이터 없음"
          : `${sla.respondedCount}/${sla.totalInquiries} 응답 · 중앙값 ${
              sla.medianHours != null
                ? sla.medianHours < 1
                  ? `${Math.round(sla.medianHours * 60)}분`
                  : `${sla.medianHours.toFixed(1)}h`
                : "—"
            }${sla.staleOpenCount > 0 ? ` · ${sla.staleOpenCount} 지연` : ""}`,
      runbook:
        "/admin/inbox?stale=1 에서 24h+ 인콰이어 즉시 처리. 중앙값 12h 초과면 운영 회의에서 1순위 안건",
    },
    {
      // Retention health: avg 90d repeat rate across mature cohorts.
      // <20% suggests one-shot business; 20% is the floor we treat as healthy
      // for an agency model. Null = not enough mature data yet (vacuously OK
      // to avoid noise in the early window).
      label: "재구매 채널 건강도 (90d cohort)",
      ok:
        !retention ||
        retention.retention90dPct === null ||
        retention.retention90dPct >= 0.2,
      detail: !retention
        ? "데이터 없음"
        : retention.retention90dPct === null
        ? `mature cohort 없음 (90d 더 지나야 측정 가능)`
        : `${(retention.retention90dPct * 100).toFixed(0)}% · ${retention.matureCohortCount}개 코호트 평균`,
      runbook:
        "20% 미만이면 단발 거래 위주 — 분석은 /admin/clients 코호트 표 + /admin/forecast 채널별 close rate. 채널 매칭 정확도 또는 사후 follow-up 부재가 흔한 원인",
    },
    {
      // At-risk burden: at-risk clients / paying clients. >40% = systemic
      // retention drop (operator triage urgent); 20-40% = normal churn;
      // <20% = healthy.
      label: "LTV at-risk 부담",
      ok:
        !retention ||
        retention.payingClientCount === 0 ||
        retention.atRiskShare <= 0.4,
      detail: !retention
        ? "데이터 없음"
        : retention.payingClientCount === 0
        ? "결제 광고주 없음"
        : `${retention.atRiskCount}/${retention.payingClientCount} = ${(retention.atRiskShare * 100).toFixed(0)}%`,
      runbook:
        "40% 초과는 ‘대부분의 광고주가 60일+ 침묵 중’. /admin/clients?filter=at-risk 의 outreach mailto 또는 At-risk CSV 다운로드 → 1주일 내 5건 이상 컨택. 20% 미만이면 정상 churn 범위.",
    },
    {
      // Bottleneck stage: slowest stage's median > 14d trips the check.
      // We require at least 3 samples in the slowest stage to suppress the
      // single-outlier case (one weird 60d project shouldn't flip a runbook).
      label: "납품 병목 단계",
      ok:
        !slowestBucket ||
        slowestBucket.n < 3 ||
        slowestBucket.medianDays === null ||
        slowestBucket.medianDays <= 14,
      detail: !slowestBucket
        ? "데이터 없음"
        : slowestBucket.medianDays === null
        ? "데이터 없음"
        : `${STAGE_LABEL_HEALTH[slowestBucket.stage] ?? slowestBucket.stage} ${slowestBucket.medianDays.toFixed(
            1
          )}d 중앙값 (${slowestBucket.n}건 · ${(slowestBucket.totalShare * 100).toFixed(0)}% 점유)`,
      runbook: slowestBucket
        ? STAGE_RUNBOOK[slowestBucket.stage] ?? "/admin/forecast 에서 stage 별 timing 확인"
        : "/admin/forecast 에서 stage 별 timing 확인",
    },
    {
      // Pipeline velocity: p90 lead-time inquiry → delivered. >21 days = the
      // backlog is dragging on conversions. n<5 in 90d means we don't have
      // enough deliveries to publish p90; treat as vacuously OK so the check
      // doesn't fire on a brand-new account.
      label: "납품 lead time (p90, 90d)",
      ok: velocity.p90Days === null || velocity.p90Days <= 21,
      detail:
        velocity.p90Days === null
          ? velocity.n === 0
            ? "데이터 없음"
            : `표본 부족 (${velocity.n}건, p90 미산출)`
          : `중앙값 ${velocity.medianDays?.toFixed(1)}d · p90 ${velocity.p90Days.toFixed(
              1
            )}d · ${velocity.n}건`,
      runbook:
        "p90 21일 초과는 deal 이 review/in_progress 에서 멎고 있다는 신호. /admin/forecast#aging 의 31d+ 버킷 + 월별 추세 표 확인 → in_progress 가장 오래된 5건 follow-up. 영업 측 가격/스코프 의사결정 지연이 흔한 원인.",
    },
    {
      // Trending feed health: need at least ~30% of active models to have
      // 30d view data, otherwise /trending is too sparse to be useful.
      label: "트렌딩 엔진",
      ok:
        trending !== null &&
        trending.totalActive > 0 &&
        trending.modelsWithViews / trending.totalActive >= 0.3,
      detail: trending
        ? trending.totalActive === 0
          ? "활성 모델 없음"
          : `${trending.modelsWithViews}/${trending.totalActive} 모델이 30d 노출 보유`
        : "popularity view 미생성 또는 쿼리 실패",
      runbook:
        "30% 미만이면 카탈로그 노출이 부족. /admin 의 funnel + bySource 확인. popularity view 자체가 없으면 마이그레이션 006 재적용",
    },
    {
      // Symmetric to blog conversion: if 30d character page views > 200 but
      // utm_source=character inquiries are 0, the funnel exists but the
      // conversion step is broken. The CTA on character pages is the most
      // likely failure point — it's the one place referrer + utm_source both
      // need to be set correctly for attribution to land.
      label: "캐릭터 페이지 → 인콰이어 전환",
      ok: charViews30d.total < 200 || charAttr30d.totalInquiries > 0,
      detail:
        charViews30d.total < 200
          ? `30d 조회 ${charViews30d.total} — 표본 부족 (200+ 부터 측정)`
          : charAttr30d.totalInquiries === 0
          ? `30d 조회 ${charViews30d.total.toLocaleString()} · utm_source=character 인콰이어 0`
          : `30d 조회 ${charViews30d.total.toLocaleString()} · 인콰이어 ${charAttr30d.totalInquiries} (${(
              (charAttr30d.totalInquiries / charViews30d.total) *
              100
            ).toFixed(2)}%)`,
      runbook:
        "트래픽은 있는데 attribution 인콰이어가 없으면 (1) /character/[slug] CTA 가 utm_source=character 를 떨어트리지 않거나 (2) /rfp · /match 폼이 utm_source 를 보존 안 함. /admin/analytics 캐릭터 funnel 카드 + /admin/inbox 의 ★ Char 칩 카운트 대조. 최근 character detail 페이지 변경분 점검.",
    },
    {
      // Pricing-calculator funnel gate. There's no view tracking on
      // /pricing-calculator yet, so we use blog 30d views as a coarse site-
      // activity proxy: if the site is getting real traffic (≥500 30d blog
      // views) but the calculator funnel produced 0 inquiries, the CTA chain
      // (/character/* card → /pricing-calculator → /rfp) is likely broken.
      // Below the threshold the sample is too small to draw conclusions.
      label: "가격 계산기 → 인콰이어 전환",
      ok:
        blogViews30d.total < 500 || pricingCalc30d.totalInquiries > 0,
      detail:
        blogViews30d.total < 500
          ? `사이트 트래픽 (30d 블로그 조회) ${blogViews30d.total} — 표본 부족 (500+ 부터 측정)`
          : pricingCalc30d.totalInquiries === 0
          ? `30d 블로그 조회 ${blogViews30d.total.toLocaleString()} · 계산기 utm_source 인콰이어 0`
          : `30d 계산기 인콰이어 ${pricingCalc30d.totalInquiries} · 납품 ${pricingCalc30d.totalDelivered} · ₩${pricingCalc30d.totalRevenue.toLocaleString("ko-KR")}`,
      runbook:
        "트래픽은 있는데 계산기 attribution 이 0이면: (1) /character/[slug] 의 emerald 캐릭터 예산 카드가 사라졌거나 (2) /pricing-calculator 의 RFP CTA 가 utm_source=pricing-calculator 를 떨어트리지 않거나 (3) /rfp 폼이 utm_source 를 projects 행에 보존하지 않음. 가장 흔한 원인은 (1). 캐릭터 상세 페이지 KR/EN 두 라우트 모두 카드 노출 확인 → 클릭 시 URL 의 utm_source 확인 → 인콰이어 제출 후 projects.utm_source 컬럼 확인.",
    },
    {
      // Blog conversion gate — high views but no attributed inquiries means
      // the funnel exists but the conversion step is broken. We only fire
      // when 30d views exceed 200 (enough sample to expect ≥1 inquiry if the
      // funnel was working) AND 30d blog-attributed inquiries are 0.
      label: "블로그 → 인콰이어 전환",
      ok:
        blogViews30d.total < 200 || blogAttr30d.totalInquiries > 0,
      detail:
        blogViews30d.total < 200
          ? `30d 조회 ${blogViews30d.total} — 표본 부족 (200+ 부터 측정)`
          : blogAttr30d.totalInquiries === 0
          ? `30d 조회 ${blogViews30d.total.toLocaleString()} · attribut 인콰이어 0`
          : `30d 조회 ${blogViews30d.total.toLocaleString()} · attribut 인콰이어 ${blogAttr30d.totalInquiries}`,
      runbook:
        "트래픽은 들어오는데 인콰이어가 없으면 CTA 가 깨졌거나 referrer 가 capture 안 되는 중. /admin/blog-analytics 에서 top 글의 OG/CTA 확인 → /admin/forecast 의 블로그 attribut 카드와 대조. RFP/match 폼이 referrer 를 projects.referrer 로 저장하는지 점검.",
    },
    (() => {
      // Blog series integrity — every slug declared in BLOG_SERIES.slugs must
      // resolve to a real post in its declared locale. CI catches this with
      // tests/blog-series.test.ts, but a runtime check on the operator
      // dashboard catches drift between content edits and series declarations
      // (e.g. someone renamed a post slug and forgot to update the series).
      const missing: { id: string; locale: string; slug: string }[] = [];
      for (const series of BLOG_SERIES) {
        for (const slug of series.slugs) {
          if (!getPostBySlug(slug, series.locale)) {
            missing.push({ id: series.id, locale: series.locale, slug });
          }
        }
      }
      return {
        label: "블로그 시리즈 무결성",
        ok: missing.length === 0,
        detail:
          missing.length === 0
            ? `${BLOG_SERIES.length}개 시리즈 / 모든 slug 해결 OK`
            : `${missing.length}개 깨진 ref: ${missing
                .slice(0, 3)
                .map((m) => `${m.id}/${m.locale}:${m.slug}`)
                .join(", ")}${missing.length > 3 ? " ..." : ""}`,
        runbook:
          "lib/blog/series.ts 의 declared slug 가 lib/blog/posts.ts BLOG_POSTS 에 같은 locale 로 존재하지 않음. 시리즈 declare 했지만 글 publish 안 했거나 / 글 slug 가 rename 되었거나 / locale 이 mismatch. CI 가 tests/blog-series.test.ts 로 잡지만 deploy 후 hotfix 시점에 surface 될 수 있음.",
      };
    })(),
    {
      // Calc-path attribution hygiene. If utm_campaign on a pricing-calculator
      // inquiry doesn't map to a known RecommendedPath, the inquiry counts in
      // totalInquiries but is invisible in the per-path breakdown — making the
      // path mix unreliable. Fires only when there's enough sample (≥10) to
      // distinguish a real drift from a small-N quirk.
      label: "가격 계산기 path 어트리뷰션 hygiene",
      ok:
        pricingCalc30d.totalInquiries < 10 ||
        pricingCalc30d.unknown / pricingCalc30d.totalInquiries <= 0.3,
      detail:
        pricingCalc30d.totalInquiries < 10
          ? `30d 인콰이어 ${pricingCalc30d.totalInquiries} — 표본 부족 (10+ 부터 측정)`
          : `30d 미분류 ${pricingCalc30d.unknown}/${pricingCalc30d.totalInquiries} (${Math.round((pricingCalc30d.unknown / pricingCalc30d.totalInquiries) * 100)}%)`,
      runbook:
        "utm_campaign 이 5 RecommendedPath (license_daily / paired_editorial / season_anchor / custom_build / traditional_competitive) 중 어디에도 매칭 안 되면 path-별 카드 + inbox 칩 서브라벨에 surface 안 됨. 가장 흔한 원인은 /pricing-calculator 의 RFP CTA href 가 path 토큰을 캐멜케이스나 오타로 보내는 것 — lib/pricing/calculator.ts 의 recommendedPath() 가 반환하는 값과 /rfp 폼이 받는 값이 정확히 일치하는지 확인. legacy bookmark 도 unknown 으로 들어옴 (정상). 30% 초과면 새 path 토큰을 추가했거나 정의 drift.",
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto text-zinc-100">
      <header className="mb-8 flex items-center gap-3">
        <Activity className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold">Health</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            운영 헬스 체크 · 24h 활동 펄스
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              c.ok
                ? "border-zinc-800 bg-zinc-900/30"
                : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            {c.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{c.detail}</p>
              {!c.ok && c.runbook && (
                <p className="text-[11px] text-amber-200 mt-2 leading-relaxed">
                  <span className="text-amber-400 font-medium">대응 →</span>{" "}
                  {c.runbook}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
          24시간 펄스
        </h2>
        {!pulse ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
            Supabase 미설정 또는 쿼리 실패.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PulseCard
              label="신규 문의"
              value={String(pulse.inquiries24h)}
              trend={trendBadge(pulse.inquiries24h, pulse.inquiries7d)}
            />
            <PulseCard
              label="신규 프로젝트"
              value={String(pulse.newProjects24h)}
            />
            <PulseCard
              label="납품 전환"
              value={String(pulse.delivered24h)}
              trend={trendBadge(pulse.delivered24h, pulse.delivered7d)}
            />
            <PulseCard
              label="24h 매출"
              value={`₩${KRW.format(pulse.revenue24h)}`}
            />
          </div>
        )}
      </section>

      {underperformers.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            카탈로그 hygiene — 저전환 모델 {underperformers.length}개
          </h2>
          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
            500+ view 인데 inquiry rate 가 카탈로그 평균의 절반 미만. 페르소나 재정의 또는 카탈로그에서 내릴 후보.
          </p>
          <ul className="space-y-1.5">
            {underperformers.map((r) => (
              <li
                key={r.modelId}
                className="flex items-center justify-between text-sm"
              >
                <Link
                  href={`/admin/models/${r.modelId}`}
                  className="text-zinc-200 hover:text-white truncate mr-3"
                >
                  {r.name}
                </Link>
                <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                  view {r.views} · inq {r.inquiries} ·{" "}
                  <span className="text-amber-300">
                    {(r.inquiryRate * 100).toFixed(1)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/models/performance"
            className="mt-3 inline-block text-xs text-zinc-300 hover:text-white"
          >
            전체 성과 보기 →
          </Link>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-900/30">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            AI 비용 (rolling)
          </h2>
          <div className="space-y-2 text-sm">
            <CostRow label="오늘" value={cost.daily} />
            <CostRow label="이번 주" value={cost.weekly} />
            <CostRow label="이번 달" value={cost.monthly} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 p-5 bg-zinc-900/30">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            최근 AI 호출
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-600">최근 24h 호출 없음</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {recent.map((e, idx) => (
                <li
                  key={`${e.created_at}-${idx}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-zinc-400 truncate">
                    <Clock className="w-3 h-3 inline-block mr-1 opacity-50" />
                    {new Date(e.created_at).toLocaleTimeString("ko-KR", {
                      hour12: false,
                    })}{" "}
                    <span className="text-zinc-600">·</span>{" "}
                    <span className="text-zinc-300">{e.route}</span>{" "}
                    <span className="text-zinc-500">({e.model})</span>
                  </span>
                  <span className="text-zinc-400 tabular-nums shrink-0">
                    ${e.cost_usd.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function PulseCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: { label: string; tone: string };
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
      {trend && (
        <p className={`text-[10px] mt-1 ${trend.tone}`}>{trend.label}</p>
      )}
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="tabular-nums font-medium">${value.toFixed(2)}</span>
    </div>
  );
}
