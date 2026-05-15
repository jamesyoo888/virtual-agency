"use client";

import { useMemo, useState } from "react";
import { Calculator, ArrowRight } from "lucide-react";

interface Props {
  modelId: string;
  modelName: string;
  basePrice: number | null;
  exclusivePrice: number | null;
  exclusiveAvailable: boolean;
}

/**
 * Interactive day-rate calculator. base_price/exclusive_price are stored as
 * KRW per day on the model record. Multi-day projects get a small length
 * discount to make longer engagements more attractive (5d -5%, 10d -10%,
 * 30d+ -15%) — tweak these constants when ops nails down the pricing policy.
 */
const DURATION_DISCOUNTS: { minDays: number; discount: number; label: string }[] = [
  { minDays: 30, discount: 0.15, label: "30일+ 15% 할인" },
  { minDays: 10, discount: 0.1, label: "10일+ 10% 할인" },
  { minDays: 5, discount: 0.05, label: "5일+ 5% 할인" },
];

function discountFor(days: number): { rate: number; label: string | null } {
  for (const tier of DURATION_DISCOUNTS) {
    if (days >= tier.minDays) return { rate: tier.discount, label: tier.label };
  }
  return { rate: 0, label: null };
}

const KRW = new Intl.NumberFormat("ko-KR");

export default function PriceCalculator({
  modelId,
  modelName,
  basePrice,
  exclusivePrice,
  exclusiveAvailable,
}: Props) {
  const [days, setDays] = useState(3);
  const [exclusive, setExclusive] = useState(false);

  const dayRate = exclusive && exclusivePrice ? exclusivePrice : basePrice;

  const quote = useMemo(() => {
    if (!dayRate) return null;
    const subtotal = dayRate * days;
    const { rate: discountRate, label } = discountFor(days);
    const discount = Math.round(subtotal * discountRate);
    const total = subtotal - discount;
    return { subtotal, discount, discountLabel: label, total, dayRate };
  }, [dayRate, days]);

  if (!basePrice) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-400">
          이 모델의 가격은 문의를 통해 안내드립니다.
        </p>
      </div>
    );
  }

  function goToInquiry() {
    // Build an inquiry intent the InquiryForm can pre-fill from the URL.
    const params = new URLSearchParams({
      days: String(days),
      exclusive: exclusive ? "true" : "false",
      total: String(quote?.total ?? 0),
    });
    // Anchor to the inquiry section; InquiryForm reads window.location on mount.
    window.location.hash = `#inquire?${params.toString()}`;
    document.getElementById("inquire-anchor")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
          견적 계산
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-xs text-zinc-400">촬영 일수</label>
          <span className="text-lg font-semibold tabular-nums text-white">
            {days}일
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={60}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full accent-white"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>1일</span>
          <span>10일</span>
          <span>30일</span>
          <span>60일</span>
        </div>
      </div>

      {exclusivePrice && exclusiveAvailable && (
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-zinc-300">
            <span className="font-medium">독점 라이선스</span>
            <span className="block text-[10px] text-zinc-500 mt-0.5">
              해당 산업·기간 동안 경쟁사가 사용할 수 없음
            </span>
          </span>
          <button
            type="button"
            onClick={() => setExclusive((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
              exclusive ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                exclusive ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      )}

      {quote && (
        <div className="border-t border-zinc-800 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>일당 단가</span>
            <span className="tabular-nums">
              ₩{KRW.format(quote.dayRate)} × {days}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>소계</span>
            <span className="tabular-nums">₩{KRW.format(quote.subtotal)}</span>
          </div>
          {quote.discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-400">
              <span>{quote.discountLabel}</span>
              <span className="tabular-nums">-₩{KRW.format(quote.discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1.5 mt-1.5 border-t border-zinc-800">
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              예상 견적
            </span>
            <span className="text-xl font-bold tabular-nums text-white">
              ₩{KRW.format(quote.total)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            * 부가세 별도, 후반 작업·라이선스 범위에 따라 변동. 최종 견적은 문의 후 확정.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={goToInquiry}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white text-black hover:bg-zinc-200 text-sm font-medium py-2.5"
      >
        이 견적으로 문의
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <span className="sr-only">
        Modal id: {modelId} model: {modelName}
      </span>
    </div>
  );
}
