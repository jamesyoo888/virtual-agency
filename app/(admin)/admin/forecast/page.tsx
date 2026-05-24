import Link from "next/link";
import { TrendingUp, AlertCircle } from "lucide-react";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { loadForecast } from "@/lib/analytics/forecast";

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
  const r = await loadForecast();

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
