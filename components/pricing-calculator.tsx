"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  estimate,
  pathLabel,
  rfpHrefFromInputs,
  type CalculatorInput,
  type RecommendedPath,
} from "@/lib/pricing/calculator";

/**
 * Interactive K-aesthetic AI campaign cost estimator. Used on both KR
 * (/pricing-calculator) and EN (/en/pricing-calculator) surfaces with a
 * locale prop — labels switch, the underlying math doesn't.
 *
 * Stays a 'use client' island because the value of this tool is instant
 * feedback as the user drags the sliders. Server-rendered would force a
 * round-trip per change and feel broken.
 */

const KRW_FMT = new Intl.NumberFormat("ko-KR");
const USD_FMT = new Intl.NumberFormat("en-US");

const PATH_TONE: Record<RecommendedPath, string> = {
  license_daily: "bg-amber-500/10 border-amber-500/30 text-amber-200",
  paired_editorial: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
  season_anchor: "bg-violet-500/10 border-violet-500/30 text-violet-200",
  custom_build: "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-200",
  traditional_competitive:
    "bg-zinc-500/10 border-zinc-700 text-zinc-300",
};

interface PricingCalculatorProps {
  locale: "ko" | "en";
}

export function PricingCalculator({ locale }: PricingCalculatorProps) {
  const [assetCount, setAssetCount] = useState(40);
  const [seasonWeeks, setSeasonWeeks] = useState(12);
  const [marketCount, setMarketCount] = useState(1);
  const [needsExclusive, setNeedsExclusive] = useState(false);

  const input: CalculatorInput = useMemo(
    () => ({ assetCount, seasonWeeks, marketCount, needsExclusive }),
    [assetCount, seasonWeeks, marketCount, needsExclusive]
  );
  const output = useMemo(() => estimate(input), [input]);
  const rfpHref = useMemo(
    () => rfpHrefFromInputs(input, output, locale),
    [input, output, locale]
  );

  const t = locale === "en" ? STRINGS_EN : STRINGS_KO;
  const savingsPct = useMemo(() => {
    if (
      output.traditionalKrwLow !== null &&
      output.traditionalKrwHigh !== null &&
      output.krwHigh > 0
    ) {
      const tradMid =
        (output.traditionalKrwLow + output.traditionalKrwHigh) / 2;
      const synMid = (output.krwLow + output.krwHigh) / 2;
      if (tradMid > synMid) {
        return Math.round(((tradMid - synMid) / tradMid) * 100);
      }
    }
    return null;
  }, [output]);

  // The license-daily vs paired break-even sits at ~14 hero assets with
  // format coverage. Surface this directly when the user is in the gray zone
  // (≤18 assets) so they see the reasoning before the recommended-path chip
  // changes mid-slide. Links to the worked-example post for the math.
  const showBreakEvenHint = assetCount <= 18;
  const breakEvenHref =
    locale === "en"
      ? "/en/blog/license-vs-brand-kit-break-even-worked-example"
      : "/blog/license-vs-brand-kit-break-even-worked-example-ko";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <Slider
              label={t.assetLabel}
              hint={t.assetHint}
              value={assetCount}
              min={5}
              max={200}
              step={1}
              onChange={setAssetCount}
              unit={t.assetUnit}
              breakEvenAt={14}
              breakEvenLabel={t.breakEvenTick}
            />
            {showBreakEvenHint && (
              <Link
                href={breakEvenHref}
                className="mt-2 block rounded-md border border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-400/45 hover:bg-amber-500/[0.08] transition-colors px-3 py-2 text-[11px] text-amber-200 leading-relaxed"
              >
                <span className="font-semibold">
                  {t.breakEvenHintTitle}
                </span>{" "}
                <span className="text-zinc-400">{t.breakEvenHintBody}</span>
              </Link>
            )}
          </div>
          <Slider
            label={t.weeksLabel}
            hint={t.weeksHint}
            value={seasonWeeks}
            min={1}
            max={52}
            step={1}
            onChange={setSeasonWeeks}
            unit={t.weeksUnit}
          />
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-2">
              {t.marketsLabel}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMarketCount(n)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    marketCount === n
                      ? "bg-white text-black border-white"
                      : "bg-transparent border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {n}{t.marketsUnit}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">{t.marketsHint}</p>
          </div>
          <div>
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={needsExclusive}
                onChange={(e) => setNeedsExclusive(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-transparent text-emerald-500 focus:ring-emerald-400/40"
              />
              <span className="text-sm font-medium text-zinc-200">
                {t.exclusiveLabel}
              </span>
            </label>
            <p className="mt-1 text-xs text-zinc-500 pl-7">{t.exclusiveHint}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div
            className={`rounded-xl border p-5 ${PATH_TONE[output.recommendedPath]}`}
          >
            <p className="text-[11px] uppercase tracking-wider opacity-70">
              {t.recommendedLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {pathLabel(output.recommendedPath, locale)}
            </p>
            {output.anchorTier && (
              <p className="mt-1 text-xs opacity-80">
                {locale === "en"
                  ? output.anchorTier.nameEn
                  : output.anchorTier.nameKo}{" "}
                · {output.anchorTier.characters}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">
              {t.estimateLabel}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-50">
              {locale === "en"
                ? `$${USD_FMT.format(output.usdLow)}–${USD_FMT.format(output.usdHigh)}`
                : `₩${KRW_FMT.format(output.krwLow)}–${KRW_FMT.format(output.krwHigh)}`}
            </p>
            <p className="mt-1 text-xs text-zinc-500 tabular-nums">
              {locale === "en"
                ? `≈ ₩${KRW_FMT.format(output.krwLow)}–${KRW_FMT.format(output.krwHigh)} (KRW)`
                : `≈ $${USD_FMT.format(output.usdLow)}–${USD_FMT.format(output.usdHigh)} (USD)`}
            </p>
            {output.traditionalKrwLow !== null &&
              output.traditionalKrwHigh !== null && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                    {t.traditionalLabel}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-zinc-400">
                    ₩{KRW_FMT.format(output.traditionalKrwLow)}–
                    {KRW_FMT.format(output.traditionalKrwHigh)}
                  </p>
                  {savingsPct !== null && savingsPct > 5 && (
                    <p className="mt-1 text-xs text-emerald-300">
                      {savingsPct}% {t.savingsSuffix}
                    </p>
                  )}
                </div>
              )}
          </div>

          <Link
            href={rfpHref}
            className="block rounded-lg bg-white text-black text-center py-3 font-semibold hover:bg-zinc-100 transition-colors"
          >
            {t.cta} →
          </Link>
          <p className="text-[11px] text-zinc-600 text-center">{t.ctaHint}</p>
        </div>
      </div>

      {(output.rationale.length > 0 || output.caveats.length > 0) && (
        <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          {output.rationale.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                {t.rationaleLabel}
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-400 leading-relaxed">
                {output.rationale.map((line, i) => (
                  <li key={i} className="pl-3 relative">
                    <span className="absolute left-0 top-0 text-emerald-500/70">
                      ›
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {output.caveats.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                {t.caveatsLabel}
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-400 leading-relaxed">
                {output.caveats.map((line, i) => (
                  <li key={i} className="pl-3 relative">
                    <span className="absolute left-0 top-0 text-amber-500/70">
                      !
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  breakEvenAt,
  breakEvenLabel,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  unit: string;
  /** Optional marker — renders a small tick + label at this value (e.g. 14 = break-even on the asset slider). */
  breakEvenAt?: number;
  breakEvenLabel?: string;
}) {
  const tickPct =
    breakEvenAt !== undefined && breakEvenAt >= min && breakEvenAt <= max
      ? ((breakEvenAt - min) / (max - min)) * 100
      : null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-zinc-200">{label}</label>
        <span className="text-lg font-bold tabular-nums text-zinc-50">
          {value}
          <span className="text-xs text-zinc-500 ml-1">{unit}</span>
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        {tickPct !== null && (
          <div
            className="pointer-events-none absolute -bottom-1 h-2 w-px bg-amber-400/60"
            style={{ left: `calc(${tickPct}% )` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="text-xs text-zinc-500">{hint}</p>
        {tickPct !== null && breakEvenLabel && (
          <p
            className="text-[10px] uppercase tracking-wider text-amber-400/80 tabular-nums shrink-0"
            title={breakEvenLabel}
          >
            ↑ {breakEvenAt} · {breakEvenLabel}
          </p>
        )}
      </div>
    </div>
  );
}

const STRINGS_KO = {
  assetLabel: "어셋 수 (총 납품물)",
  assetHint: "헤로 컷 + 서포팅 + 영상 프레임 + 포맷 변형 합산. 단일 SKU 드롭 ~5, 분기 런칭 40-80.",
  assetUnit: "건",
  weeksLabel: "시즌 길이",
  weeksHint: "이 룩이 시장에 살아 있어야 할 기간. 4주 = 소셜 burst, 8-12주 = 분기 런칭, 12주+ = 시즌 앵커.",
  weeksUnit: "주",
  marketsLabel: "시장 수",
  marketsHint: "KR/US/EU/SG 등 별도 디스클로저 + 로컬라이제이션 필요한 시장.",
  marketsUnit: "개",
  exclusiveLabel: "카테고리 독점 필요",
  exclusiveHint: "같은 노출 윈도우에서 카테고리 경쟁사 노출 방지. 런칭·앰배서더 포지셔닝·규제 카테고리에서 필수.",
  recommendedLabel: "권장 path",
  estimateLabel: "예상 견적 (어셋 + 라이선스)",
  traditionalLabel: "전통 촬영 대조군",
  savingsSuffix: "절감",
  cta: "이 예산으로 RFP 보내기",
  ctaHint: "polished RFP 폼으로 이동. 입력값이 자동 prefill 됩니다.",
  rationaleLabel: "산정 근거",
  caveatsLabel: "주의 / 미포함 항목",
  breakEvenTick: "손익분기",
  breakEvenHintTitle: "↑ 약 14 컷부터 paired 가 license 보다 저렴 —",
  breakEvenHintBody:
    "어셋 수가 적은 구간에서는 일별 라이선스가 paired 보다 싸 보입니다. 포맷 커버리지 포함 약 14 컷 손익분기 후엔 paired 가 우위. 워크 예시 →",
};

const STRINGS_EN = {
  assetLabel: "Asset count (total deliverables)",
  assetHint: "Hero + supporting + video frames + format variants summed. Single-SKU drop ~5, quarterly launch 40-80.",
  assetUnit: "assets",
  weeksLabel: "Season length",
  weeksHint: "How long the look must be live. 4 weeks = social burst, 8-12 weeks = quarterly launch, 12+ weeks = season anchor.",
  weeksUnit: "weeks",
  marketsLabel: "Market count",
  marketsHint: "Markets needing separate disclosure + localization (KR/US/EU/SG, etc.).",
  marketsUnit: " market(s)",
  exclusiveLabel: "Category exclusivity required",
  exclusiveHint: "Block competitor exposure in the same window. Necessary for launches, ambassador positioning, regulated categories.",
  recommendedLabel: "Recommended path",
  estimateLabel: "Estimate (assets + license)",
  traditionalLabel: "Traditional shoot benchmark",
  savingsSuffix: "savings",
  cta: "Send this brief as an RFP",
  ctaHint: "Continues to a polished RFP form. Inputs prefill automatically.",
  rationaleLabel: "Cost rationale",
  caveatsLabel: "Caveats / not included",
  breakEvenTick: "Break-even",
  breakEvenHintTitle: "↑ Paired beats per-day license past ≈14 assets —",
  breakEvenHintBody:
    "At low asset counts, per-day license looks cheaper. Once you include format coverage past ≈14 hero frames, paired wins. See the worked example →",
};
