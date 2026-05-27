import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { PricingCalculator } from "@/components/pricing-calculator";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "캠페인 견적 계산기 — Virtual Agency",
  description:
    "K-aesthetic AI 캠페인의 4 입력 (어셋 수·시즌·시장·독점) 으로 즉시 견적과 권장 path. 전통 촬영 대조 포함.",
  alternates: {
    canonical: `${SITE_URL}/pricing-calculator`,
    languages: {
      ko: `${SITE_URL}/pricing-calculator`,
      en: `${SITE_URL}/en/pricing-calculator`,
    },
  },
  openGraph: {
    title: "캠페인 견적 계산기 — Virtual Agency",
    description: "K-aesthetic AI 캠페인 4 입력 즉시 견적.",
    url: `${SITE_URL}/pricing-calculator`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?pricing=1`],
  },
};

export default function PricingCalculatorKoPage() {
  return (
    <div className="min-h-screen text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          가격 페이지로
        </Link>
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs text-emerald-300 mb-3">
            <Calculator className="w-4 h-4" />
            견적 계산기
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            K-aesthetic AI 캠페인 견적
          </h1>
          <p className="mt-3 text-zinc-400 max-w-2xl leading-relaxed">
            4 입력 — 어셋 수, 시즌 길이, 시장 수, 독점 필요성 — 으로 즉시 권장
            path 와 KRW + USD 견적. 전통 촬영 대조군 포함. RFP 보내기 전에
            예산 상한 확인.
          </p>
        </header>

        <PricingCalculator locale="ko" />

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Card title="검산 방법" body="이 계산기는 우리가 deal sizing 에 내부적으로 쓰는 4 입력 프레임워크. 블로그의 «K-aesthetic AI 캠페인 ROI 계산기» 시리즈에 워크 예시 5개." />
          <Card title="신뢰 범위" body="실제 견적은 ±20% 정확. 캠페인 ⅔ 가 본 견적 범위 안에 안착. 스코프가 모호하면 RFP 폼에서 더 자세히 작성 가능." />
          <Card title="값에 빠진 것" body="미디어 예산, 법무 검토 (face-similarity audit · 멀티 마켓 디스클로저 검수) 는 별도. 통상 전체 캠페인 비용의 70-85% 가 미디어." />
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-400 leading-relaxed">
          <p className="font-medium text-zinc-200 mb-2">왜 가격표가 아닌 계산기?</p>
          <p>
            광고주가 «K-aesthetic AI 캠페인 비용은 얼마인가요» 라고 물으면 단일
            답은 없습니다 — 답은 4 입력에 따라 ₩5M ~ ₩240M 까지 흔들립니다.
            가격표는 평균을 보여주지만 어떤 광고주에게도 정확하지 않고, 단일
            견적은 양쪽 모두에 가격 기대치 불일치를 만듭니다. 계산기는 양쪽
            모두에 honest baseline 을 줍니다.{" "}
            <Link
              href="/blog/k-aesthetic-campaign-roi-calculator-ko"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              계산기 프레임워크 글
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/brand-kit-roi-worked-example-paired-vs-solo-ko"
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              워크 예시 (4-SKU 미국 런칭)
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
        {title}
      </p>
      <p className="text-zinc-300 leading-relaxed">{body}</p>
    </div>
  );
}
