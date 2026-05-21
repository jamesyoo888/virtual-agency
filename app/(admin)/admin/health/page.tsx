import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { summarizeUsage, recentUsage } from "@/lib/cost/store";
import { getBanner } from "@/lib/banner";
import { loadResponseSla } from "@/lib/analytics/response-sla";
import { loadModelPerformance } from "@/lib/analytics/model-performance";
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
  const [pulse, cost, recent, banner, sla, perf, trending] = await Promise.all([
    loadPulse(),
    summarizeUsage(),
    recentUsage(10),
    getBanner(),
    loadResponseSla(30),
    loadModelPerformance(30),
    loadTrendingEngine(),
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

  const checks: { label: string; ok: boolean; detail: string }[] = [
    {
      label: "Supabase 연결",
      ok: SUPABASE_CONFIGURED && pulse !== null,
      detail: SUPABASE_CONFIGURED
        ? pulse
          ? "쿼리 성공"
          : "쿼리 실패 — 로그 확인"
        : "미설정",
    },
    {
      label: "A/B 트래킹",
      ok: (pulse?.experimentEvents24h ?? 0) > 0,
      detail: pulse
        ? `24h ${pulse.experimentEvents24h} 이벤트`
        : "데이터 없음",
    },
    {
      label: "비용 추적",
      ok: cost.daily >= 0,
      detail: `오늘 $${cost.daily.toFixed(2)}`,
    },
    {
      label: "사이트 배너",
      ok: !!banner,
      detail: banner ? `노출 중 (${banner.tone ?? "info"})` : "비활성",
    },
    {
      label: "뉴스레터",
      ok: (pulse?.newsletterActive ?? 0) > 0,
      detail: pulse
        ? `${pulse.newsletterActive} 구독 / 7d +${pulse.newsletter7d}`
        : "데이터 없음",
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
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex items-start gap-3"
          >
            {c.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{c.detail}</p>
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
