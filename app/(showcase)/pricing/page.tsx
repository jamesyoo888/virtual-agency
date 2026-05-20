import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { devModelStore } from "@/lib/dev-store";
import type { Model } from "@/types";
import { ArrowRight, Check } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "가격 — Virtual Agency",
  description:
    "프로젝트 단위 견적. 일수, 독점 여부, 매체 사용 범위에 따라 즉시 산출됩니다.",
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
    </div>
  );
}
