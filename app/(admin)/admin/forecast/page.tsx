import Link from "next/link";
import {
  TrendingUp,
  AlertCircle,
  Gauge,
  Sparkles,
  Calculator,
  Briefcase,
} from "lucide-react";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { loadForecast } from "@/lib/analytics/forecast";
import { loadPipelineVelocity } from "@/lib/analytics/pipeline-velocity";
import { loadStageTiming } from "@/lib/analytics/stage-timing";
import { loadSlowOpenProjects } from "@/lib/analytics/slow-open-projects";
import { loadCharacterAttribution } from "@/lib/analytics/character-attribution";
import { loadBlogAttribution } from "@/lib/analytics/blog-attribution";
import {
  loadPricingCalculatorAttribution,
  pathLabelForAdmin,
} from "@/lib/analytics/pricing-calculator-attribution";
import {
  loadAllAgentAttribution,
  AGENT_COMMISSION_RATE,
} from "@/lib/analytics/agent-attribution";
import { getCharacter } from "@/lib/characters/registry";
import { getKitTier } from "@/lib/characters/brand-kits";
import { getPostBySlug } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Forecast — Virtual Agency Admin" };

const KRW = new Intl.NumberFormat("ko-KR");

const STAGE_LABEL: Record<string, string> = {
  inquiry: "문의",
  brief_received: "브리프",
  in_progress: "제작 중",
  review: "검토",
};

export default async function ForecastPage() {
  const [
    r,
    velocity,
    stageTiming,
    slowOpen,
    charAttr,
    blogAttr,
    pricingCalc,
    agentAttr,
  ] = await Promise.all([
    loadForecast(),
    loadPipelineVelocity(90),
    loadStageTiming(90),
    loadSlowOpenProjects(5),
    loadCharacterAttribution(90),
    loadBlogAttribution(90),
    loadPricingCalculatorAttribution(90),
    loadAllAgentAttribution(90),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto text-zinc-100">
      <header className="mb-8 flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-zinc-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">30일 매출 Forecast</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            90일 누적 close rate × 현재 pipeline 가치 + run-rate 기반 시나리오.
          </p>
        </div>
        <a
          href="/api/admin/exports/forecast"
          download
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          CSV
        </a>
      </header>

      {!SUPABASE_CONFIGURED || !r ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-sm text-zinc-500">
          Supabase 미설정 — production 에서만 동작합니다.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <ScenarioCard
              label="Conservative"
              value={r.scenarios.conservative}
              hint="base × 0.7 (지연 시나리오)"
              tone="border-zinc-700 text-zinc-300"
            />
            <ScenarioCard
              label="Base"
              value={r.scenarios.base}
              hint="run-rate + pipeline × close rate"
              tone="border-white/30 text-white"
              highlight
            />
            <ScenarioCard
              label="Optimistic"
              value={r.scenarios.optimistic}
              hint="run-rate × 1.2 + pipeline × close × 1.5 (cap 100%)"
              tone="border-emerald-500/30 text-emerald-300"
            />
          </section>

          <div
            className={`mb-8 text-xs px-3 py-2 rounded-md border ${
              r.confidence === "high"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                : r.confidence === "medium"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                : "border-rose-500/40 bg-rose-500/5 text-rose-200"
            }`}
          >
            <span className="font-semibold">
              신뢰도 {r.confidence === "high" ? "높음" : r.confidence === "medium" ? "보통" : "낮음"}
            </span>
            <span className="ml-2 text-zinc-400">
              {r.confidence === "low"
                ? `납품 ${r.delivered90dCount}건 / 인콰이어 ${r.inquired90dCount}건 — 표본이 작아 시나리오 폭이 넓습니다. 방향성 참고용으로만 사용하세요.`
                : r.confidence === "medium"
                ? `납품 ${r.delivered90dCount}건 / 인콰이어 ${r.inquired90dCount}건 — 시즌·캠페인 영향 보정 필요.`
                : `납품 ${r.delivered90dCount}건 / 인콰이어 ${r.inquired90dCount}건 — 비교 가능한 표본.`}
            </span>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                Pipeline (열린 프로젝트)
              </h2>
              {r.pipelineTotalValue === 0 ? (
                <p className="text-sm text-zinc-500">
                  현재 견적 금액이 입력된 열린 프로젝트가 없습니다.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {Object.entries(r.pipelineByStage).map(([stage, b]) => {
                    const sharePct =
                      r.pipelineTotalValue > 0
                        ? (b.value / r.pipelineTotalValue) * 100
                        : 0;
                    return (
                      <li
                        key={stage}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-20 shrink-0 text-zinc-400">
                          {STAGE_LABEL[stage] ?? stage}
                        </span>
                        <span className="text-zinc-500 tabular-nums shrink-0 w-8 text-right">
                          {b.count}
                        </span>
                        <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${sharePct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-zinc-200 shrink-0 w-28 text-right">
                          ₩{KRW.format(b.value)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-4 text-xs text-zinc-500">
                Pipeline 총합:{" "}
                <span className="text-zinc-200 font-medium tabular-nums">
                  ₩{KRW.format(r.pipelineTotalValue)}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                90일 reference window
              </h2>
              <ul className="space-y-2 text-sm">
                <Row
                  label="신규 inquiry"
                  value={r.inquired90dCount.toLocaleString()}
                />
                <Row
                  label="납품 (delivered)"
                  value={r.delivered90dCount.toLocaleString()}
                />
                <Row
                  label="Close rate"
                  value={`${(r.closeRate * 100).toFixed(1)}%`}
                />
                <Row
                  label="평균 deal size"
                  value={`₩${KRW.format(Math.round(r.avgDealValue))}`}
                />
                <Row
                  label="90일 누적 매출"
                  value={`₩${KRW.format(r.delivered90dValue)}`}
                />
              </ul>
            </div>
          </section>

          {r.pipelineByModel.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                Pipeline 기여 모델 Top {r.pipelineByModel.length}
              </h2>
              <ul className="space-y-2 text-sm">
                {r.pipelineByModel.map((m) => {
                  const sharePct =
                    r.pipelineTotalValue > 0
                      ? (m.value / r.pipelineTotalValue) * 100
                      : 0;
                  return (
                    <li
                      key={m.model_id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Link
                        href={`/admin/models/${m.model_id}`}
                        className="w-40 shrink-0 text-zinc-200 hover:text-white truncate"
                      >
                        {m.model_name}
                      </Link>
                      <span className="text-zinc-500 tabular-nums shrink-0 w-8 text-right">
                        {m.count}
                      </span>
                      <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-zinc-200 shrink-0 w-28 text-right">
                        ₩{KRW.format(m.value)}
                      </span>
                      <span className="tabular-nums text-zinc-500 shrink-0 w-14 text-right">
                        {sharePct.toFixed(1)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-zinc-500">
                견적이 비어 있는 프로젝트(₩0)는 정렬에서 뒤로 밀립니다 — invoice_amount 를 채워야 모델별 기여도가 정확히 보입니다.
              </p>
            </section>
          )}

          {r.revenueBySource.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                채널별 매출 기여 (지난 90일)
              </h2>
              <p className="text-[11px] text-zinc-500 mb-3">
                채널 = utm_source (인콰이어 캡처 시점 기준). close rate 가 평균(
                {(r.closeRate * 100).toFixed(0)}%)보다 낮으면 inquiry 가 와도 안 닫히는 채널, 높으면 LTV 좋은 채널.
              </p>
              <ul className="space-y-2 text-sm">
                {r.revenueBySource.map((s) => {
                  const sharePct = s.revenueShare * 100;
                  const closeVsAvg =
                    r.closeRate > 0 ? s.closeRate / r.closeRate : 1;
                  // ±20% threshold to avoid coloring on noise.
                  const closeTone =
                    closeVsAvg >= 1.2
                      ? "text-emerald-300"
                      : closeVsAvg <= 0.8 && s.inquired > 0
                      ? "text-rose-300"
                      : "text-zinc-300";
                  return (
                    <li
                      key={s.source}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className="w-28 shrink-0 text-zinc-200 truncate"
                        title={s.source}
                      >
                        {s.source}
                      </span>
                      <span className="text-zinc-500 tabular-nums shrink-0 w-14 text-right">
                        {s.delivered}/{s.inquired}
                      </span>
                      <span
                        className={`tabular-nums shrink-0 w-14 text-right ${closeTone}`}
                        title="close rate (delivered / inquired)"
                      >
                        {(s.closeRate * 100).toFixed(0)}%
                      </span>
                      <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-zinc-200 shrink-0 w-28 text-right">
                        ₩{KRW.format(s.revenue)}
                      </span>
                      <span className="tabular-nums text-zinc-500 shrink-0 w-12 text-right">
                        {sharePct.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {r.pipelineAging.some((b) => b.count > 0) && (
            <section
              id="aging"
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8 scroll-mt-20"
            >
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                Pipeline 체류 시간 (created_at 기준)
              </h2>
              <p className="text-[11px] text-zinc-500 mb-3">
                31일+ 버킷이 가장 두꺼우면 stuck deal — 영업이 closing 으로 push 못 하고 있다는 신호.
              </p>
              <ul className="space-y-2 text-sm">
                {r.pipelineAging.map((b) => {
                  const sharePct =
                    r.pipelineTotalValue > 0
                      ? (b.value / r.pipelineTotalValue) * 100
                      : 0;
                  const stuck = b.label === "31d+" && b.count > 0;
                  return (
                    <li key={b.label} className="flex items-center gap-3">
                      <span
                        className={`w-20 shrink-0 ${
                          stuck ? "text-rose-300 font-medium" : "text-zinc-400"
                        }`}
                      >
                        {b.label}
                      </span>
                      <span className="text-zinc-500 tabular-nums shrink-0 w-8 text-right">
                        {b.count}
                      </span>
                      <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            stuck ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-zinc-200 shrink-0 w-28 text-right">
                        ₩{KRW.format(b.value)}
                      </span>
                      <span className="tabular-nums text-zinc-500 shrink-0 w-14 text-right">
                        {sharePct.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {velocity.n > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5" />
                  납품 lead time (inquiry → delivered, 90일)
                </h2>
                <a
                  href="/api/admin/exports/pipeline-velocity"
                  download
                  className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                >
                  CSV
                </a>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">
                project_status_history 의 첫 `to_status=delivered` 시점 기준. 응답 SLA 는 첫 회신만 측정 — 이 카드는 끝까지 닫히는 시간.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <VelocityStat
                  label="중앙값"
                  value={fmtDays(velocity.medianDays)}
                  hint={`${velocity.n}건 측정`}
                />
                <VelocityStat
                  label="p90"
                  value={fmtDays(velocity.p90Days)}
                  hint={
                    velocity.p90Days === null
                      ? "표본 부족 (n<5)"
                      : "90% 이내 완료"
                  }
                />
                <VelocityStat
                  label="최단"
                  value={fmtDays(velocity.fastestDays)}
                  hint="가장 빠른 납품"
                />
                <VelocityStat
                  label="최장"
                  value={fmtDays(velocity.slowestDays)}
                  hint="가장 느린 납품"
                />
              </div>
              {velocity.byMonth.some((m) => m.n > 0) && (
                <ul className="space-y-1.5 text-xs">
                  {velocity.byMonth.map((m) => (
                    <li
                      key={m.month}
                      className="flex items-center gap-3 text-zinc-400"
                    >
                      <span className="w-20 shrink-0 tabular-nums">{m.month}</span>
                      <span className="w-10 shrink-0 tabular-nums text-zinc-500 text-right">
                        {m.n}
                      </span>
                      <span className="flex-1 text-zinc-300 tabular-nums">
                        {m.medianDays === null ? (
                          <span className="text-zinc-600">—</span>
                        ) : (
                          `${m.medianDays.toFixed(1)}d`
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {stageTiming.measuredProjects > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                병목 단계 (delivered {stageTiming.measuredProjects}건 평균)
              </h2>
              <p className="text-[11px] text-zinc-500 mb-3">
                lead time 의 어느 stage 가 가장 길게 잡고 있는지 — 영업/제작/검수 어디서 손이 멎고 있나.
              </p>
              <ul className="space-y-2 text-sm">
                {stageTiming.buckets.map((b) => {
                  const isSlowest = b.stage === stageTiming.slowestStage;
                  const sharePct = b.totalShare * 100;
                  return (
                    <li
                      key={b.stage}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={`w-24 shrink-0 ${
                          isSlowest
                            ? "text-rose-300 font-medium"
                            : "text-zinc-400"
                        }`}
                      >
                        {STAGE_LABEL[b.stage] ?? b.stage}
                      </span>
                      <span className="text-zinc-500 tabular-nums shrink-0 w-10 text-right">
                        {b.n}
                      </span>
                      <span
                        className={`tabular-nums shrink-0 w-16 text-right ${
                          b.medianDays === null
                            ? "text-zinc-600"
                            : isSlowest
                            ? "text-rose-300 font-medium"
                            : "text-zinc-200"
                        }`}
                        title="중앙값"
                      >
                        {b.medianDays === null
                          ? "—"
                          : `${b.medianDays.toFixed(1)}d`}
                      </span>
                      <span
                        className="tabular-nums shrink-0 w-16 text-right text-zinc-500"
                        title="p90"
                      >
                        {b.p90Days === null
                          ? "—"
                          : `${b.p90Days.toFixed(1)}d`}
                      </span>
                      <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            isSlowest ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-zinc-500 shrink-0 w-12 text-right">
                        {sharePct.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-zinc-500">
                컬럼: 표본수 · 중앙값 · p90 · 전체 lead time 점유율. 점유율 막대는 stage 가 calendar 의 어느 비중을 먹는지 — 중앙값과 같이 봐야 함 (드물지만 길거나, 매번 적당히 긴 차이).
              </p>
            </section>
          )}

          {slowOpen.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                지금 가장 오래 멈춰있는 열린 프로젝트 Top {slowOpen.length}
              </h2>
              <p className="text-[11px] text-zinc-500 mb-3">
                in_progress / review 단계만 — 영업 follow-up 1순위. 클릭 → 내부 노트·견적 편집·전이.
              </p>
              <ul className="space-y-1.5">
                {slowOpen.map((p) => {
                  const tone =
                    p.daysInStage >= 14
                      ? "text-rose-300"
                      : p.daysInStage >= 7
                      ? "text-amber-300"
                      : "text-zinc-300";
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-20 shrink-0 text-zinc-500 tabular-nums text-xs uppercase">
                        {STAGE_LABEL[p.status] ?? p.status}
                      </span>
                      <Link
                        href={`/admin/projects/${p.id}`}
                        className="flex-1 truncate text-zinc-200 hover:text-white"
                        title={p.title}
                      >
                        {p.title}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-500 truncate max-w-[12rem]">
                        {p.modelName ?? "—"}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 tabular-nums w-24 text-right">
                        {p.invoiceAmount
                          ? `₩${KRW.format(p.invoiceAmount)}`
                          : "—"}
                      </span>
                      <span
                        className={`shrink-0 text-sm font-medium tabular-nums w-16 text-right ${tone}`}
                      >
                        {p.daysInStage}d
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(charAttr.bySlug.length > 0 || charAttr.byTier.length > 0) && (
            <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 mb-8">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs uppercase tracking-wider text-violet-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Character IP 기여 (90일 attribution)
                </h2>
                <a
                  href="/api/admin/exports/character-attribution?window=90"
                  download
                  className="text-[10px] px-2 py-0.5 rounded-md border border-violet-500/30 text-violet-200 hover:border-violet-400 hover:text-white"
                >
                  CSV
                </a>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3">
                /character/[slug] CTA 경유 인콰이어(utm_source=character). 다음 90일 예상 = 현재 run-rate 유지 가정 — 신규 캠페인이나 시즌 효과가 있으면 보정 필요.
              </p>
              {charAttr.bySlug.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    캐릭터별
                  </p>
                  <ul className="space-y-2 text-sm">
                    {charAttr.bySlug.map((c) => {
                      const character = getCharacter(c.slug);
                      const label = character?.name ?? c.slug;
                      const sharePct =
                        charAttr.totalRevenue > 0
                          ? (c.revenue / charAttr.totalRevenue) * 100
                          : 0;
                      return (
                        <li
                          key={c.slug}
                          className="flex items-center gap-3 text-sm"
                        >
                          <Link
                            href={`/character/${c.slug}`}
                            className="w-24 shrink-0 text-violet-200 hover:text-white"
                          >
                            {label}
                          </Link>
                          <span className="text-zinc-500 tabular-nums shrink-0 w-14 text-right">
                            {c.delivered}/{c.inquiries}
                          </span>
                          <span
                            className={`tabular-nums shrink-0 w-12 text-right ${
                              c.conversionPct >= 30
                                ? "text-emerald-300"
                                : c.conversionPct >= 15
                                ? "text-zinc-300"
                                : "text-rose-300"
                            }`}
                            title="conversion (delivered / inquiries)"
                          >
                            {c.conversionPct}%
                          </span>
                          <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-violet-500"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-zinc-200 shrink-0 w-28 text-right">
                            ₩{KRW.format(c.revenue)}
                          </span>
                          <span className="tabular-nums text-violet-300 shrink-0 w-28 text-right" title="다음 90일 예상 (run-rate)">
                            ₩{KRW.format(c.revenue)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {charAttr.byTier.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Brand-kit 티어별
                  </p>
                  <ul className="space-y-2 text-sm">
                    {charAttr.byTier.map((t) => {
                      const tier = getKitTier(
                        t.tier as "paired" | "season" | "custom"
                      );
                      const label = tier?.nameEn ?? t.tier;
                      const sharePct =
                        charAttr.totalRevenue > 0
                          ? (t.revenue / charAttr.totalRevenue) * 100
                          : 0;
                      return (
                        <li
                          key={t.tier}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="w-32 shrink-0 text-amber-200">
                            {label}
                          </span>
                          <span className="text-zinc-500 tabular-nums shrink-0 w-14 text-right">
                            {t.delivered}/{t.inquiries}
                          </span>
                          <span
                            className={`tabular-nums shrink-0 w-12 text-right ${
                              t.conversionPct >= 30
                                ? "text-emerald-300"
                                : "text-zinc-300"
                            }`}
                          >
                            {t.conversionPct}%
                          </span>
                          <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-zinc-200 shrink-0 w-28 text-right">
                            ₩{KRW.format(t.revenue)}
                          </span>
                          <span className="tabular-nums text-amber-300 shrink-0 w-28 text-right" title="다음 90일 예상 (run-rate)">
                            ₩{KRW.format(t.revenue)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-[11px] text-zinc-500">
                Total 90일: 인콰이어 {charAttr.totalInquiries}건 · 납품 {charAttr.totalDelivered}건 · 매출 ₩{KRW.format(charAttr.totalRevenue)}{charAttr.unknown > 0 && ` · 미분류 ${charAttr.unknown}건`}
              </p>
            </section>
          )}

          {pricingCalc.totalInquiries > 0 && (
            <section className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-5 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs uppercase tracking-wider text-teal-300 flex items-center gap-2">
                  <Calculator className="w-3.5 h-3.5" />
                  가격 계산기 → 인콰이어 (90일 attribution)
                </h2>
                <a
                  href="/api/admin/exports/pricing-calculator-attribution?window=90"
                  download
                  className="text-[10px] px-2 py-0.5 rounded-md border border-teal-500/30 text-teal-200 hover:border-teal-400 hover:text-white"
                >
                  CSV
                </a>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3">
                /pricing-calculator → /rfp CTA 경유 인콰이어(utm_source=pricing-calculator).
                다음 90일 예상 = 현재 run-rate 유지 가정. paired/season 비중이 높으면
                brand-kit funnel 작동 중, license/traditional 비중이 높으면 buyer
                스코프가 floor 아래.
              </p>
              {pricingCalc.byPath.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {(() => {
                    const maxInq = Math.max(
                      1,
                      ...pricingCalc.byPath.map((p) => p.inquiries)
                    );
                    return pricingCalc.byPath.map((p) => {
                      const meta = pathLabelForAdmin(p.path);
                      const sharePct =
                        pricingCalc.totalRevenue > 0
                          ? (p.revenue / pricingCalc.totalRevenue) * 100
                          : 0;
                      const widthPct = (p.inquiries / maxInq) * 100;
                      return (
                        <li
                          key={p.path}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="w-44 shrink-0 text-zinc-200 truncate">
                            {meta.short}
                          </span>
                          <div className="flex-1 h-2 rounded bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-teal-400"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs text-zinc-300 tabular-nums w-12 text-right">
                            {p.inquiries}
                          </span>
                          <span className="shrink-0 text-xs text-zinc-500 tabular-nums w-12 text-right">
                            {p.conversionPct}%
                          </span>
                          {p.revenue > 0 && (
                            <span className="shrink-0 text-xs text-emerald-300 tabular-nums w-32 text-right">
                              ₩{KRW.format(p.revenue)}
                              <span className="text-zinc-600 ml-1">
                                ({sharePct.toFixed(0)}%)
                              </span>
                            </span>
                          )}
                        </li>
                      );
                    });
                  })()}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-zinc-500">
                Total 90일: 인콰이어 {pricingCalc.totalInquiries}건 · 납품{" "}
                {pricingCalc.totalDelivered}건 · 매출 ₩{KRW.format(pricingCalc.totalRevenue)}
                {pricingCalc.unknown > 0 && ` · 미분류 ${pricingCalc.unknown}건`}
              </p>
              {(() => {
                // Weekly composition trend — stacked bar per week showing how the
                // path mix shifts. Surface early signal that buyer scope is
                // drifting (license_daily share rising = buyer pool getting smaller-
                // budget; paired_editorial share rising = brand-kit funnel working).
                const weeks = pricingCalc.weeklyByPath.filter(
                  (w) => w.total > 0
                );
                if (weeks.length < 2) return null;
                const PATH_COLORS: Record<string, string> = {
                  license_daily: "bg-amber-400",
                  paired_editorial: "bg-emerald-400",
                  season_anchor: "bg-violet-400",
                  custom_build: "bg-fuchsia-400",
                  traditional_competitive: "bg-zinc-500",
                };
                const PATH_ORDER = [
                  "license_daily",
                  "paired_editorial",
                  "season_anchor",
                  "custom_build",
                  "traditional_competitive",
                ] as const;
                const maxTotal = Math.max(...weeks.map((w) => w.total));
                return (
                  <div className="mt-4 pt-4 border-t border-teal-500/20">
                    <p className="text-[11px] uppercase tracking-wider text-teal-300 mb-2">
                      주간 path 구성 트렌드 ({weeks.length}주)
                    </p>
                    <div className="flex items-end gap-1 h-20">
                      {weeks.map((w) => {
                        const heightPct = (w.total / maxTotal) * 100;
                        return (
                          <div
                            key={w.weekStart}
                            className="flex-1 min-w-0 flex flex-col items-stretch justify-end gap-px"
                            title={`주 ${w.weekStart} · ${w.total}건`}
                          >
                            <div
                              className="flex flex-col-reverse rounded-sm overflow-hidden bg-zinc-900/40"
                              style={{ height: `${heightPct}%` }}
                            >
                              {PATH_ORDER.map((p) => {
                                const n = w.counts[p];
                                if (n === 0) return null;
                                const segPct = (n / w.total) * 100;
                                return (
                                  <div
                                    key={p}
                                    className={PATH_COLORS[p]}
                                    style={{ height: `${segPct}%` }}
                                    title={`${pathLabelForAdmin(p).short}: ${n}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 tabular-nums">
                      <span>{weeks[0].weekStart}</span>
                      <span>{weeks[weeks.length - 1].weekStart}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
                      각 바 = 1주, 색 = path. License (amber) 비중이 빠르게
                      올라가면 buyer 스코프가 paired 손익분기 (≈14 컷) 아래로
                      이동 중인 signal. Paired (emerald) 가 안정적으로 상승하면
                      brand-kit funnel 작동 중.
                    </p>
                  </div>
                );
              })()}
            </section>
          )}

          {blogAttr.totalInquiries > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 mb-6">
              <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
                  블로그 글 → 인콰이어 (90일)
                </h2>
                <p className="text-[11px] text-zinc-500 tabular-nums">
                  referrer=/blog/[slug] 추적 · {blogAttr.totalInquiries}건 · 납품 {blogAttr.totalDelivered}건 ·{" "}
                  <span className="text-emerald-300">
                    ₩{KRW.format(blogAttr.totalRevenue)}
                  </span>
                </p>
              </div>
              {(() => {
                const top = blogAttr.bySlug.slice(0, 10);
                const maxInq = Math.max(1, ...top.map((b) => b.inquiries));
                return (
                  <ul className="space-y-2 text-sm">
                    {top.map((b) => {
                      const post =
                        getPostBySlug(b.slug, b.locale) ??
                        getPostBySlug(b.slug, "ko") ??
                        getPostBySlug(b.slug, "en");
                      const title = post?.title ?? b.slug;
                      const analyticsHref = `/admin/blog-analytics/${encodeURIComponent(
                        b.slug
                      )}?window=90`;
                      const widthPct = (b.inquiries / maxInq) * 100;
                      return (
                        <li
                          key={`${b.locale}:${b.slug}`}
                          className="grid grid-cols-12 gap-3 items-center"
                        >
                          <div className="col-span-6 min-w-0">
                            <Link
                              href={analyticsHref}
                              className="block truncate text-zinc-200 hover:text-white"
                              title={title}
                            >
                              <span className="mr-1.5 inline-block text-[9px] uppercase tracking-wider rounded px-1 py-0.5 bg-zinc-800 text-zinc-400">
                                {b.locale.toUpperCase()}
                              </span>
                              {title}
                            </Link>
                          </div>
                          <div className="col-span-3 h-2 rounded bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="col-span-3 text-right text-xs text-zinc-300 tabular-nums">
                            {b.inquiries}{" "}
                            <span
                              className={
                                b.conversionPct >= 30
                                  ? "text-emerald-400"
                                  : "text-zinc-500"
                              }
                            >
                              {b.conversionPct}%
                            </span>
                            {b.revenue > 0 && (
                              <span className="ml-2 text-emerald-300">
                                ₩{KRW.format(b.revenue)}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
              <p className="mt-3 text-[11px] text-zinc-600">
                referrer 가 블로그 글이었던 RFP/인콰이어. 어떤 글이 매출로 직결되는지 = 콘텐츠 ROI 시그널. /admin/blog-analytics 에서 view 추세 + referrer 분석으로 drill-down.
              </p>
            </section>
          )}

          {agentAttr.totalInquiries > 0 && (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5" />
                  에이전트 referral → 인콰이어 (90일 attribution)
                </h2>
                <a
                  href="/api/admin/exports/agent-attribution?window=90"
                  download
                  className="text-[10px] px-2 py-0.5 rounded-md border border-amber-500/30 text-amber-200 hover:border-amber-400 hover:text-white"
                >
                  CSV
                </a>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3">
                utm_source=agent + utm_campaign=&lt;agent.id&gt; 경유 인콰이어 ·
                15% 표준 커미션 추정. agent 별 분포로 referral 채널 깊이 (단일
                power-user 의존 vs 여러 partner 분산) 파악.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    인콰이어
                  </p>
                  <p className="mt-1 tabular-nums text-amber-200">
                    {agentAttr.totalInquiries}건
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    납품
                  </p>
                  <p className="mt-1 tabular-nums text-emerald-300">
                    {agentAttr.totalDelivered}건
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    매출 (납품)
                  </p>
                  <p className="mt-1 tabular-nums text-emerald-300">
                    ₩{KRW.format(agentAttr.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] uppercase tracking-wider text-amber-400"
                    title={`${Math.round(AGENT_COMMISSION_RATE * 100)}% 표준 커미션`}
                  >
                    커미션 추정
                  </p>
                  <p className="mt-1 tabular-nums text-amber-200">
                    ₩{KRW.format(agentAttr.commissionEstimate)}
                  </p>
                </div>
              </div>
              {agentAttr.byAgent.length > 0 &&
                (() => {
                  const top = agentAttr.byAgent.slice(0, 5);
                  const maxInq = Math.max(1, ...top.map((a) => a.inquiries));
                  return (
                    <ul className="space-y-2 text-sm">
                      {top.map((a) => {
                        const sharePct =
                          agentAttr.totalInquiries > 0
                            ? (a.inquiries / agentAttr.totalInquiries) * 100
                            : 0;
                        const widthPct = (a.inquiries / maxInq) * 100;
                        return (
                          <li
                            key={a.agentId}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span
                              className="w-32 shrink-0 text-zinc-200 truncate text-xs"
                              title={a.agentId}
                            >
                              {a.agentId.slice(0, 8)}…
                            </span>
                            <div className="flex-1 h-2 rounded bg-zinc-900 overflow-hidden">
                              <div
                                className="h-full bg-amber-400"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs text-zinc-300 tabular-nums w-12 text-right">
                              {a.inquiries}
                            </span>
                            <span className="shrink-0 text-xs text-zinc-500 tabular-nums w-12 text-right">
                              {a.conversionPct}%
                            </span>
                            {a.revenue > 0 && (
                              <span className="shrink-0 text-xs text-emerald-300 tabular-nums w-32 text-right">
                                ₩{KRW.format(a.revenue)}
                                <span className="text-zinc-600 ml-1">
                                  ({sharePct.toFixed(0)}%)
                                </span>
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              {agentAttr.byAgent.length > 5 && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  + {agentAttr.byAgent.length - 5} 추가 partner ·{" "}
                  <Link
                    href="/admin/analytics"
                    className="underline underline-offset-2 hover:text-white"
                  >
                    전체 보기
                  </Link>
                </p>
              )}
              <p className="mt-3 text-[11px] text-zinc-600">
                Top 1 partner 가 {(() => {
                  const top = agentAttr.byAgent[0];
                  if (!top || agentAttr.totalInquiries === 0) return "0%";
                  return `${Math.round(
                    (top.inquiries / agentAttr.totalInquiries) * 100
                  )}%`;
                })()}{" "}
                점유 — 50% 초과면 channel 집중 위험; 30% 미만이면 분산 잘 됨.
              </p>
            </section>
          )}

          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
            <h2 className="text-xs uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              해석 가이드
            </h2>
            <ul className="text-zinc-300 list-disc list-inside space-y-1.5 leading-relaxed">
              <li>
                Pipeline 의 invoice_amount 가 비어 있으면 시나리오에서 제외됩니다 — 들어온 inquiry 에 견적을 빠르게 책정할수록 forecast 정확도가 올라갑니다.
              </li>
              <li>
                Close rate 가 30% 미만이면 매칭 부정확 또는 응답 SLA 지연. 두 지표를 같이 점검하세요 (
                <Link
                  href="/admin/health"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Health
                </Link>
                ).
              </li>
              <li>
                Base 시나리오는 같은 close rate 가 유지된다는 가정. 신규 캠페인 출시나 시즌성 효과가 있다면 별도 보정 필요.
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function ScenarioCard({
  label,
  value,
  hint,
  tone,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${tone} ${
        highlight ? "bg-zinc-950" : "bg-zinc-900/30"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">
        ₩{KRW.format(value)}
      </p>
      <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">{hint}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="tabular-nums font-medium text-zinc-100">{value}</span>
    </li>
  );
}

function VelocityStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p>
    </div>
  );
}

function fmtDays(d: number | null): string {
  if (d === null) return "—";
  return `${d.toFixed(1)}d`;
}
