import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { BRAND_KIT_TIERS, formatKrw } from "@/lib/characters/brand-kits";

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata = {
  title: "가격 — Virtual Agency",
  description:
    "프로젝트 단위 견적. 일수, 독점 여부, 매체 사용 범위에 따라 즉시 산출됩니다.",
  openGraph: {
    title: "가격 — Virtual Agency",
    description: "투명한 가격대, 즉시 견적. 분기 단위 묶음 할인.",
    url: `${SITE_URL}/pricing`,
    type: "website" as const,
    images: [`${SITE_URL}/api/og?pricing=1`],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "가격 — Virtual Agency",
    description: "투명한 가격대, 즉시 견적.",
    images: [`${SITE_URL}/api/og?pricing=1`],
  },
};

interface PriceStats {
  baseLow: number | null;
  baseHigh: number | null;
  baseMedian: number | null;
  exclusiveLow: number | null;
  exclusiveHigh: number | null;
  activeCount: number;
}

async function loadPriceStats(): Promise<PriceStats> {
  const empty: PriceStats = {
    baseLow: null, baseHigh: null, baseMedian: null,
    exclusiveLow: null, exclusiveHigh: null, activeCount: 0,
  };

  const models: Pick<Model, "base_price" | "exclusive_price" | "status">[] =
    SUPABASE_CONFIGURED
      ? await (async () => {
          try {
            const supabase = await createClient();
            const { data } = await supabase
              .from("models")
              .select("base_price, exclusive_price, status")
              .eq("status", "active")
              .limit(1000);
            return (data ?? []) as Pick<Model, "base_price" | "exclusive_price" | "status">[];
          } catch {
            return [];
          }
        })()
      : (devModelStore.list().filter((m) => m.status === "active") as Pick<Model, "base_price" | "exclusive_price" | "status">[]);

  const bases = models.map((m) => m.base_price).filter((n): n is number => typeof n === "number" && n > 0).sort((a, b) => a - b);
  const exclusives = models.map((m) => m.exclusive_price).filter((n): n is number => typeof n === "number" && n > 0).sort((a, b) => a - b);

  if (bases.length === 0 && exclusives.length === 0 && models.length === 0) {
    return empty;
  }

  return {
    baseLow: bases[0] ?? null,
    baseHigh: bases[bases.length - 1] ?? null,
    baseMedian: bases[Math.floor(bases.length / 2)] ?? null,
    exclusiveLow: exclusives[0] ?? null,
    exclusiveHigh: exclusives[exclusives.length - 1] ?? null,
    activeCount: models.length,
  };
}

const KRW = (n: number | null | undefined): string =>
  n == null ? "협의" : `₩${n.toLocaleString("ko-KR")}`;

export default async function PricingPage() {
  const stats = await loadPriceStats();

  const tiers = [
    {
      title: "기본 라이선스",
      price: stats.baseMedian
        ? `${KRW(stats.baseLow)} ~ ${KRW(stats.baseHigh)} / 일`
        : "일 견적",
      desc: "일 단위 사용권. SNS·디지털 광고·룩북 등 범용 채널에 적합합니다.",
      features: [
        "지정 일수 동안 콘텐츠 사용",
        "디지털 · SNS · 인쇄 매체 사용",
        "후속 재계약 시 동일 모델 우선",
        "5일/10일/30일 묶음 할인 (5/10/15%)",
      ],
      cta: { href: "/", label: "카탈로그 둘러보기" },
      highlight: false,
    },
    {
      title: "독점 캠페인",
      price:
        stats.exclusiveLow && stats.exclusiveHigh
          ? `${KRW(stats.exclusiveLow)} ~ ${KRW(stats.exclusiveHigh)} / 캠페인`
          : "협의",
      desc: "지정 기간 동안 해당 모델의 동종 광고 노출을 막아 브랜드 우위를 확보합니다.",
      features: [
        "동종 산업 동시 광고 금지",
        "TVCF · 옥외 · 글로벌 매체 사용",
        "모델 전속 일정 우선 배정",
        "캠페인 종료 후 결과 리뷰 미팅",
      ],
      cta: { href: "/rfp", label: "RFP 작성 →" },
      highlight: true,
    },
    {
      title: "맞춤형 협업",
      price: "프로젝트별 협의",
      desc: "신규 모델 컨셉 개발, 다국어 음성 더빙, 영상 시리즈 등 비표준 요청.",
      features: [
        "5단계 모델 위저드 (페르소나 → 최종 2D)",
        "립싱크 · 영상 (Kling/Minimax) 통합",
        "3D 모델 (Meshy) 옵션",
        "라이선스 계약서 별도 검토",
      ],
      cta: { href: "/rfp", label: "프로젝트 문의 →" },
      highlight: false,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-900 px-8 py-5 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-widest uppercase hover:text-zinc-300">
          Virtual Agency
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white">카탈로그</Link>
          <Link href="/rfp" className="hover:text-white">RFP</Link>
          <Link href="/faq" className="hover:text-white">FAQ</Link>
        </nav>
      </header>

      <section className="px-5 md:px-8 py-12 md:py-20 border-b border-zinc-900">
        <div className="max-w-3xl">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-4">
            Pricing
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            프로젝트 단위 견적, <br />
            <span className="text-zinc-400">투명한 가격대.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            일수, 독점 여부, 매체 사용 범위에 따라 자동 산출됩니다.
            아래는 활성 모델 기준 일반적인 가격 범위입니다.
          </p>
          <Link
            href="/pricing-calculator"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm font-medium hover:bg-emerald-500/20"
          >
            견적 계산기 — 4 입력으로 즉시 견적 →
          </Link>
        </div>
      </section>

      <section className="px-5 md:px-8 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <article
              key={tier.title}
              className={
                tier.highlight
                  ? "rounded-2xl border border-white bg-zinc-950 p-7 ring-1 ring-white/10"
                  : "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-7"
              }
            >
              <h2 className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">
                {tier.title}
              </h2>
              <p className="text-2xl font-bold mb-2">{tier.price}</p>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">{tier.desc}</p>
              <ul className="space-y-2.5 mb-7">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta.href}
                className={
                  tier.highlight
                    ? "inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200"
                    : "inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-md border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-900"
                }
              >
                {tier.cta.label}
                {!tier.cta.label.includes("→") && <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            </article>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-16 text-sm text-zinc-500 leading-relaxed space-y-3">
          <p>
            <span className="text-zinc-300 font-medium">VAT 별도</span> · 결제는 캠페인 시작 전 50% / 납품 후 50%
            (대형 캠페인은 협의).
          </p>
          <p>
            모델 카탈로그 페이지의 가격 계산기로 일수 · 독점 조합을 즉시 확인할 수 있습니다.
          </p>
          <p>
            맞춤형 모델 또는 외부 크리에이터의 모델 활용은
            <Link href="/rfp" className="text-zinc-300 hover:text-white underline underline-offset-2 mx-1">
              RFP
            </Link>
            로 제안해 주세요.
          </p>
        </div>
      </section>

      <section className="px-5 md:px-8 py-16 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-3">
            예시 견적
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            대표 캠페인 시나리오 3가지
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed max-w-2xl">
            모델 단가는 카탈로그 평균 기준입니다. 실제 견적은 모델 선택, 컨셉 변형 횟수, 매체에 따라 달라집니다 — 인콰이어리에서 즉시 산출됩니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {EXAMPLE_SCENARIOS.map((s) => (
              <article
                key={s.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  {s.useCase}
                </p>
                <h3 className="text-base font-semibold mt-1 mb-4">{s.label}</h3>
                <p className="text-2xl font-bold tabular-nums mb-1">
                  ₩{s.totalKrw.toLocaleString("ko-KR")}
                </p>
                <p className="text-[11px] text-zinc-500 mb-4">+VAT</p>
                <ul className="space-y-1.5 text-xs text-zinc-400">
                  {s.lineItems.map((li) => (
                    <li key={li.label} className="flex justify-between">
                      <span>{li.label}</span>
                      <span className="tabular-nums">
                        ₩{li.priceKrw.toLocaleString("ko-KR")}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
                  {s.note}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-16">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-violet-300 mb-3 inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            캐릭터 IP brand-kit
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            자체 캐릭터로 분기 단위 brand-kit
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed max-w-2xl">
            Yuna 와 Ren 페어 캐릭터로 분기 brand-kit 을 구성하면, 매 캠페인마다 새 모델을 골라야 하는 카탈로그식 워크플로 대신, 같은 얼굴 · 같은 styling DNA 로 시즌이 묶입니다. 3 티어로 진입 비용을 단계화했습니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {BRAND_KIT_TIERS.map((tier) => (
              <article
                key={tier.slug}
                className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 flex flex-col"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300">
                  {tier.characters}
                </p>
                <h3 className="text-base font-semibold mt-1 mb-3">
                  {tier.nameKo}
                </h3>
                <p className="text-2xl font-bold tabular-nums mb-1 text-violet-100">
                  {formatKrw(tier.krw, tier.startingAt)}
                </p>
                <p className="text-[11px] text-zinc-500 mb-4">/ 분기 · +VAT</p>
                <Link
                  href={`/character/brand-kits?utm_source=character&utm_campaign=brand_kit_${tier.slug}`}
                  className="mt-auto inline-flex items-center justify-center gap-1 text-xs rounded-md border border-violet-500/40 px-3 py-1.5 text-violet-200 hover:bg-violet-500/10"
                >
                  {tier.nameKo} 자세히 <ArrowRight className="w-3 h-3" />
                </Link>
              </article>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-3xl">
            카탈로그 라이선스(상단)는 모델 단위, brand-kit(하단)은 캐릭터 + 분기 묶음입니다. 캠페인이 시즌 단위로 반복되거나 같은 얼굴을 매번 쓰고 싶다면 brand-kit, 단발성 다양성이 필요하면 카탈로그가 맞습니다.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-zinc-500 mb-3">
            Comparison
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            전통 광고 에이전시 vs Virtual Agency
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed max-w-2xl">
            동일한 캠페인 산출물을 기준으로 비용·납기·통제권을 비교합니다. 실제 광고주 데이터로 추정한 일반적인 범위입니다.
          </p>

          <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 w-1/3">항목</th>
                  <th className="text-left px-5 py-3">전통 에이전시</th>
                  <th className="text-left px-5 py-3 text-zinc-200">Virtual Agency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {COMPARISON.map((r) => (
                  <tr key={r.label}>
                    <td className="px-5 py-3.5 font-medium text-zinc-300">
                      {r.label}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {r.traditional}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-100">{r.virtual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-xs text-zinc-600 leading-relaxed max-w-3xl">
            *전통 에이전시 수치는 식음료·뷰티·패션 카테고리의 일반적인 캠페인 견적 범위로, Virtual Agency 광고주가 직전 견적과 비교 제공한 데이터에 기반합니다. 캠페인 규모·매체에 따라 차이가 발생합니다.
          </p>

          <p className="mt-10 text-xs text-zinc-500 max-w-3xl">
            «독점», «브랜드 키트», «컨셉 시트», «컴플라이언스 메타데이터» 같은 용어가 처음이라면{" "}
            <Link
              href="/glossary"
              className="text-zinc-300 underline hover:text-white"
            >
              용어집
            </Link>
            에서 견적 검토 전에 14개 핵심 용어를 정리할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

interface ExampleScenario {
  label: string;
  useCase: string;
  lineItems: { label: string; priceKrw: number }[];
  totalKrw: number;
  note: string;
}

// Approximate KRW pricing used for the /pricing examples. These match the
// catalog median and the discount tiers (5d/10d/30d), so the totals stay
// honest if pricing shifts modestly. Replace numbers if catalog drifts > 15%.
const EXAMPLE_SCENARIOS: ExampleScenario[] = [
  {
    useCase: "SNS 단발 캠페인",
    label: "이미지 캠페인 (3일, 비독점)",
    lineItems: [
      { label: "모델 라이선스 3일", priceKrw: 1_350_000 },
      { label: "컨셉 변형 (×3컷)", priceKrw: 450_000 },
      { label: "후반작업 (보정·리사이즈)", priceKrw: 200_000 },
    ],
    totalKrw: 2_000_000,
    note: "SNS 피드용 1차 캠페인. 4컷 이상이면 5일 할인 적용으로 단가가 추가로 떨어집니다.",
  },
  {
    useCase: "분기 단위 룩북",
    label: "시즌 룩북 (10일, 비독점, 영상 포함)",
    lineItems: [
      { label: "모델 라이선스 10일 (10% 할인 적용)", priceKrw: 4_050_000 },
      { label: "이미지 컨셉 8컷", priceKrw: 1_200_000 },
      { label: "영상 5초 × 2개", priceKrw: 1_400_000 },
      { label: "후반작업 + 출력 리사이즈", priceKrw: 850_000 },
    ],
    totalKrw: 7_500_000,
    note: "이커머스·카탈로그·SNS 풀세트. 같은 모델로 분기 4번 반복 시 추가 5% 묶음 할인.",
  },
  {
    useCase: "런칭 캠페인",
    label: "독점 캠페인 (4주, 단일 산업)",
    lineItems: [
      { label: "독점 라이선스 30일 (15% 할인)", priceKrw: 18_000_000 },
      { label: "히어로 컷 + 라인업 12컷", priceKrw: 3_200_000 },
      { label: "영상 15초 × 3개 (TVC 변형)", priceKrw: 4_500_000 },
      { label: "후반작업 · 매체별 출력", priceKrw: 1_800_000 },
    ],
    totalKrw: 27_500_000,
    note: "런칭 캠페인 표준. 매체 범위가 글로벌이면 별도 견적 (국내 한정 기본).",
  },
];

const COMPARISON: { label: string; traditional: string; virtual: string }[] = [
  {
    label: "1 캠페인 평균 비용",
    traditional: "₩1,200만 ~ 3,000만",
    virtual: "₩120만 ~ 600만 (5~20% 수준)",
  },
  {
    label: "최종 시안 회신",
    traditional: "10 ~ 21 일 (촬영·후반 포함)",
    virtual: "24 ~ 72 시간",
  },
  {
    label: "컨셉 변형 비용",
    traditional: "재촬영 비용 비대칭적으로 큼",
    virtual: "동일 모델 · 다른 컨셉 = 컴퓨트 비용만",
  },
  {
    label: "동일 모델 분기 재활용",
    traditional: "스케줄 조율 + 재계약",
    virtual: "동일 모델 락업 · 즉시 재투입",
  },
  {
    label: "초상권 분쟁 리스크",
    traditional: "계약별 별도 점검",
    virtual: "클리어런스 라이선스에 포함",
  },
  {
    label: "다국어 / 다지역 변형",
    traditional: "별도 촬영 · 모델 추가",
    virtual: "음성 더빙 + 텍스트 인서트만",
  },
  {
    label: "결제 구조",
    traditional: "기획료 + 모델료 + 제작비 분리",
    virtual: "프로젝트 단위 50/50 (시작/납품)",
  },
];
