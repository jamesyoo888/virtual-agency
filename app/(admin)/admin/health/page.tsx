import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { summarizeUsage, recentUsage } from "@/lib/cost/store";
import { getBanner } from "@/lib/banner";
import { loadResponseSla } from "@/lib/analytics/response-sla";
import { loadModelPerformance } from "@/lib/analytics/model-performance";
import { loadPipelineVelocity } from "@/lib/analytics/pipeline-velocity";
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
  const [pulse, cost, recent, banner, sla, perf, trending, retention, velocity] =
    await Promise.all([
      loadPulse(),
      summarizeUsage(),
      recentUsage(10),
      getBanner(),
      loadResponseSla(30),
      loadModelPerformance(30),
      loadTrendingEngine(),
      loadRetentionHealth(),
      loadPipelineVelocity(90),
    ]);

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
